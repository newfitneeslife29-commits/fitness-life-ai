import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const file = process.env.DB_FILE || path.join(import.meta.dirname, '..', 'data', 'cloudhash.db');
if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  balance_btc REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  hashrate_th REAL NOT NULL,
  duration_days INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  quantity INTEGER NOT NULL,
  hashrate_th REAL NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  plan_name TEXT NOT NULL,
  hashrate_th REAL NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  last_accrued_at INTEGER NOT NULL,
  mined_btc REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS rewards_daily (
  contract_id INTEGER NOT NULL REFERENCES contracts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  gross_btc REAL NOT NULL DEFAULT 0,
  fee_btc REAL NOT NULL DEFAULT 0,
  net_btc REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (contract_id, day)
);
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  address TEXT NOT NULL,
  amount_btc REAL NOT NULL,
  fee_btc REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  txid TEXT,
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const defaults = {
  capacity_th: '1000',
  maintenance_usd_per_th_day: '0.02',
  withdraw_fee_btc: '0.0001',
  min_withdraw_btc: '0.0005',
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(defaults)) insertSetting.run(k, v);

if (db.prepare('SELECT COUNT(*) AS n FROM plans').get().n === 0) {
  const p = db.prepare('INSERT INTO plans (name, hashrate_th, duration_days, price_cents) VALUES (?, ?, ?, ?)');
  p.run('Starter', 10, 180, 4900);
  p.run('Pro', 50, 365, 39900);
  p.run('Elite', 100, 365, 79900);
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

export function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// TH/s already sold (active contracts) plus orders awaiting payment in the last hour.
export function committedHashrate(now = Date.now()) {
  const active = db.prepare("SELECT COALESCE(SUM(hashrate_th), 0) AS th FROM contracts WHERE status = 'active'").get().th;
  const pending = db.prepare("SELECT COALESCE(SUM(hashrate_th), 0) AS th FROM orders WHERE status = 'pending' AND created_at > ?")
    .get(now - 3600_000).th;
  return { active, pending, total: active + pending };
}
