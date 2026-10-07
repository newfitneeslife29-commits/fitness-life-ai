import { db, getSettings, transaction } from './db.js';
import { expectedBtc, network } from './network.js';

const TICK_MS = 60_000;

// Credits each active contract for the time elapsed since its last accrual.
export function accrue(now = Date.now()) {
  const { maintenance_usd_per_th_day: maintenance } = getSettings();
  const { priceUsd } = network();
  const contracts = db.prepare("SELECT * FROM contracts WHERE status = 'active'").all();

  const updateContract = db.prepare(
    'UPDATE contracts SET last_accrued_at = ?, mined_btc = mined_btc + ?, status = ? WHERE id = ?');
  const creditUser = db.prepare('UPDATE users SET balance_btc = balance_btc + ? WHERE id = ?');
  const addDaily = db.prepare(`
    INSERT INTO rewards_daily (contract_id, user_id, day, gross_btc, fee_btc, net_btc) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(contract_id, day) DO UPDATE SET
      gross_btc = gross_btc + excluded.gross_btc,
      fee_btc = fee_btc + excluded.fee_btc,
      net_btc = net_btc + excluded.net_btc`);

  let credited = 0;
  transaction(() => {
    for (const c of contracts) {
      const from = Math.max(c.last_accrued_at, c.start_at);
      const to = Math.min(now, c.end_at);
      const status = now >= c.end_at ? 'expired' : 'active';
      if (to <= from) {
        if (status !== c.status) updateContract.run(c.last_accrued_at, 0, status, c.id);
        continue;
      }
      const seconds = (to - from) / 1000;
      const gross = expectedBtc(c.hashrate_th, seconds);
      const fee = (maintenance * c.hashrate_th * seconds) / 86400 / priceUsd;
      const net = Math.max(0, gross - fee);
      const day = new Date(to).toISOString().slice(0, 10);

      updateContract.run(to, net, status, c.id);
      creditUser.run(net, c.user_id);
      addDaily.run(c.id, c.user_id, day, gross, Math.min(fee, gross), net);
      credited += net;
    }
  });
  return credited;
}

export function startEngine() {
  accrue();
  setInterval(() => {
    try { accrue(); } catch (err) { console.error('[engine]', err); }
  }, TICK_MS).unref();
}
