/**
 * Compras con dinero real. SIEMPRE las acredita el servidor en la cuenta del jugador.
 *  - App iOS / Android: Google Play y App Store mediante RevenueCat. Después de comprar,
 *    el servidor consulta RevenueCat y entrega cada transacción una sola vez.
 *  - Web: Stripe Checkout; al volver, el servidor verifica el pago.
 *  - Sin pagos configurados: "modo prueba" (el servidor acredita sin cobrar, solo en desarrollo).
 */
import { formatUsd, item, productFor, storeProductId } from '@parques/engine';
import { Capacitor } from '@capacitor/core';
import { useProfile } from '../stores/profileStore';
import { useFx } from '../stores/fxStore';
import { tr } from './i18n';
import { getSession, serverUrl } from './online';

const isNative = () => Capacitor.isNativePlatform();

export function productLabel(productId: string): string {
  const p = productFor(productId);
  if (!p) return productId;
  if (p.kind === 'item' && p.itemId) return tr(item(p.itemId).name);
  return tr(p.name);
}

export function priceOf(productId: string): string {
  const p = productFor(productId);
  return p ? formatUsd(p.usdCents) : '';
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${serverUrl()}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  return (await res.json()) as T;
}

function done(productId: string) {
  useFx.getState().toast({ icon: '🎉', title: tr('¡Compra lista!'), sub: productLabel(productId) });
}

// ---------------------------------------------------------------- Tiendas de apps (RevenueCat)
let rcReady: Promise<boolean> | null = null;

async function revenueCat() {
  const mod = await import('@revenuecat/purchases-capacitor');
  if (!rcReady) {
    rcReady = (async () => {
      const key = Capacitor.getPlatform() === 'ios' ? import.meta.env.VITE_REVENUECAT_IOS_KEY : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
      const session = getSession();
      if (!key || !session) return false;
      await mod.Purchases.configure({ apiKey: String(key), appUserID: session.id });
      return true;
    })();
  }
  return (await rcReady) ? mod : null;
}

async function purchaseInStore(productId: string): Promise<boolean> {
  const fx = useFx.getState();
  const rc = await revenueCat();
  const session = getSession();
  if (!rc || !session) {
    fx.toast({ icon: '⚠️', title: tr('Las compras de la tienda no están configuradas') });
    return false;
  }
  try {
    const { products } = await rc.Purchases.getProducts({ productIdentifiers: [storeProductId(productId)], type: rc.PRODUCT_CATEGORY.NON_SUBSCRIPTION });
    const product = products[0];
    if (!product) {
      fx.toast({ icon: '⚠️', title: tr('Producto no disponible en la tienda') });
      return false;
    }
    await rc.Purchases.purchaseStoreProduct({ product });
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    fx.toast({ icon: '⚠️', title: tr('No se pudo completar la compra') });
    return false;
  }
  // El servidor confirma con RevenueCat y acredita en la cuenta.
  const r = await api<{ ok: boolean; granted?: string[]; error?: string; profile?: import('@parques/engine').Profile }>('/api/iap/verify', {
    method: 'POST',
    body: JSON.stringify(session),
  });
  if (r.profile) useProfile.getState().setFromServer(r.profile);
  if (r.ok && r.granted?.length) done(productId);
  else fx.toast({ icon: '⏳', title: tr('Compra recibida: se acreditará en unos segundos') });
  return r.ok;
}

// ---------------------------------------------------------------- Web (Stripe) y modo prueba
export async function purchase(productId: string): Promise<boolean> {
  const p = productFor(productId);
  if (!p) return false;
  if (isNative()) return purchaseInStore(productId);
  const fx = useFx.getState();
  const session = getSession();
  if (!session) {
    fx.toast({ icon: '⚠️', title: tr('Sin conexión') });
    return false;
  }
  let r: { mode: 'stripe' | 'demo'; url?: string; error?: string };
  try {
    r = await api('/api/checkout', { method: 'POST', body: JSON.stringify({ productId, playerId: session.id, returnUrl: location.origin + location.pathname }) });
  } catch {
    fx.toast({ icon: '⚠️', title: tr('No se pudo iniciar el pago') });
    return false;
  }
  if (r.mode === 'stripe') {
    if (r.url) {
      location.href = r.url;
      return true;
    }
    fx.toast({ icon: '⚠️', title: r.error ?? tr('No se pudo iniciar el pago') });
    return false;
  }
  const ok = await fx.confirm({
    icon: '🧪',
    title: tr('Compra de prueba'),
    text: tr('Los pagos todavía no están configurados: esta compra de {price} es de PRUEBA y no se cobra dinero real.', { price: formatUsd(p.usdCents) }),
    ok: tr('Comprar (prueba)'),
    cancel: tr('Cancelar'),
  });
  if (!ok) return false;
  const g = await api<{ ok: boolean; error?: string; profile?: import('@parques/engine').Profile }>('/api/demo/grant', { method: 'POST', body: JSON.stringify({ ...session, productId }) });
  if (g.profile) useProfile.getState().setFromServer(g.profile);
  if (g.ok) done(productId);
  else fx.toast({ icon: '⚠️', title: tr(g.error ?? 'No se pudo comprar') });
  return g.ok;
}

/** Al volver de Stripe (?purchase=success&session_id=…) el servidor verifica y acredita. */
export async function resumePurchase(): Promise<void> {
  const q = new URLSearchParams(location.search);
  const status = q.get('purchase');
  if (!status) return;
  const sessionId = q.get('session_id');
  q.delete('purchase');
  q.delete('session_id');
  history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}`);
  if (status !== 'success' || !sessionId) {
    useFx.getState().toast({ icon: '↩️', title: tr('Compra cancelada') });
    return;
  }
  try {
    const r = await api<{ ok: boolean; productId?: string; error?: string; profile?: import('@parques/engine').Profile }>(`/api/purchase/verify?session_id=${encodeURIComponent(sessionId)}`);
    if (r.profile) useProfile.getState().setFromServer(r.profile);
    if (r.ok && r.productId) done(r.productId);
    else useFx.getState().toast({ icon: '⚠️', title: tr(r.error ?? 'No se pudo confirmar el pago') });
  } catch {
    useFx.getState().toast({ icon: '⚠️', title: tr('No se pudo confirmar el pago') });
  }
}
