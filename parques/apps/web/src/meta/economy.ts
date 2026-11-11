/** Niveles, XP, mesas con apuesta y premios. Funciones puras (probadas). */

/** XP necesaria para pasar del nivel `level` al siguiente. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

/** Recompensa por subir a `level`. */
export function levelReward(level: number): { coins: number; gems: number } {
  return { coins: 100 * level, gems: level % 5 === 0 ? 10 : 2 };
}

export interface TableTier {
  id: 'barrio' | 'ciudad' | 'capital' | 'leyenda';
  name: string;
  entry: number;
  /** Premio por puesto (1º, 2º, ...). */
  prizes: number[];
  minLevel: number;
  ai: 'easy' | 'normal' | 'expert';
  turnSeconds: number;
  emoji: string;
  blurb: string;
}

export const TABLES: TableTier[] = [
  { id: 'barrio', name: 'Barrio', entry: 50, prizes: [150, 50], minLevel: 1, ai: 'easy', turnSeconds: 25, emoji: '🏘️', blurb: 'La mesa de la cuadra, pa\' calentar.' },
  { id: 'ciudad', name: 'Ciudad', entry: 250, prizes: [750, 250], minLevel: 3, ai: 'normal', turnSeconds: 20, emoji: '🏙️', blurb: 'Aquí ya se juega en serio.' },
  { id: 'capital', name: 'Capital', entry: 1000, prizes: [3000, 1000], minLevel: 6, ai: 'expert', turnSeconds: 18, emoji: '🏛️', blurb: 'Solo pa\' los berracos.' },
  { id: 'leyenda', name: 'Leyenda', entry: 5000, prizes: [15000, 5000], minLevel: 10, ai: 'expert', turnSeconds: 15, emoji: '👑', blurb: 'Donde se coronan las leyendas.' },
];

export interface MatchSummary {
  /** 0 = primero. -1 si no participó un humano local. */
  place: number;
  players: number;
  won: boolean;
  captures: number;
  captured: number;
  crowned: number;
  soplos: number;
  pairs: number;
  triplePenalties: number;
  mode: 'ai' | 'local' | 'teams' | 'quick' | 'online';
  table: TableTier['id'] | null;
}

/** Monedas y XP que deja una partida. */
export function matchRewards(m: MatchSummary): { coins: number; xp: number } {
  const tier = TABLES.find((t) => t.id === m.table);
  const prize = tier ? (tier.prizes[m.place] ?? 0) : m.place === 0 ? 60 : m.place === 1 ? 25 : 10;
  const xpPlace = [60, 40, 25, 15, 10, 10][m.place] ?? 10;
  const xp = xpPlace + m.captures * 5 + m.crowned * 3 + m.soplos * 4 + (m.mode === 'online' ? 20 : 0);
  return { coins: m.place < 0 ? 0 : prize, xp: m.place < 0 ? 0 : xp };
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

/** Premios de la racha diaria (día 1..7). */
export const DAILY_REWARDS: { coins: number; gems: number }[] = [
  { coins: 100, gems: 0 },
  { coins: 150, gems: 0 },
  { coins: 200, gems: 2 },
  { coins: 300, gems: 0 },
  { coins: 400, gems: 5 },
  { coins: 600, gems: 0 },
  { coins: 1000, gems: 15 },
];

/**
 * Estado de la recompensa diaria. `streak` = días ya reclamados seguidos.
 * Si pasó más de un día sin reclamar, la racha vuelve a 0.
 */
export function dailyStatus(lastClaim: string | null, streak: number, today: string): { canClaim: boolean; day: number } {
  if (!lastClaim) return { canClaim: true, day: 1 };
  const gap = daysBetween(lastClaim, today);
  if (gap <= 0) return { canClaim: false, day: ((streak - 1) % 7) + 1 };
  if (gap === 1) return { canClaim: true, day: (streak % 7) + 1 };
  return { canClaim: true, day: 1 };
}

/** Sectores de la ruleta de premios. */
export const ROULETTE: { label: string; coins: number; gems: number; weight: number; color: string }[] = [
  { label: '100', coins: 100, gems: 0, weight: 26, color: '#ffc928' },
  { label: '250', coins: 250, gems: 0, weight: 20, color: '#ff3b4e' },
  { label: '5 💎', coins: 0, gems: 5, weight: 14, color: '#22c55e' },
  { label: '500', coins: 500, gems: 0, weight: 12, color: '#2f7bff' },
  { label: '150', coins: 150, gems: 0, weight: 16, color: '#ff8a1f' },
  { label: '15 💎', coins: 0, gems: 15, weight: 5, color: '#a855f7' },
  { label: '1000', coins: 1000, gems: 0, weight: 5, color: '#ffc928' },
  { label: '50 💎', coins: 0, gems: 50, weight: 2, color: '#ff3b4e' },
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
