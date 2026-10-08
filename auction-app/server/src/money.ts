import { config } from './config.ts';

// All amounts are integers in cents. Never use floats for money.

/** [upper bound exclusive, increment] — see section 7.2 of the guide. */
const INCREMENTS: Array<[number, number]> = [
  [100, 5],
  [500, 25],
  [2_500, 50],
  [10_000, 100],
  [25_000, 250],
  [50_000, 500],
  [100_000, 1_000],
  [250_000, 2_500],
  [500_000, 5_000],
];

export function bidIncrement(price: number): number {
  for (const [limit, increment] of INCREMENTS) {
    if (price < limit) return increment;
  }
  return 10_000;
}

const bps = (amount: number, basisPoints: number) => Math.round((amount * basisPoints) / 10_000);

export interface OrderBreakdown {
  hammerPrice: number;
  buyerFee: number;
  tax: number;
  shippingCost: number;
  total: number;
  sellerFee: number;
  sellerPayout: number;
}

export function computeOrder(hammerPrice: number, shippingCost: number): OrderBreakdown {
  const buyerFee = bps(hammerPrice, config.fees.buyerPremiumBps);
  const tax = bps(buyerFee, config.fees.vatBps);
  const sellerFee = bps(hammerPrice, config.fees.sellerFeeBps);
  return {
    hammerPrice,
    buyerFee,
    tax,
    shippingCost,
    total: hammerPrice + buyerFee + tax + shippingCost,
    sellerFee,
    sellerPayout: hammerPrice - sellerFee + shippingCost,
  };
}
