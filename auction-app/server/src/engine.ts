import { bidIncrement } from './money.ts';

// Pure English-auction engine with proxy bidding, reserve price and anti-sniping.
// It has no I/O so it can be unit-tested exhaustively; services/auctions.ts
// loads the state, calls placeMaxBid inside a DB transaction and persists the result.

export interface MaxBid {
  bidderId: string;
  max: number;
  /** When this max was set; earlier wins ties. */
  at: number;
}

export interface AuctionState {
  startingPrice: number;
  reservePrice: number | null;
  currentPrice: number;
  leaderId: string | null;
  endAt: number;
  maxBids: MaxBid[];
}

export interface VisibleBid {
  bidderId: string;
  amount: number;
  isProxy: boolean;
}

export type BidError = 'BID_TOO_LOW' | 'MAX_NOT_HIGHER';

export type BidResult =
  | { ok: false; error: BidError; minNextBid: number }
  | {
      ok: true;
      state: AuctionState;
      /** Bids to record in the public history, in order. */
      bids: VisibleBid[];
      /** Previous leader who lost the lead, if any. */
      outbidUserId: string | null;
      /** True when the bidder is leading after this bid. */
      winning: boolean;
      extended: boolean;
    };

/** Minimum amount a new (non-leading) bidder must offer. */
export function minNextBid(state: Pick<AuctionState, 'currentPrice' | 'leaderId' | 'startingPrice'>): number {
  if (!state.leaderId) return state.startingPrice;
  return state.currentPrice + bidIncrement(state.currentPrice);
}

function rank(maxBids: MaxBid[]): MaxBid[] {
  return [...maxBids].sort((a, b) => b.max - a.max || a.at - b.at);
}

/** Visible price given the ranked max bids. */
export function priceFor(ranked: MaxBid[], startingPrice: number, reservePrice: number | null): number {
  const [top, second] = ranked;
  if (!top) return startingPrice;
  let price = second ? Math.min(top.max, second.max + bidIncrement(second.max)) : startingPrice;
  price = Math.max(price, startingPrice);
  // When the leader's max covers the reserve, the price jumps straight to it.
  if (reservePrice !== null && top.max >= reservePrice && price < reservePrice) price = reservePrice;
  return Math.min(price, top.max);
}

export function placeMaxBid(
  state: AuctionState,
  bidderId: string,
  amount: number,
  now: number,
  antiSnipingMs: number,
): BidResult {
  const isLeader = state.leaderId === bidderId;
  const existing = state.maxBids.find((b) => b.bidderId === bidderId);

  if (isLeader) {
    if (!existing || amount <= existing.max) {
      return { ok: false, error: 'MAX_NOT_HIGHER', minNextBid: (existing?.max ?? state.currentPrice) + 1 };
    }
  } else {
    const min = minNextBid(state);
    if (amount < min) return { ok: false, error: 'BID_TOO_LOW', minNextBid: min };
  }

  const maxBids = state.maxBids.filter((b) => b.bidderId !== bidderId);
  maxBids.push({ bidderId, max: amount, at: now });
  const ranked = rank(maxBids);
  const leader = ranked[0]!;
  const price = Math.max(priceFor(ranked, state.startingPrice, state.reservePrice), state.currentPrice);

  const bids: VisibleBid[] = [];
  if (leader.bidderId === bidderId) {
    if (price !== state.currentPrice || !state.leaderId) bids.push({ bidderId, amount: price, isProxy: false });
  } else {
    // The newcomer was outbid instantly by an existing proxy.
    bids.push({ bidderId, amount, isProxy: false });
    bids.push({ bidderId: leader.bidderId, amount: price, isProxy: true });
  }

  let endAt = state.endAt;
  let extended = false;
  if (bids.length > 0 && endAt - now < antiSnipingMs) {
    endAt = now + antiSnipingMs;
    extended = true;
  }

  const outbidUserId = state.leaderId && state.leaderId !== leader.bidderId ? state.leaderId : null;

  return {
    ok: true,
    state: { ...state, maxBids, currentPrice: price, leaderId: leader.bidderId, endAt },
    bids,
    outbidUserId,
    winning: leader.bidderId === bidderId,
    extended,
  };
}

export type CloseOutcome =
  | { status: 'sold'; winnerId: string; price: number }
  | { status: 'no_bids' }
  | { status: 'reserve_not_met' };

export function closeOutcome(state: AuctionState): CloseOutcome {
  if (!state.leaderId) return { status: 'no_bids' };
  if (state.reservePrice !== null && state.currentPrice < state.reservePrice) return { status: 'reserve_not_met' };
  return { status: 'sold', winnerId: state.leaderId, price: state.currentPrice };
}
