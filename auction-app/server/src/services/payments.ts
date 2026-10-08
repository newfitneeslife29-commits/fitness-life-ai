import { randomUUID } from 'node:crypto';

// Payment provider abstraction (guide §9). The default implementation is a
// sandbox that behaves like a card processor so the whole flow works without
// keys. To go live, implement this interface with Stripe Connect / Adyen /
// Mangopay (PaymentIntent + 3-D Secure, then confirm via webhook).

export interface ChargeRequest {
  orderId: string;
  amount: number;
  currency: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export type ChargeResult =
  | { ok: true; reference: string; last4: string }
  | { ok: false; code: 'CARD_DECLINED' | 'INVALID_CARD'; message: string };

export interface PaymentProvider {
  charge(req: ChargeRequest): Promise<ChargeResult>;
  payout(sellerId: string, amount: number, currency: string): Promise<{ reference: string }>;
  refund(reference: string, amount: number): Promise<{ reference: string }>;
}

function luhnValid(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const sandboxProvider: PaymentProvider = {
  async charge(req) {
    const digits = req.cardNumber.replace(/\D/g, '');
    const [mm, yy] = req.expiry.split('/').map((p) => Number(p.trim()));
    const expiryOk = mm >= 1 && mm <= 12 && yy !== undefined && new Date(2000 + yy, mm, 1).getTime() > Date.now();
    if (digits.length < 13 || digits.length > 19 || !luhnValid(digits) || !expiryOk || !/^\d{3,4}$/.test(req.cvc)) {
      return { ok: false, code: 'INVALID_CARD', message: 'Revisa los datos de la tarjeta' };
    }
    // Same test number as Stripe for a generic decline.
    if (digits === '4000000000000002') {
      return { ok: false, code: 'CARD_DECLINED', message: 'Tu banco ha rechazado el pago' };
    }
    return { ok: true, reference: `sbx_ch_${randomUUID()}`, last4: digits.slice(-4) };
  },
  async payout() {
    return { reference: `sbx_po_${randomUUID()}` };
  },
  async refund() {
    return { reference: `sbx_re_${randomUUID()}` };
  },
};

let provider: PaymentProvider = sandboxProvider;
export const payments = () => provider;
export const setPaymentProvider = (p: PaymentProvider) => {
  provider = p;
};
