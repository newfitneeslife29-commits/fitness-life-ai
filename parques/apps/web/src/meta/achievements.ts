/**
 * Más de 1.000 logros generados por categorías (métricas) y niveles I…L.
 * Cada categoría tiene hasta 50 metas que crecen de forma geométrica, para que
 * siempre haya un siguiente logro por alcanzar.
 */
import type { TableId } from '@parques/engine';

export interface ProfileStats {
  games: number;
  wins: number;
  podiums: number;
  captures: number;
  captured: number;
  crowned: number;
  soplos: number;
  pairs: number;
  triplePenalties: number;
  onlineGames: number;
  winStreak: number;
  bestWinStreak: number;
  teamWins: number;
  quickWins: number;
  sixWins: number;
  coinsWon: number;
  gemsWon: number;
  emotesSent: number;
  maxDailyStreak: number;
  tableWins: Partial<Record<TableId, number>>;
}

export const EMPTY_STATS: ProfileStats = {
  games: 0, wins: 0, podiums: 0, captures: 0, captured: 0, crowned: 0, soplos: 0, pairs: 0,
  triplePenalties: 0, onlineGames: 0, winStreak: 0, bestWinStreak: 0, teamWins: 0, quickWins: 0,
  sixWins: 0, coinsWon: 0, gemsWon: 0, emotesSent: 0, maxDailyStreak: 0, tableWins: {},
};

export interface AchievementCtx {
  stats: ProfileStats;
  level: number;
  owned: number;
  passTiers: number;
}

export interface Category {
  key: string;
  name: string;
  /** Descripción con {n}. */
  desc: string;
  emoji: string;
  value: (c: AchievementCtx) => number;
  thresholds: number[];
}

export interface AchievementDef {
  id: string;
  category: string;
  tier: number;
  name: string;
  desc: string;
  badge: string;
  goal: number;
  coins: number;
}

/** Números "bonitos": 2 cifras significativas. */
function nice(x: number): number {
  if (x < 10) return Math.round(x);
  const p = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / p) * p;
}

function ladder(start: number, end: number, n = 50): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = nice(start * Math.pow(end / start, i / (n - 1)));
    if (!out.length || v > out[out.length - 1]!) out.push(v);
  }
  return out;
}

const tw = (id: TableId) => (c: AchievementCtx) => c.stats.tableWins[id] ?? 0;

export const CATEGORIES: Category[] = [
  { key: 'games', name: 'Jugador incansable', desc: 'Juega {n} partidas', emoji: '🎲', value: (c) => c.stats.games, thresholds: ladder(1, 50000) },
  { key: 'wins', name: 'Ganador', desc: 'Gana {n} partidas', emoji: '🏆', value: (c) => c.stats.wins, thresholds: ladder(1, 20000) },
  { key: 'podiums', name: 'Siempre en el podio', desc: 'Queda en el podio {n} veces', emoji: '🥉', value: (c) => c.stats.podiums, thresholds: ladder(1, 30000) },
  { key: 'captures', name: 'Cazador', desc: 'Captura {n} fichas', emoji: '💥', value: (c) => c.stats.captures, thresholds: ladder(1, 200000) },
  { key: 'crowned', name: 'Al cielo', desc: 'Corona {n} fichas', emoji: '👑', value: (c) => c.stats.crowned, thresholds: ladder(1, 200000) },
  { key: 'soplos', name: 'Pulmones de acero', desc: 'Sopla {n} veces', emoji: '🌬️', value: (c) => c.stats.soplos, thresholds: ladder(1, 20000) },
  { key: 'pairs', name: 'Rey de los pares', desc: 'Saca {n} pares', emoji: '🎯', value: (c) => c.stats.pairs, thresholds: ladder(5, 500000) },
  { key: 'online', name: 'Conectado', desc: 'Juega {n} partidas online', emoji: '🌐', value: (c) => c.stats.onlineGames, thresholds: ladder(1, 20000) },
  { key: 'teams', name: 'Buena yunta', desc: 'Gana {n} partidas en parejas', emoji: '🤝', value: (c) => c.stats.teamWins, thresholds: ladder(1, 10000) },
  { key: 'quick', name: 'Rapidito', desc: 'Gana {n} partidas rápidas', emoji: '⚡', value: (c) => c.stats.quickWins, thresholds: ladder(1, 10000) },
  { key: 'six', name: 'Mesa grande', desc: 'Gana {n} partidas de 6 jugadores', emoji: '🔶', value: (c) => c.stats.sixWins, thresholds: ladder(1, 5000) },
  { key: 'coins', name: 'Platudo', desc: 'Gana {n} monedas en partidas', emoji: '🪙', value: (c) => c.stats.coinsWon, thresholds: ladder(500, 1_000_000_000) },
  { key: 'gems', name: 'Joyero', desc: 'Gana {n} gemas', emoji: '💎', value: (c) => c.stats.gemsWon, thresholds: ladder(5, 100000) },
  { key: 'emotes', name: 'Bochinchero', desc: 'Envía {n} emotes', emoji: '😂', value: (c) => c.stats.emotesSent, thresholds: ladder(1, 50000) },
  { key: 'level', name: 'Experiencia', desc: 'Llega al nivel {n}', emoji: '⭐', value: (c) => c.level, thresholds: ladder(2, 2000) },
  { key: 'streak', name: 'En racha', desc: 'Gana {n} partidas seguidas', emoji: '🔥', value: (c) => c.stats.bestWinStreak, thresholds: ladder(2, 100) },
  { key: 'daily', name: 'Juiciosito', desc: 'Entra {n} días seguidos', emoji: '📅', value: (c) => c.stats.maxDailyStreak, thresholds: ladder(2, 365) },
  { key: 'pass', name: 'Pasajero', desc: 'Sube {n} niveles del pase', emoji: '🎟️', value: (c) => c.passTiers, thresholds: ladder(1, 2000) },
  { key: 'owned', name: 'Coleccionista', desc: 'Ten {n} objetos de la tienda', emoji: '🛍️', value: (c) => c.owned, thresholds: ladder(6, 45, 20) },
  { key: 'triple', name: '¡Uy, qué boleta!', desc: 'Saca tres pares seguidos {n} veces', emoji: '🚨', value: (c) => c.stats.triplePenalties, thresholds: ladder(1, 1000) },
  { key: 'captured', name: 'Cliente de la cárcel', desc: 'Te capturan {n} veces', emoji: '🚔', value: (c) => c.stats.captured, thresholds: ladder(1, 100000) },
  { key: 'w-barrio', name: 'Rey del barrio', desc: 'Gana {n} veces en la mesa Barrio', emoji: '🏘️', value: tw('barrio'), thresholds: ladder(1, 10000) },
  { key: 'w-ciudad', name: 'Dueño de la ciudad', desc: 'Gana {n} veces en la mesa Ciudad', emoji: '🏙️', value: tw('ciudad'), thresholds: ladder(1, 10000) },
  { key: 'w-capital', name: 'Señor de la capital', desc: 'Gana {n} veces en la mesa Capital', emoji: '🏛️', value: tw('capital'), thresholds: ladder(1, 10000) },
  { key: 'w-leyenda', name: 'Leyenda viva', desc: 'Gana {n} veces en la mesa Leyenda', emoji: '👑', value: tw('leyenda'), thresholds: ladder(1, 5000) },
  { key: 'w-elite', name: 'Élite', desc: 'Gana {n} veces en la Sala Élite', emoji: '💎', value: tw('elite'), thresholds: ladder(1, 5000) },
  { key: 'w-top', name: 'Top de tops', desc: 'Gana {n} veces en Top Leyendas', emoji: '🔥', value: tw('top'), thresholds: ladder(1, 5000) },
];

const ROMAN: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n: number): string {
  let s = '';
  for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; }
  return s;
}

export function fmtN(n: number): string {
  return n.toLocaleString('es-CO');
}

export const ACHIEVEMENTS: AchievementDef[] = CATEGORIES.flatMap((c) =>
  c.thresholds.map((goal, i) => ({
    id: `${c.key}-${i + 1}`,
    category: c.key,
    tier: i + 1,
    name: `${c.name} ${roman(i + 1)}`,
    desc: c.desc.replace('{n}', fmtN(goal)),
    badge: c.emoji,
    goal,
    coins: Math.min(5000, 50 + i * 40),
  })),
);

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export function achievement(id: string): AchievementDef | undefined {
  return BY_ID.get(id);
}

/** Color de la insignia según el nivel del logro. */
export function tierColor(tier: number): string {
  return tier <= 10 ? '#cd7f32' : tier <= 20 ? '#c0c0c0' : tier <= 30 ? '#ffcf3f' : tier <= 40 ? '#5eead4' : '#c084fc';
}

/** Logros recién desbloqueados (no estaban en `unlocked`). */
export function newlyUnlocked(ctx: AchievementCtx, unlocked: Record<string, number>): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const c of CATEGORIES) {
    const v = c.value(ctx);
    for (let i = 0; i < c.thresholds.length && c.thresholds[i]! <= v; i++) {
      const id = `${c.key}-${i + 1}`;
      if (!unlocked[id]) out.push(BY_ID.get(id)!);
    }
  }
  return out;
}

/** Progreso por categoría para la pantalla de logros. */
export function categoryProgress(ctx: AchievementCtx, unlocked: Record<string, number>) {
  return CATEGORIES.map((c) => {
    const value = c.value(ctx);
    const done = c.thresholds.filter((_, i) => unlocked[`${c.key}-${i + 1}`]).length;
    const next = c.thresholds[done];
    return { category: c, value, done, total: c.thresholds.length, next };
  });
}
