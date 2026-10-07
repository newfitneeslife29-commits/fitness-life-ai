// Live Bitcoin network data used by the reward engine, with safe fallbacks.
export const BLOCK_REWARD_BTC = 3.125; // subsidy since the April 2024 halving

const FALLBACK = { difficulty: 1.5e14, priceUsd: 100000 };
const REFRESH_MS = 10 * 60_000;

const state = { ...FALLBACK, source: 'fallback', updatedAt: null };

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

export async function refreshNetwork() {
  if (process.env.OFFLINE_NETWORK === '1') return state;
  const [diff, price] = await Promise.allSettled([
    fetchJson('https://mempool.space/api/v1/mining/hashrate/3d'),
    fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
  ]);
  let live = false;
  if (diff.status === 'fulfilled' && diff.value.currentDifficulty > 0) {
    state.difficulty = diff.value.currentDifficulty;
    live = true;
  }
  if (price.status === 'fulfilled' && price.value.bitcoin?.usd > 0) {
    state.priceUsd = price.value.bitcoin.usd;
    live = true;
  }
  if (live) {
    state.source = 'live';
    state.updatedAt = Date.now();
  }
  return state;
}

export function startNetworkRefresh() {
  refreshNetwork().catch(() => {});
  setInterval(() => refreshNetwork().catch(() => {}), REFRESH_MS).unref();
}

export function network() {
  return { ...state, blockRewardBtc: BLOCK_REWARD_BTC };
}

// Expected BTC mined by `th` TH/s over `seconds`: H * 1e12 * t * R / (D * 2^32).
export function expectedBtc(th, seconds, difficulty = state.difficulty) {
  return (th * 1e12 * seconds * BLOCK_REWARD_BTC) / (difficulty * 2 ** 32);
}

// Daily gross, maintenance fee and net for a given hashrate, in BTC and USD.
export function dailyEstimate(th, maintenanceUsdPerThDay) {
  const grossBtc = expectedBtc(th, 86400);
  const feeUsd = maintenanceUsdPerThDay * th;
  const feeBtc = feeUsd / state.priceUsd;
  const netBtc = Math.max(0, grossBtc - feeBtc);
  return {
    grossBtc, feeBtc, netBtc,
    grossUsd: grossBtc * state.priceUsd,
    feeUsd,
    netUsd: netBtc * state.priceUsd,
  };
}
