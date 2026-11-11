import { describe, expect, it, vi } from 'vitest';
import { Payments } from '../src/payments';

function fakeFetch(response: unknown, ok = true) {
  return vi.fn(async (_url: string, _init?: RequestInit) => ({ ok, json: async () => response })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe('pagos', () => {
  it('sin llave de Stripe funciona en modo prueba', async () => {
    const p = new Payments('');
    expect(p.enabled).toBe(false);
    expect(await p.checkout('coins-s', 'AAAA', 'http://localhost:5173/')).toEqual({ mode: 'demo' });
  });

  it('crea la sesión de pago con el precio del servidor (no del cliente)', async () => {
    const f = fakeFetch({ url: 'https://checkout.stripe.com/c/pay/abc' });
    const p = new Payments('sk_test_123', 'usd', f);
    const r = await p.checkout('item:board-oro', 'AAAA', 'http://localhost:5173/');
    expect(r).toEqual({ mode: 'stripe', url: 'https://checkout.stripe.com/c/pay/abc' });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    const body = new URLSearchParams(String(init!.body));
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('999');
    expect(body.get('metadata[productId]')).toBe('item:board-oro');
    expect(body.get('success_url')).toContain('session_id={CHECKOUT_SESSION_ID}');
  });

  it('rechaza productos desconocidos y URLs raras', async () => {
    const p = new Payments('sk_test_123', 'usd', fakeFetch({}));
    expect((await p.checkout('gratis-todo', 'AAAA', 'http://x/')).error).toBeTruthy();
    expect((await p.checkout('coins-s', 'AAAA', 'javascript:alert(1)')).error).toBeTruthy();
  });

  it('solo entrega la compra si Stripe confirma el pago', async () => {
    const paid = new Payments('sk_test_123', 'usd', fakeFetch({ id: 'cs_test_1', payment_status: 'paid', metadata: { productId: 'gems-m', playerId: 'AAAA' } }));
    expect(await paid.verify('cs_test_1')).toEqual({ ok: true, productId: 'gems-m', grantId: 'cs_test_1', playerId: 'AAAA' });
    const unpaid = new Payments('sk_test_123', 'usd', fakeFetch({ id: 'cs_test_2', payment_status: 'unpaid', metadata: { productId: 'gems-m' } }));
    expect((await unpaid.verify('cs_test_2')).ok).toBe(false);
    expect((await paid.verify('../hack')).ok).toBe(false);
  });
});
