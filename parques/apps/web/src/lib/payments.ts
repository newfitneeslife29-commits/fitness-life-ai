/**
 * Compras con dinero real.
 *  - Con el servidor configurado con Stripe: se abre Stripe Checkout y, al volver,
 *    el servidor verifica el pago y se entrega lo comprado.
 *  - Sin Stripe (o sin servidor): "modo prueba", se avisa claramente que no se cobra.
 */
import { formatUsd, productFor } from '@parques/engine';
import { useProfile } from '../stores/profileStore';
import { useSettings } from '../stores/settingsStore';
import { useFx } from '../stores/fxStore';
import { tr } from './i18n';
import { item } from '../meta/catalog';

function apiBase(): string {
  const url = useSettings.getState().serverUrl.trim().replace(/\/$/, '');
  return url || '';
}

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

function grant(productId: string, grantId: string) {
  const r = useProfile.getState().grantPurchase(productId, grantId);
  if (r.ok) {
    useFx.getState().toast({ icon: '🎉', title: tr('¡Compra lista!'), sub: productLabel(productId) });
  }
  return r.ok;
}

export async function purchase(productId: string): Promise<boolean> {
  const p = productFor(productId);
  if (!p) return false;
  const fx = useFx.getState();
  let mode: 'stripe' | 'demo' = 'demo';
  try {
    const res = await fetch(`${apiBase()}/api/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId, playerId: useProfile.getState().id, returnUrl: location.origin + location.pathname }),
    });
    const r = (await res.json()) as { mode: 'stripe' | 'demo'; url?: string; error?: string };
    mode = r.mode;
    if (r.mode === 'stripe') {
      if (r.url) {
        location.href = r.url;
        return true;
      }
      fx.toast({ icon: '⚠️', title: r.error ?? tr('No se pudo iniciar el pago') });
      return false;
    }
  } catch {
    mode = 'demo';
  }
  if (mode === 'demo') {
    const ok = await fx.confirm({
      icon: '🧪',
      title: tr('Compra de prueba'),
      text: tr('Los pagos todavía no están configurados: esta compra de {price} es de PRUEBA y no se cobra dinero real.', { price: formatUsd(p.usdCents) }),
      ok: tr('Comprar (prueba)'),
      cancel: tr('Cancelar'),
    });
    if (!ok) return false;
    return grant(productId, `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }
  return false;
}

/** Al volver de Stripe (?purchase=success&session_id=…) se verifica y se entrega. */
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
    const res = await fetch(`${apiBase()}/api/purchase/verify?session_id=${encodeURIComponent(sessionId)}`);
    const r = (await res.json()) as { ok: boolean; productId?: string; grantId?: string; error?: string };
    if (r.ok && r.productId && r.grantId) grant(r.productId, r.grantId);
    else useFx.getState().toast({ icon: '⚠️', title: r.error ?? tr('No se pudo confirmar el pago') });
  } catch {
    useFx.getState().toast({ icon: '⚠️', title: tr('No se pudo confirmar el pago') });
  }
}
