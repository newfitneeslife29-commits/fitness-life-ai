/**
 * Competencia: premios semanales del ranking (global, país y amigos) y torneos con inscripción.
 */

export type RankScope = 'global' | 'country' | 'friends';

export interface Prize {
  coins: number;
  gems: number;
}

interface Band {
  upTo: number;
  coins: number;
  gems: number;
}

/** Premios por puesto al cerrar la semana (según los trofeos del ranking). */
export const RANK_PRIZES: Record<RankScope, Band[]> = {
  global: [
    { upTo: 1, coins: 100000, gems: 150 },
    { upTo: 3, coins: 60000, gems: 90 },
    { upTo: 10, coins: 30000, gems: 50 },
    { upTo: 50, coins: 12000, gems: 20 },
    { upTo: 100, coins: 5000, gems: 10 },
  ],
  country: [
    { upTo: 1, coins: 30000, gems: 40 },
    { upTo: 3, coins: 15000, gems: 20 },
    { upTo: 10, coins: 7000, gems: 10 },
    { upTo: 50, coins: 2500, gems: 4 },
  ],
  friends: [
    { upTo: 1, coins: 2000, gems: 3 },
    { upTo: 2, coins: 1000, gems: 1 },
    { upTo: 3, coins: 500, gems: 0 },
  ],
};

export function rankPrize(scope: RankScope, place: number): Prize | null {
  if (place < 1) return null;
  const b = RANK_PRIZES[scope].find((x) => place <= x.upTo);
  return b ? { coins: b.coins, gems: b.gems } : null;
}

// ---------------------------------------------------------------- Torneos

export type TournamentTierId = 'libre' | 'bronce' | 'plata' | 'oro' | 'diamante';

export interface TournamentTier {
  id: TournamentTierId;
  name: string;
  emoji: string;
  /** Inscripción en monedas (0 = libre: cuentan todas las partidas online). */
  fee: number;
  minLevel: number;
  /** Lo que pone la casa al bote además de las inscripciones. */
  houseBonus: number;
  /** Partidas que cuentan por semana. */
  maxGames: number;
}

export const TOURNAMENT_TIERS: TournamentTier[] = [
  { id: 'libre', name: 'Liga libre', emoji: '🎈', fee: 0, minLevel: 1, houseBonus: 8500, maxGames: 999 },
  { id: 'bronce', name: 'Copa Bronce', emoji: '🥉', fee: 1000, minLevel: 3, houseBonus: 10000, maxGames: 30 },
  { id: 'plata', name: 'Copa Plata', emoji: '🥈', fee: 10000, minLevel: 15, houseBonus: 50000, maxGames: 30 },
  { id: 'oro', name: 'Copa Oro', emoji: '🥇', fee: 50000, minLevel: 40, houseBonus: 200000, maxGames: 30 },
  { id: 'diamante', name: 'Copa Diamante', emoji: '💎', fee: 250000, minLevel: 200, houseBonus: 1000000, maxGames: 30 },
];

export function tournamentTier(id: string | null | undefined): TournamentTier | undefined {
  return TOURNAMENT_TIERS.find((t) => t.id === id);
}

/** Reparto del bote: 1º 30 %, 2º 18 %, 3º 12 %, 4º–10º se reparten el 40 %. */
export const POOL_SPLIT = [0.3, 0.18, 0.12, 0.058, 0.058, 0.057, 0.057, 0.057, 0.057, 0.056];

export function tournamentPrizes(pool: number, players: number): number[] {
  const n = Math.min(players, POOL_SPLIT.length);
  const used = POOL_SPLIT.slice(0, n);
  const total = used.reduce((a, b) => a + b, 0) || 1;
  // Si hay menos de 10 inscritos, el bote se reparte entre los que hay (en la misma proporción).
  return used.map((s) => Math.floor((pool * s) / total));
}

/** Gemas extra para el podio de cada torneo. */
export const TOURNAMENT_GEMS = [30, 15, 8];
