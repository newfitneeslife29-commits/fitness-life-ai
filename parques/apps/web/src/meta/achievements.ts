/** Logros con insignias. */
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
}

export const EMPTY_STATS: ProfileStats = {
  games: 0, wins: 0, podiums: 0, captures: 0, captured: 0, crowned: 0, soplos: 0, pairs: 0,
  triplePenalties: 0, onlineGames: 0, winStreak: 0, bestWinStreak: 0,
};

export interface AchievementCtx {
  stats: ProfileStats;
  level: number;
  owned: number;
  dailyStreak: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  badge: string;
  gems: number;
  check: (c: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-game', name: 'Primera mano', desc: 'Juega tu primera partida', badge: '🎲', gems: 2, check: (c) => c.stats.games >= 1 },
  { id: 'first-win', name: '¡Coroné!', desc: 'Gana tu primera partida', badge: '🏆', gems: 5, check: (c) => c.stats.wins >= 1 },
  { id: 'wins-10', name: 'Rey del barrio', desc: 'Gana 10 partidas', badge: '👑', gems: 10, check: (c) => c.stats.wins >= 10 },
  { id: 'wins-50', name: 'Leyenda viva', desc: 'Gana 50 partidas', badge: '🌟', gems: 30, check: (c) => c.stats.wins >= 50 },
  { id: 'cap-10', name: 'Cazador', desc: 'Captura 10 fichas', badge: '💥', gems: 3, check: (c) => c.stats.captures >= 10 },
  { id: 'cap-100', name: 'El terror de la cárcel', desc: 'Captura 100 fichas', badge: '🚔', gems: 20, check: (c) => c.stats.captures >= 100 },
  { id: 'soplo-1', name: '¡Lo soplé!', desc: 'Sopla a un rival', badge: '🌬️', gems: 3, check: (c) => c.stats.soplos >= 1 },
  { id: 'soplo-10', name: 'Pulmones de acero', desc: 'Sopla 10 veces', badge: '🎺', gems: 10, check: (c) => c.stats.soplos >= 10 },
  { id: 'triple', name: '¡Uy, qué boleta!', desc: 'Saca tres pares seguidos', badge: '🚨', gems: 3, check: (c) => c.stats.triplePenalties >= 1 },
  { id: 'streak-3', name: 'En racha', desc: 'Gana 3 partidas seguidas', badge: '🔥', gems: 10, check: (c) => c.stats.bestWinStreak >= 3 },
  { id: 'level-5', name: 'Parcero', desc: 'Llega al nivel 5', badge: '⭐', gems: 5, check: (c) => c.level >= 5 },
  { id: 'level-10', name: 'Berraco', desc: 'Llega al nivel 10', badge: '💪', gems: 15, check: (c) => c.level >= 10 },
  { id: 'collector', name: 'Coleccionista', desc: 'Ten 8 objetos de la tienda', badge: '🛍️', gems: 10, check: (c) => c.owned >= 8 },
  { id: 'daily-7', name: 'Juiciosito', desc: 'Reclama 7 días seguidos', badge: '📅', gems: 10, check: (c) => c.dailyStreak >= 7 },
  { id: 'online-1', name: 'Conectado', desc: 'Juega una partida online', badge: '🌐', gems: 5, check: (c) => c.stats.onlineGames >= 1 },
];

export function newlyUnlocked(ctx: AchievementCtx, unlocked: Record<string, number>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.check(ctx));
}
