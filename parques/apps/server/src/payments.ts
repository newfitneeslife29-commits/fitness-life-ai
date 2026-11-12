/**
 * Pagos con dinero real vía Stripe Checkout (sin SDK: API REST con fetch).
 * - El PRECIO lo pone el servidor (catálogo compartido del motor), nunca el cliente.
 * - La compra solo se entrega cuando Stripe confirma `payment_status = paid`.
 * - Sin STRIPE_SECRET_KEY el servidor responde `mode: 'demo'` (compras de prueba sin cobro).
 */
import { ITEMS, productFor, storeProductId } from '@parques/engine';

export interface CheckoutResult {
  mode: 'stripe' | 'demo';
  url?: string;
  error?: string;
}

export interface VerifyResult {
  ok: boolean;
  productId?: string;
  grantId?: string;
  playerId?: string;
  error?: string;
}

const API = 'https://api.stripe.com/v1';

export class Payments {
  constructor(
    private secretKey = process.env.STRIPE_SECRET_KEY ?? '',
    private currency = (process.env.STRIPE_CURRENCY ?? 'usd').toLowerCase(),
    private fetchFn: typeof fetch = fetch,
  ) {}

  get enabled(): boolean {
    return this.secretKey.startsWith('sk_');
  }

  async checkout(productId: string, playerId: string, returnUrl: string): Promise<CheckoutResult> {
    const p = productFor(productId);
    if (!p) return { mode: this.enabled ? 'stripe' : 'demo', error: 'Producto desconocido' };
    if (!this.enabled) return { mode: 'demo' };
    let back: URL;
    try {
      back = new URL(returnUrl);
      if (!/^https?:$/.test(back.protocol)) throw new Error();
    } catch {
      return { mode: 'stripe', error: 'URL de regreso inválida' };
    }
    const base = `${back.origin}${back.pathname}`;
    const body = new URLSearchParams({
      mode: 'payment',
      success_url: `${base}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}?purchase=cancel`,
      client_reference_id: playerId,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': this.currency,
      'line_items[0][price_data][unit_amount]': String(p.usdCents),
      'line_items[0][price_data][product_data][name]': `Parqués · ${p.name}`,
      'metadata[productId]': p.id,
      'metadata[playerId]': playerId,
    });
    const res = await this.fetchFn(`${API}/checkout/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) return { mode: 'stripe', error: json.error?.message ?? 'No se pudo crear el pago' };
    return { mode: 'stripe', url: json.url };
  }

  async verify(sessionId: string): Promise<VerifyResult> {
    if (!this.enabled) return { ok: false, error: 'Pagos no configurados' };
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { ok: false, error: 'Sesión inválida' };
    const res = await this.fetchFn(`${API}/checkout/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${this.secretKey}` } });
    const s = (await res.json()) as { payment_status?: string; metadata?: Record<string, string>; id?: string };
    if (!res.ok || s.payment_status !== 'paid') return { ok: false, error: 'El pago no está confirmado' };
    const productId = s.metadata?.productId;
    if (!productId || !productFor(productId)) return { ok: false, error: 'Producto desconocido' };
    return { ok: true, productId, grantId: s.id ?? sessionId, playerId: s.metadata?.playerId };
  }
}

/**
 * Compras dentro de las apps (Google Play y App Store) verificadas con RevenueCat.
 * La app compra con el SDK de RevenueCat usando como "app user id" el id de la cuenta;
 * el servidor consulta la API de RevenueCat y entrega cada transacción una sola vez.
 * Variable: REVENUECAT_SECRET_KEY (llave secreta "sk_…" del proyecto en RevenueCat).
 */
export interface StoreTransaction {
  grantId: string;
  productId: string;
  store: string;
}

export class StorePurchases {
  constructor(
    private secretKey = process.env.REVENUECAT_SECRET_KEY ?? '',
    private fetchFn: typeof fetch = fetch,
  ) {}

  get enabled(): boolean {
    return this.secretKey.length > 10;
  }

  /** Transacciones de compras únicas (consumibles y no consumibles) de ese usuario. */
  async transactions(appUserId: string): Promise<StoreTransaction[]> {
    if (!this.enabled) return [];
    const res = await this.fetchFn(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { subscriber?: { non_subscriptions?: Record<string, { id: string; store?: string }[]> } };
    const out: StoreTransaction[] = [];
    for (const [storeId, txs] of Object.entries(json.subscriber?.non_subscriptions ?? {})) {
      const productId = fromStoreId(storeId);
      if (!productId) continue;
      for (const tx of txs) out.push({ grantId: `rc_${tx.id}`, productId, store: tx.store ?? 'store' });
    }
    return out;
  }
}

/** Convierte el id de la tienda (coins_s, item_board_oro) al id interno (coins-s, item:board-oro). */
export function fromStoreId(storeId: string): string | null {
  const candidates = [
    storeId.replace(/_/g, '-'),
    storeId.startsWith('item_') ? `item:${storeId.slice(5).replace(/_/g, '-')}` : '',
  ];
  const direct = candidates.find((c) => c && productFor(c) && storeProductId(c) === storeId);
  if (direct) return direct;
  // Ids con tilde (item:effect-pólvora): se busca entre los artículos que se venden con dinero real.
  const item = ITEMS.find((i) => i.currency === 'usd' && storeProductId(`item:${i.id}`) === storeId);
  return item ? `item:${item.id}` : null;
}
