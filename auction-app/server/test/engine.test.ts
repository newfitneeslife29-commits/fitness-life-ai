import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closeOutcome, placeMaxBid, type AuctionState } from '../src/engine.ts';
import { bidIncrement, computeOrder } from '../src/money.ts';

const HOUR = 3_600_000;
const SNIPE = 120_000;

function fresh(overrides: Partial<AuctionState> = {}): AuctionState {
  return { startingPrice: 5000, reservePrice: null, currentPrice: 5000, leaderId: null, endAt: 10 * HOUR, maxBids: [], ...overrides };
}

function bid(state: AuctionState, who: string, amount: number, now = 1000) {
  const r = placeMaxBid(state, who, amount, now, SNIPE);
  assert.ok(r.ok, `bid by ${who} of ${amount} should be accepted`);
  return r;
}

test('increment table follows the guide', () => {
  assert.equal(bidIncrement(50), 5);
  assert.equal(bidIncrement(2500), 100);
  assert.equal(bidIncrement(7000), 100);
  assert.equal(bidIncrement(10_000), 250);
  assert.equal(bidIncrement(1_000_000), 10_000);
});

test('guide example: Ana 100 €, Luis 70 € then 120 €', () => {
  let r = bid(fresh(), 'ana', 10_000);
  assert.equal(r.state.currentPrice, 5000);
  assert.equal(r.state.leaderId, 'ana');

  r = bid(r.state, 'luis', 7000, 2000);
  assert.equal(r.state.leaderId, 'ana');
  assert.equal(r.state.currentPrice, 7100);
  assert.equal(r.winning, false);
  assert.deepEqual(r.bids.map((b) => [b.bidderId, b.amount, b.isProxy]), [['luis', 7000, false], ['ana', 7100, true]]);

  r = bid(r.state, 'luis', 12_000, 3000);
  assert.equal(r.state.leaderId, 'luis');
  assert.equal(r.state.currentPrice, 10_250);
  assert.equal(r.outbidUserId, 'ana');
});

test('rejects bids below the minimum and leader lowering their max', () => {
  const s = bid(fresh(), 'ana', 6000).state;
  const low = placeMaxBid(s, 'luis', 5050, 2000, SNIPE);
  assert.equal(low.ok, false);
  if (!low.ok) assert.equal(low.minNextBid, 5100);
  const same = placeMaxBid(s, 'ana', 6000, 2000, SNIPE);
  assert.equal(same.ok, false);
});

test('ties go to the earliest bidder', () => {
  let s = bid(fresh(), 'ana', 8000, 1000).state;
  const r = bid(s, 'luis', 8000, 2000);
  assert.equal(r.state.leaderId, 'ana');
  assert.equal(r.state.currentPrice, 8000);
});

test('leader raising their max does not move the price', () => {
  let r = bid(fresh(), 'ana', 6000);
  r = bid(r.state, 'luis', 7000, 2000);
  const price = r.state.currentPrice;
  r = bid(r.state, 'luis', 9000, 3000);
  assert.equal(r.state.currentPrice, price);
  assert.equal(r.bids.length, 0);
});

test('price jumps to the reserve when a max covers it', () => {
  const r = bid(fresh({ reservePrice: 20_000 }), 'ana', 25_000);
  assert.equal(r.state.currentPrice, 20_000);
  assert.equal(closeOutcome(r.state).status, 'sold');
  const under = bid(fresh({ reservePrice: 20_000 }), 'ana', 15_000);
  assert.equal(under.state.currentPrice, 5000);
  assert.equal(closeOutcome(under.state).status, 'reserve_not_met');
});

test('anti-sniping extends the close', () => {
  const s = fresh({ endAt: 100_000 });
  const r = bid(s, 'ana', 6000, 50_000);
  assert.equal(r.extended, true);
  assert.equal(r.state.endAt, 50_000 + SNIPE);
  const early = bid(fresh(), 'ana', 6000, 1000);
  assert.equal(early.extended, false);
});

test('no bids closes as no_bids', () => {
  assert.equal(closeOutcome(fresh()).status, 'no_bids');
});

test('invariants hold over random bid sequences', () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
  for (let run = 0; run < 300; run++) {
    let state = fresh({ reservePrice: rand() < 0.5 ? 9000 : null });
    for (let step = 0; step < 40; step++) {
      const who = `u${Math.floor(rand() * 5)}`;
      const amount = state.currentPrice + Math.floor(rand() * 3000) - 500;
      const before = state.currentPrice;
      const r = placeMaxBid(state, who, amount, step, SNIPE);
      if (!r.ok) continue;
      state = r.state;
      const ranked = [...state.maxBids].sort((a, b) => b.max - a.max || a.at - b.at);
      assert.ok(state.currentPrice >= before, 'price never goes down');
      assert.equal(state.leaderId, ranked[0]!.bidderId, 'leader holds the highest max');
      assert.ok(state.currentPrice <= ranked[0]!.max, 'price never exceeds the leader max');
      if (ranked[1]) assert.ok(state.currentPrice >= ranked[1].max, 'price covers the runner-up');
    }
  }
});

test('order breakdown balances', () => {
  const o = computeOrder(20_000, 850);
  assert.equal(o.buyerFee, 1000);
  assert.equal(o.tax, 210);
  assert.equal(o.total, 22_060);
  assert.equal(o.sellerFee, 1600);
  assert.equal(o.sellerPayout, 19_250);
});
