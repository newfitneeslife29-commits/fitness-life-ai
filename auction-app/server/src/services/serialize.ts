import type { Row } from '../db.ts';
import { minNextBid } from '../engine.ts';

/** "carlos" -> "c***s". Bid history never reveals who is bidding. */
export function maskName(name: string): string {
  const clean = name.trim();
  if (clean.length <= 2) return `${clean[0] ?? '*'}***`;
  return `${clean[0]}***${clean[clean.length - 1]}`;
}

export function publicUser(row: Row) {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    city: (row.city as string | null) ?? null,
    rating: row.rating_count > 0 ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : null,
    ratingCount: row.rating_count as number,
    salesCount: row.sales_count as number,
    purchasesCount: row.purchases_count as number,
    memberSince: row.created_at as number,
  };
}

/**
 * "Buy it now" disappears with the first bid, or once bids reach the reserve
 * when there is one (guide §7.7).
 */
export function buyNowAvailable(row: Row): boolean {
  if (row.buy_now_price === null || row.status !== 'active') return false;
  if (row.bid_count === 0) return true;
  return row.reserve_price !== null && row.current_price < row.reserve_price && row.current_price < row.buy_now_price;
}

/** Card-sized summary used in lists. Never includes the reserve price. */
export function auctionSummary(row: Row) {
  const images = JSON.parse(row.images) as string[];
  return {
    id: row.id as string,
    title: row.title as string,
    image: images[0] ?? null,
    categoryId: row.category_id as string,
    condition: row.condition as string,
    location: (row.location as string | null) ?? null,
    currency: row.currency as string,
    currentPrice: row.current_price as number,
    startingPrice: row.starting_price as number,
    buyNowPrice: (row.buy_now_price as number | null) ?? null,
    buyNowAvailable: buyNowAvailable(row),
    shippingCost: row.shipping_cost as number,
    bidCount: row.bid_count as number,
    watchCount: row.watch_count as number,
    hasReserve: row.reserve_price !== null,
    reserveMet: row.reserve_price === null ? null : row.leader_id !== null && row.current_price >= row.reserve_price,
    startAt: row.start_at as number,
    endAt: row.end_at as number,
    status: row.status as string,
    sellerId: row.seller_id as string,
  };
}

export function auctionDetail(row: Row) {
  return {
    ...auctionSummary(row),
    description: row.description as string,
    images: JSON.parse(row.images) as string[],
    viewCount: row.view_count as number,
    seq: row.seq as number,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    minNextBid: minNextBid({
      currentPrice: row.current_price,
      leaderId: row.leader_id,
      startingPrice: row.starting_price,
    }),
  };
}

/** Payload broadcast on `auction:update`. */
export function auctionLive(row: Row) {
  return {
    auctionId: row.id as string,
    currentPrice: row.current_price as number,
    bidCount: row.bid_count as number,
    endAt: row.end_at as number,
    status: row.status as string,
    buyNowAvailable: buyNowAvailable(row),
    reserveMet: row.reserve_price === null ? null : row.leader_id !== null && row.current_price >= row.reserve_price,
    minNextBid: minNextBid({ currentPrice: row.current_price, leaderId: row.leader_id, startingPrice: row.starting_price }),
    seq: row.seq as number,
  };
}

export function orderView(row: Row) {
  return {
    id: row.id as string,
    auctionId: row.auction_id as string,
    buyerId: row.buyer_id as string,
    sellerId: row.seller_id as string,
    currency: row.currency as string,
    hammerPrice: row.hammer_price as number,
    buyerFee: row.buyer_fee as number,
    tax: row.tax as number,
    shippingCost: row.shipping_cost as number,
    total: row.total as number,
    sellerFee: row.seller_fee as number,
    sellerPayout: row.seller_payout as number,
    status: row.status as string,
    paymentDueAt: row.payment_due_at as number,
    cardLast4: (row.card_last4 as string | null) ?? null,
    carrier: (row.carrier as string | null) ?? null,
    trackingNumber: (row.tracking_number as string | null) ?? null,
    shippingAddress: (row.shipping_address as string | null) ?? null,
    disputeReason: (row.dispute_reason as string | null) ?? null,
    paidAt: (row.paid_at as number | null) ?? null,
    shippedAt: (row.shipped_at as number | null) ?? null,
    completedAt: (row.completed_at as number | null) ?? null,
    createdAt: row.created_at as number,
  };
}
