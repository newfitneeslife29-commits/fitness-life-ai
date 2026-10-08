import { config } from './config.ts';
import { tickAuctions } from './services/auctions.ts';
import { tickOrders } from './services/orders.ts';

// Single-process scheduler. Every step is idempotent, so running it on several
// instances would be safe but wasteful; at scale use one leader or a job queue.

let timer: NodeJS.Timeout | null = null;
let running = false;

export async function tick(now = Date.now()) {
  if (running) return;
  running = true;
  try {
    tickAuctions(now);
    await tickOrders(now);
  } catch (err) {
    console.error('[scheduler]', err);
  } finally {
    running = false;
  }
}

export function startScheduler() {
  timer = setInterval(() => void tick(), config.schedulerIntervalMs);
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
