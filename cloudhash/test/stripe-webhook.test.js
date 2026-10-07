import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
const { default: app } = await import('../src/server.js');
const { db } = await import('../src/db.js');

let server, base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());

const stripe = new Stripe('sk_test_dummy');
const send = (payload, secret = process.env.STRIPE_WEBHOOK_SECRET) => {
  const body = JSON.stringify(payload);
  const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  return fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': header }, body });
};

test('signed checkout.session.completed activates the order once; bad signatures are rejected', async () => {
  const uid = Number(db.prepare("INSERT INTO users (email, pass_hash, salt, created_at) VALUES ('s@x.com', 'x', 'x', 0)").run().lastInsertRowid);
  const orderId = Number(db.prepare(`INSERT INTO orders (user_id, plan_id, quantity, hashrate_th, amount_cents, created_at)
    VALUES (?, 1, 1, 10, 4900, ?)`).run(uid, Date.now()).lastInsertRowid);
  const event = { id: 'evt_1', type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid', metadata: { order_id: String(orderId) } } } };

  assert.equal((await send(event, 'whsec_wrong')).status, 400);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM contracts').get().n, 0);

  assert.equal((await send(event)).status, 200);
  assert.equal((await send(event)).status, 200); // Stripe retries must not duplicate the contract
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM contracts').get().n, 1);
  assert.equal(db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status, 'paid');

  const cfg = await (await fetch(`${base}/api/config`)).json();
  assert.equal(cfg.paymentMode, 'stripe');
});
