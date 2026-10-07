import express from 'express';
import path from 'node:path';
import Stripe from 'stripe';
import { db, getSettings, setSetting, transaction, committedHashrate } from './db.js';
import {
  hashPassword, verifyPassword, createSession, destroySession,
  setSessionCookie, clearSessionCookie, loadUser, requireUser, requireAdmin,
} from './auth.js';
import { network, dailyEstimate, startNetworkRefresh } from './network.js';
import { startEngine } from './engine.js';

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
// Without Stripe keys the app runs in demo mode: purchases are confirmed without charging anyone.
const PAYMENT_MODE = stripe ? 'stripe' : 'demo';

const app = express();
app.disable('x-powered-by');

// Turns an order into a mining contract exactly once.
export function activateOrder(orderId, stripeSessionId = null) {
  return transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order || order.status === 'paid') return false;
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(order.plan_id);
    const now = Date.now();
    db.prepare("UPDATE orders SET status = 'paid', paid_at = ?, stripe_session_id = COALESCE(?, stripe_session_id) WHERE id = ?")
      .run(now, stripeSessionId, order.id);
    db.prepare(`INSERT INTO contracts (user_id, order_id, plan_name, hashrate_th, start_at, end_at, last_accrued_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(order.user_id, order.id, `${plan.name} x${order.quantity}`, order.hashrate_th,
        now, now + plan.duration_days * 86400_000, now);
    return true;
  });
}

// Stripe needs the raw body to verify the signature, so this route goes before express.json().
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(404).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (session.payment_status === 'paid') activateOrder(Number(session.metadata.order_id), session.id);
  }
  if (event.type === 'checkout.session.expired') {
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'")
      .run(Number(event.data.object.metadata.order_id));
  }
  res.json({ received: true });
});

app.use(express.json({ limit: '20kb' }));
app.use(loadUser);
app.use(express.static(path.join(import.meta.dirname, '..', 'public')));

const wrap = (fn) => (req, res) => {
  try {
    const out = fn(req, res);
    if (out instanceof Promise) out.catch((err) => fail(res, err));
  } catch (err) { fail(res, err); }
};
function fail(res, err) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno.' });
}
const bad = (message, status = 400) => Object.assign(new Error(message), { status });

// ---------- public ----------

app.get('/api/config', (req, res) => {
  const s = getSettings();
  res.json({
    paymentMode: PAYMENT_MODE,
    network: network(),
    settings: {
      maintenanceUsdPerThDay: s.maintenance_usd_per_th_day,
      withdrawFeeBtc: s.withdraw_fee_btc,
      minWithdrawBtc: s.min_withdraw_btc,
    },
    availableTh: Math.max(0, s.capacity_th - committedHashrate().total),
    user: req.user ? { email: req.user.email, isAdmin: !!req.user.is_admin } : null,
  });
});

app.get('/api/plans', (req, res) => {
  const { maintenance_usd_per_th_day: m } = getSettings();
  const plans = db.prepare('SELECT * FROM plans WHERE active = 1 ORDER BY price_cents').all();
  res.json(plans.map((p) => ({ ...p, estimate: dailyEstimate(p.hashrate_th, m) })));
});

// ---------- auth ----------

app.post('/api/register', wrap((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('Correo no válido.');
  if (password.length < 8) throw bad('La contraseña debe tener al menos 8 caracteres.');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw bad('Ese correo ya está registrado.', 409);
  const { hash, salt } = hashPassword(password);
  const isAdmin = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0 ? 1 : 0;
  const { lastInsertRowid } = db.prepare('INSERT INTO users (email, pass_hash, salt, is_admin, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(email, hash, salt, isAdmin, Date.now());
  setSessionCookie(res, createSession(Number(lastInsertRowid)));
  res.status(201).json({ ok: true });
}));

app.post('/api/login', wrap((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(String(req.body.password || ''), user.salt, user.pass_hash)) {
    throw bad('Correo o contraseña incorrectos.', 401);
  }
  setSessionCookie(res, createSession(user.id));
  res.json({ ok: true });
}));

app.post('/api/logout', (req, res) => {
  if (req.sessionToken) destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ---------- user ----------

app.post('/api/checkout', requireUser, wrap(async (req, res) => {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(Number(req.body.planId));
  if (!plan) throw bad('Plan no disponible.');
  const quantity = Number(req.body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw bad('Cantidad no válida (1 a 100).');

  const hashrate = plan.hashrate_th * quantity;
  const amount = plan.price_cents * quantity;
  const orderId = transaction(() => {
    const available = getSettings().capacity_th - committedHashrate().total;
    if (hashrate > available) {
      throw bad(`Solo quedan ${Math.max(0, available).toFixed(1)} TH/s de capacidad real disponible.`, 409);
    }
    return Number(db.prepare(`INSERT INTO orders (user_id, plan_id, quantity, hashrate_th, amount_cents, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(req.user.id, plan.id, quantity, hashrate, amount, Date.now()).lastInsertRowid);
  });

  if (PAYMENT_MODE === 'demo') {
    activateOrder(orderId);
    return res.json({ demo: true, orderId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: req.user.email,
    line_items: [{
      quantity,
      price_data: {
        currency: 'usd',
        unit_amount: plan.price_cents,
        product_data: {
          name: `Contrato de minería ${plan.name}`,
          description: `${plan.hashrate_th} TH/s de SHA-256 durante ${plan.duration_days} días`,
        },
      },
    }],
    metadata: { order_id: String(orderId) },
    success_url: `${BASE_URL}/?pago=ok#panel`,
    cancel_url: `${BASE_URL}/?pago=cancelado#mineros`,
  });
  db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId);
  res.json({ url: session.url });
}));

app.get('/api/dashboard', requireUser, (req, res) => {
  const uid = req.user.id;
  const contracts = db.prepare('SELECT * FROM contracts WHERE user_id = ? ORDER BY start_at DESC').all(uid);
  const rewards = db.prepare(`SELECT day, SUM(gross_btc) AS gross_btc, SUM(fee_btc) AS fee_btc, SUM(net_btc) AS net_btc
    FROM rewards_daily WHERE user_id = ? GROUP BY day ORDER BY day DESC LIMIT 30`).all(uid);
  const orders = db.prepare(`SELECT o.id, o.quantity, o.amount_cents, o.status, o.created_at, p.name AS plan_name
    FROM orders o JOIN plans p ON p.id = o.plan_id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 20`).all(uid);
  const withdrawals = db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC').all(uid);
  const balance = db.prepare('SELECT balance_btc FROM users WHERE id = ?').get(uid).balance_btc;
  const activeTh = contracts.filter((c) => c.status === 'active').reduce((s, c) => s + c.hashrate_th, 0);
  res.json({
    balanceBtc: balance,
    activeTh,
    estimate: dailyEstimate(activeTh, getSettings().maintenance_usd_per_th_day),
    contracts, rewards, orders, withdrawals,
  });
});

const BTC_ADDRESS = /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/;

app.post('/api/withdrawals', requireUser, wrap((req, res) => {
  const address = String(req.body.address || '').trim();
  const amount = Number(req.body.amountBtc);
  const s = getSettings();
  if (!BTC_ADDRESS.test(address)) throw bad('Dirección Bitcoin no válida.');
  if (!(amount >= s.min_withdraw_btc)) throw bad(`El mínimo de retiro es ${s.min_withdraw_btc} BTC.`);
  transaction(() => {
    const { balance_btc } = db.prepare('SELECT balance_btc FROM users WHERE id = ?').get(req.user.id);
    if (amount > balance_btc + 1e-12) throw bad('Saldo insuficiente.');
    db.prepare('UPDATE users SET balance_btc = balance_btc - ? WHERE id = ?').run(amount, req.user.id);
    db.prepare('INSERT INTO withdrawals (user_id, address, amount_btc, fee_btc, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, address, amount, s.withdraw_fee_btc, Date.now());
  });
  res.status(201).json({ ok: true });
}));

// ---------- admin ----------

app.get('/api/admin/overview', requireUser, requireAdmin, (req, res) => {
  const s = getSettings();
  res.json({
    settings: s,
    committed: committedHashrate(),
    users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    revenueCents: db.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS c FROM orders WHERE status = 'paid'").get().c,
    owedBtc: db.prepare('SELECT COALESCE(SUM(balance_btc), 0) AS b FROM users').get().b,
    plans: db.prepare('SELECT * FROM plans ORDER BY price_cents').all(),
    withdrawals: db.prepare(`SELECT w.*, u.email FROM withdrawals w JOIN users u ON u.id = w.user_id
      ORDER BY w.status = 'pending' DESC, w.created_at DESC LIMIT 100`).all(),
  });
});

const EDITABLE_SETTINGS = ['capacity_th', 'maintenance_usd_per_th_day', 'withdraw_fee_btc', 'min_withdraw_btc'];

app.put('/api/admin/settings', requireUser, requireAdmin, wrap((req, res) => {
  for (const key of EDITABLE_SETTINGS) {
    if (req.body[key] === undefined) continue;
    const value = Number(req.body[key]);
    if (!Number.isFinite(value) || value < 0) throw bad(`Valor no válido para ${key}.`);
    setSetting(key, value);
  }
  res.json({ ok: true });
}));

function readPlan(body) {
  const plan = {
    name: String(body.name || '').trim(),
    hashrate_th: Number(body.hashrate_th),
    duration_days: Number(body.duration_days),
    price_cents: Math.round(Number(body.price_usd) * 100),
    active: body.active === false ? 0 : 1,
  };
  if (!plan.name || !(plan.hashrate_th > 0) || !Number.isInteger(plan.duration_days) || plan.duration_days < 1
    || !(plan.price_cents >= 50)) throw bad('Datos del plan no válidos.');
  return plan;
}

app.post('/api/admin/plans', requireUser, requireAdmin, wrap((req, res) => {
  const p = readPlan(req.body);
  db.prepare('INSERT INTO plans (name, hashrate_th, duration_days, price_cents, active) VALUES (?, ?, ?, ?, ?)')
    .run(p.name, p.hashrate_th, p.duration_days, p.price_cents, p.active);
  res.status(201).json({ ok: true });
}));

app.put('/api/admin/plans/:id', requireUser, requireAdmin, wrap((req, res) => {
  const p = readPlan(req.body);
  db.prepare('UPDATE plans SET name = ?, hashrate_th = ?, duration_days = ?, price_cents = ?, active = ? WHERE id = ?')
    .run(p.name, p.hashrate_th, p.duration_days, p.price_cents, p.active, Number(req.params.id));
  res.json({ ok: true });
}));

app.post('/api/admin/withdrawals/:id/:action', requireUser, requireAdmin, wrap((req, res) => {
  const { id, action } = req.params;
  transaction(() => {
    const w = db.prepare("SELECT * FROM withdrawals WHERE id = ? AND status = 'pending'").get(Number(id));
    if (!w) throw bad('Retiro no encontrado o ya procesado.', 404);
    if (action === 'approve') {
      const txid = String(req.body.txid || '').trim();
      if (!/^[0-9a-fA-F]{64}$/.test(txid)) throw bad('El TXID debe tener 64 caracteres hexadecimales.');
      db.prepare("UPDATE withdrawals SET status = 'paid', txid = ?, processed_at = ? WHERE id = ?").run(txid, Date.now(), w.id);
    } else if (action === 'reject') {
      db.prepare("UPDATE withdrawals SET status = 'rejected', processed_at = ? WHERE id = ?").run(Date.now(), w.id);
      db.prepare('UPDATE users SET balance_btc = balance_btc + ? WHERE id = ?').run(w.amount_btc, w.user_id);
    } else {
      throw bad('Acción no válida.');
    }
  });
  res.json({ ok: true });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado.' }));

if (process.env.NODE_ENV !== 'test') {
  startNetworkRefresh();
  startEngine();
  app.listen(PORT, () => {
    console.log(`CloudHash en ${BASE_URL} (pagos: ${PAYMENT_MODE === 'stripe' ? 'Stripe' : 'DEMO, sin cobro real'})`);
  });
}

export default app;
