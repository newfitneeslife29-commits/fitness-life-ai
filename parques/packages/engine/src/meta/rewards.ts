/** Premios de partida, recompensa diaria y ruleta. */
import { matchXp, payouts, table, WINNER_GEMS, type TableId } from '../economy';


/** Monedas iniciales al crear la cuenta. */
export const START_COINS = 1000;

export interface MatchSummary {
  /** 0 = primero. */
  place: number;
  players: number;
  won: boolean;
  teams: boolean;
  captures: number;
  captured: number;
  crowned: number;
  soplos: number;
  pairs: number;
  triplePenalties: number;
  mode: 'ai' | 'local' | 'teams' | 'quick' | 'online';
  table: TableId | null;
  /** Entrada que pagó el jugador (0 = gratis). */
  entry: number;
  /** Torneo al que cuenta la partida (si es de torneo). */
  tournament?: string | null;
  /** Id de la partida (para duplicar el premio con un anuncio una sola vez). */
  matchId?: string;
}

/** Lo que deja la partida: monedas que recibe (incluye su entrada si la recupera), XP y gemas. */
export function matchRewards(m: MatchSummary): { coins: number; xp: number; gems: number } {
  if (m.place < 0) return { coins: 0, xp: 0, gems: 0 };
  const entry = m.entry > 0 ? m.entry : 0;
  const pays = payouts(entry, m.players, m.teams);
  const place = m.teams ? (m.won ? 0 : 2) : m.place;
  const coins = entry > 0 ? (pays[place] ?? 0) : 0;
  const gems = entry > 0 && m.won ? WINNER_GEMS : 0;
  return { coins, xp: matchXp(entry || (table(m.table)?.entry ?? 0), place), gems };
}

/** Día local en formato AAAA-MM-DD. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const ta = Date.UTC(pa[0]!, pa[1]! - 1, pa[2]!);
  const tb = Date.UTC(pb[0]!, pb[1]! - 1, pb[2]!);
  return Math.round((tb - ta) / 86400000);
}

/** Premios de la racha diaria (día 1..7): solo monedas. */
export const DAILY_REWARDS: { coins: number }[] = [
  { coins: 100 },
  { coins: 150 },
  { coins: 200 },
  { coins: 300 },
  { coins: 400 },
  { coins: 600 },
  { coins: 1000 },
];

export function dailyStatus(lastClaim: string | null, streak: number, today: string): { canClaim: boolean; day: number } {
  if (!lastClaim) return { canClaim: true, day: 1 };
  const gap = daysBetween(lastClaim, today);
  if (gap <= 0) return { canClaim: false, day: ((streak - 1) % 7) + 1 };
  if (gap === 1) return { canClaim: true, day: (streak % 7) + 1 };
  return { canClaim: true, day: 1 };
}

/** Sectores de la ruleta de premios (monedas). */
export const ROULETTE: { label: string; coins: number; weight: number; color: string }[] = [
  { label: '50', coins: 50, weight: 24, color: '#ffc928' },
  { label: '100', coins: 100, weight: 22, color: '#ff3b4e' },
  { label: '150', coins: 150, weight: 16, color: '#22c55e' },
  { label: '250', coins: 250, weight: 14, color: '#2f7bff' },
  { label: '75', coins: 75, weight: 12, color: '#ff8a1f' },
  { label: '500', coins: 500, weight: 7, color: '#a855f7' },
  { label: '1000', coins: 1000, weight: 4, color: '#ffc928' },
  { label: '2500', coins: 2500, weight: 1, color: '#ff3b4e' },
];

export function spinRoulette(random: number): number {
  const total = ROULETTE.reduce((s, r) => s + r.weight, 0);
  let x = random * total;
  for (let i = 0; i < ROULETTE.length; i++) {
    x -= ROULETTE[i]!.weight;
    if (x < 0) return i;
  }
  return ROULETTE.length - 1;
}
