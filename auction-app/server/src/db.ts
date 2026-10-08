import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config.ts';

// SQLite through Node's built-in driver. Calls are synchronous and Node runs
// JS on one thread, so a transaction() block can never interleave with another
// request: bids on the same auction are fully serialized (guide §14.2).
// To move to PostgreSQL, port this module and use SELECT ... FOR UPDATE.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  city TEXT,
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  purchases_count INTEGER NOT NULL DEFAULT 0,
  unpaid_strikes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL,
  images TEXT NOT NULL,
  location TEXT,
  currency TEXT NOT NULL,
  starting_price INTEGER NOT NULL,
  reserve_price INTEGER,
  buy_now_price INTEGER,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  current_price INTEGER NOT NULL,
  leader_id TEXT REFERENCES users(id),
  bid_count INTEGER NOT NULL DEFAULT 0,
  watch_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  original_end_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  rejection_reason TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auctions_status_end ON auctions(status, end_at);
CREATE INDEX IF NOT EXISTS auctions_seller ON auctions(seller_id);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES auctions(id),
  bidder_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  is_proxy INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bids_auction ON bids(auction_id, created_at);
CREATE INDEX IF NOT EXISTS bids_bidder ON bids(bidder_id);

CREATE TABLE IF NOT EXISTS max_bids (
  auction_id TEXT NOT NULL REFERENCES auctions(id),
  bidder_id TEXT NOT NULL REFERENCES users(id),
  max_amount INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (auction_id, bidder_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS watchlist (
  user_id TEXT NOT NULL REFERENCES users(id),
  auction_id TEXT NOT NULL REFERENCES auctions(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, auction_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES auctions(id),
  asker_id TEXT NOT NULL REFERENCES users(id),
  question TEXT NOT NULL,
  answer TEXT,
  created_at INTEGER NOT NULL,
  answered_at INTEGER
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  auction_id TEXT UNIQUE NOT NULL REFERENCES auctions(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  currency TEXT NOT NULL,
  hammer_price INTEGER NOT NULL,
  buyer_fee INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  shipping_cost INTEGER NOT NULL,
  total INTEGER NOT NULL,
  seller_fee INTEGER NOT NULL,
  seller_payout INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_due_at INTEGER NOT NULL,
  payment_ref TEXT,
  card_last4 TEXT,
  carrier TEXT,
  tracking_number TEXT,
  shipping_address TEXT,
  dispute_reason TEXT,
  paid_at INTEGER,
  shipped_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  tx_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id),
  account TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  memo TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (order_id, author_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  auction_id TEXT,
  order_id TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT,
  created_at INTEGER NOT NULL
);
`;

export type Row = Record<string, any>;
type Params = SQLInputValue[];

export class Db {
  readonly raw: DatabaseSync;
  private depth = 0;

  constructor(file: string) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.raw = new DatabaseSync(file);
    this.raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.raw.exec(SCHEMA);
  }

  get<T = Row>(sql: string, ...params: Params): T | undefined {
    return this.raw.prepare(sql).get(...params) as T | undefined;
  }

  all<T = Row>(sql: string, ...params: Params): T[] {
    return this.raw.prepare(sql).all(...params) as T[];
  }

  run(sql: string, ...params: Params) {
    return this.raw.prepare(sql).run(...params);
  }

  /** Runs fn atomically. Nested calls join the outer transaction. */
  transaction<T>(fn: () => T): T {
    if (this.depth > 0) return fn();
    this.raw.exec('BEGIN IMMEDIATE');
    this.depth++;
    try {
      const result = fn();
      this.raw.exec('COMMIT');
      return result;
    } catch (err) {
      this.raw.exec('ROLLBACK');
      throw err;
    } finally {
      this.depth--;
    }
  }

  audit(actorId: string | null, action: string, entity: string, entityId: string, data?: unknown) {
    this.run(
      'INSERT INTO audit_log (id, actor_id, action, entity, entity_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      randomUUID(), actorId, action, entity, entityId, data === undefined ? null : JSON.stringify(data), Date.now(),
    );
  }
}

let instance: Db | null = null;

export function getDb(): Db {
  instance ??= new Db(config.dbFile);
  return instance;
}

/** Used by tests to run against an in-memory database. */
export function setDb(db: Db) {
  instance = db;
}

export const id = () => randomUUID();
