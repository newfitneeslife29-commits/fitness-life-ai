import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// End-to-end: publish → bid → close → pay → ship → confirm → review, over HTTP.

const tmp = mkdtempSync(join(tmpdir(), 'subastia-test-'));
process.env.UPLOADS_DIR = tmp;

let server: Server;
let base = '';
let mod: {
  getDb: typeof import('../src/db.ts').getDb;
  tickAuctions: typeof import('../src/services/auctions.ts').tickAuctions;
};

before(async () => {
  const { Db, setDb, getDb } = await import('../src/db.ts');
  setDb(new Db(':memory:'));
  const { seed } = await import('../src/seed.ts');
  seed();
  const { createApp } = await import('../src/app.ts');
  const { tickAuctions } = await import('../src/services/auctions.ts');
  mod = { getDb, tickAuctions };
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(() => {
  server.close();
  rmSync(tmp, { recursive: true, force: true });
});

async function api(method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function login(email: string) {
  const r = await api('POST', '/auth/login', { email, password: 'subastia123' });
  assert.equal(r.status, 200);
  return r.body.token as string;
}

test('full auction lifecycle', async () => {
  const seller = await login('ana@demo.com');
  const luis = await login('luis@demo.com');
  const marta = await login('marta@demo.com');

  const created = await api(
    'POST',
    '/auctions',
    {
      title: 'Guitarra acústica Yamaha',
      description: 'Guitarra acústica en muy buen estado, con funda acolchada y cuerdas nuevas.',
      categoryId: 'home',
      condition: 'good',
      images: ['/uploads/demo/lot-1-1.svg'],
      startingPrice: 5000,
      reservePrice: 8000,
      shippingCost: 900,
      durationDays: 1,
    },
    seller,
  );
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const auctionId = created.body.id;
  assert.equal(created.body.status, 'active');
  assert.equal(created.body.reservePrice, undefined, 'reserve must never leak');

  assert.equal((await api('POST', `/auctions/${auctionId}/bids`, { maxAmount: 6000 }, seller)).body.error.code, 'SELLER_CANNOT_BID');

  const b1 = await api('POST', `/auctions/${auctionId}/bids`, { maxAmount: 9000 }, luis, { 'Idempotency-Key': 'k1' });
  assert.equal(b1.status, 200);
  assert.equal(b1.body.currentPrice, 8000, 'jumps to reserve');
  assert.equal(b1.body.winning, true);
  const replay = await api('POST', `/auctions/${auctionId}/bids`, { maxAmount: 9000 }, luis, { 'Idempotency-Key': 'k1' });
  assert.deepEqual(replay.body, b1.body, 'idempotent replay');

  const low = await api('POST', `/auctions/${auctionId}/bids`, { maxAmount: 8000 }, marta);
  assert.equal(low.body.error.code, 'BID_TOO_LOW');
  assert.equal(low.body.error.minNextBid, 8100);

  const b2 = await api('POST', `/auctions/${auctionId}/bids`, { maxAmount: 8500 }, marta);
  assert.equal(b2.body.winning, false);
  assert.equal(b2.body.currentPrice, 8600);

  const detail = await api('GET', `/auctions/${auctionId}`, undefined, luis);
  assert.equal(detail.body.viewer.isLeading, true);
  assert.equal(detail.body.viewer.myMax, 9000);
  assert.ok(detail.body.bids.every((b: any) => b.bidder.includes('***')));

  // Close it.
  mod.getDb().run('UPDATE auctions SET end_at = ? WHERE id = ?', Date.now() - 1, auctionId);
  mod.tickAuctions();
  mod.tickAuctions(); // idempotent
  const orders = await api('GET', '/me/orders', undefined, luis);
  const order = orders.body.find((o: any) => o.auctionId === auctionId);
  assert.ok(order);
  assert.equal(order.hammerPrice, 8600);
  assert.equal(order.total, 8600 + 430 + 90 + 900);
  assert.equal(mod.getDb().all('SELECT id FROM orders WHERE auction_id = ?', auctionId).length, 1);

  const declined = await api('POST', `/orders/${order.id}/pay`, {
    cardNumber: '4000 0000 0000 0002', expiry: '12/30', cvc: '123', shippingAddress: 'Calle Mayor 1, 28013 Madrid',
  }, luis);
  assert.equal(declined.body.error.code, 'CARD_DECLINED');

  const paid = await api('POST', `/orders/${order.id}/pay`, {
    cardNumber: '4242 4242 4242 4242', expiry: '12/30', cvc: '123', shippingAddress: 'Calle Mayor 1, 28013 Madrid',
  }, luis);
  assert.equal(paid.body.status, 'paid');

  const shipped = await api('POST', `/orders/${order.id}/ship`, { carrier: 'Correos', trackingNumber: 'PK123456' }, seller);
  assert.equal(shipped.body.status, 'shipped');

  const done = await api('POST', `/orders/${order.id}/confirm-delivery`, {}, luis);
  assert.equal(done.body.status, 'completed');

  const ledger = mod.getDb().get('SELECT SUM(amount) AS s FROM ledger_entries WHERE order_id = ?', order.id);
  assert.equal(ledger!.s, 0, 'ledger balances');

  assert.equal((await api('POST', `/orders/${order.id}/review`, { rating: 5, comment: 'Genial' }, luis)).status, 200);
  assert.equal((await api('POST', `/orders/${order.id}/review`, { rating: 5 }, luis)).status, 409);

  const notifications = await api('GET', '/me/notifications', undefined, marta);
  assert.ok(notifications.body.some((n: any) => n.type === 'lost'));
});

test('moderation rejects prohibited listings', async () => {
  const token = await login('javier@demo.com');
  const r = await api('POST', '/auctions', {
    title: 'Réplica de reloj de lujo',
    description: 'Es una réplica casi perfecta del modelo original, nadie lo nota.',
    categoryId: 'watches', condition: 'new', images: ['/x.jpg'], startingPrice: 1000, shippingCost: 0, durationDays: 3,
  }, token);
  assert.equal(r.body.status, 'rejected');
});

test('buy now ends the auction and creates the order', async () => {
  const token = await login('marta@demo.com');
  const list = await api('GET', '/auctions?sort=newest&limit=50');
  const target = list.body.items.find((a: any) => a.buyNowAvailable && a.sellerId !== undefined);
  assert.ok(target);
  const detail = await api('GET', `/auctions/${target.id}`, undefined, token);
  if (detail.body.viewer.isSeller) return;
  const r = await api('POST', `/auctions/${target.id}/buy-now`, {}, token);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.hammerPrice, target.buyNowPrice);
  const after = await api('GET', `/auctions/${target.id}`);
  assert.equal(after.body.auction.status, 'sold');
});
