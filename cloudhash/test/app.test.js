import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';
import { db, setSetting } from '../src/db.js';
import { accrue } from '../src/engine.js';
import { expectedBtc } from '../src/network.js';

let server, base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + '/api' + path, {
      method, headers: { 'Content-Type': 'application/json', cookie }, body: body && JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json() };
  };
}

test('reward formula matches the standard hashprice', () => {
  // 100 TH/s for one day at difficulty 150 T is about 0.0000419 BTC.
  assert.ok(Math.abs(expectedBtc(100, 86400, 1.5e14) - 4.19e-5) < 1e-7);
});

test('full flow: register, buy (demo), accrue, withdraw, admin approve', async () => {
  const admin = client();
  const user = client();
  assert.equal((await admin('/register', { method: 'POST', body: { email: 'admin@x.com', password: 'secreta123' } })).status, 201);
  assert.equal((await user('/register', { method: 'POST', body: { email: 'user@x.com', password: 'secreta123' } })).status, 201);
  assert.equal((await user('/admin/overview')).status, 403);
  assert.equal((await admin('/admin/overview')).status, 200);

  const plans = (await user('/plans')).data;
  const elite = plans.find((p) => p.name === 'Elite');
  const buy = await user('/checkout', { method: 'POST', body: { planId: elite.id, quantity: 2 } });
  assert.equal(buy.data.demo, true);

  // Pretend the contract started a day ago and run the engine.
  const dayAgo = Date.now() - 86400_000;
  db.prepare('UPDATE contracts SET start_at = ?, last_accrued_at = ?').run(dayAgo, dayAgo);
  accrue();
  const dash = (await user('/dashboard')).data;
  assert.equal(dash.activeTh, 200);
  // 200 TH: gross 0.0000838 BTC, fee 4 USD = 0.00004 BTC, net about 0.0000438 BTC.
  assert.ok(Math.abs(dash.balanceBtc - 4.38e-5) < 1e-6, `balance ${dash.balanceBtc}`);
  accrue(); // second run immediately after credits almost nothing
  assert.ok((await user('/dashboard')).data.balanceBtc - dash.balanceBtc < 1e-9);

  db.prepare("UPDATE users SET balance_btc = 0.01 WHERE email = 'user@x.com'").run();
  const addr = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
  assert.equal((await user('/withdrawals', { method: 'POST', body: { address: 'nope', amountBtc: 0.001 } })).status, 400);
  assert.equal((await user('/withdrawals', { method: 'POST', body: { address: addr, amountBtc: 1 } })).status, 400);
  assert.equal((await user('/withdrawals', { method: 'POST', body: { address: addr, amountBtc: 0.004 } })).status, 201);
  assert.ok(Math.abs((await user('/dashboard')).data.balanceBtc - 0.006) < 1e-9);

  const w = (await admin('/admin/overview')).data.withdrawals[0];
  assert.equal((await admin(`/admin/withdrawals/${w.id}/approve`, { method: 'POST', body: { txid: 'abc' } })).status, 400);
  assert.equal((await admin(`/admin/withdrawals/${w.id}/approve`, { method: 'POST', body: { txid: 'a'.repeat(64) } })).status, 200);
  assert.equal((await user('/dashboard')).data.withdrawals[0].status, 'paid');
});

test('sales are blocked beyond the declared real capacity', async () => {
  const user = client();
  await user('/register', { method: 'POST', body: { email: 'cap@x.com', password: 'secreta123' } });
  setSetting('capacity_th', 250); // 200 TH already sold in the previous test
  const plans = (await user('/plans')).data;
  const pro = plans.find((p) => p.name === 'Pro');
  assert.equal((await user('/checkout', { method: 'POST', body: { planId: pro.id, quantity: 1 } })).status, 200);
  const res = await user('/checkout', { method: 'POST', body: { planId: pro.id, quantity: 1 } });
  assert.equal(res.status, 409);
  assert.match(res.data.error, /capacidad/);
});

test('rejected withdrawal refunds the balance and login checks password', async () => {
  const u = client();
  assert.equal((await u('/login', { method: 'POST', body: { email: 'user@x.com', password: 'mala-clave' } })).status, 401);
  assert.equal((await u('/login', { method: 'POST', body: { email: 'user@x.com', password: 'secreta123' } })).status, 200);
  const before = (await u('/dashboard')).data.balanceBtc;
  await u('/withdrawals', { method: 'POST', body: { address: '1BoatSLRHtKNngkdXEeobR76b53LETtpyT', amountBtc: 0.001 } });
  const admin = client();
  await admin('/login', { method: 'POST', body: { email: 'admin@x.com', password: 'secreta123' } });
  const w = (await admin('/admin/overview')).data.withdrawals.find((x) => x.status === 'pending');
  assert.equal((await admin(`/admin/withdrawals/${w.id}/reject`, { method: 'POST' })).status, 200);
  assert.ok(Math.abs((await u('/dashboard')).data.balanceBtc - before) < 1e-9);
});
