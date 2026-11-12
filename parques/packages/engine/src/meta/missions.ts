/** Misiones diarias y semanales. Funciones puras. */
import type { MatchSummary } from './rewards';

export type MissionMetric =
  | 'games' | 'wins' | 'captures' | 'crowned' | 'soplos' | 'pairs' | 'quick' | 'teams' | 'online' | 'podiums'
  | 'bigTable' | 'six' | 'perfect' | 'duel' | 'tournament';

export interface MissionDef {
  id: string;
  text: string;
  metric: MissionMetric;
  goal: number;
  coins: number;
  gems: number;
}

export interface MissionState {
  id: string;
  progress: number;
  claimed: boolean;
}

/** Misiones por día y por semana que se muestran. */
export const DAILY_COUNT = 4;
export const WEEKLY_COUNT = 4;

export const DAILY_POOL: MissionDef[] = [
  { id: 'd-games3', text: 'Juega 3 partidas', metric: 'games', goal: 3, coins: 150, gems: 0 },
  { id: 'd-games5', text: 'Juega 5 partidas', metric: 'games', goal: 5, coins: 250, gems: 1 },
  { id: 'd-win1', text: 'Gana 1 partida', metric: 'wins', goal: 1, coins: 200, gems: 0 },
  { id: 'd-win3', text: 'Gana 3 partidas', metric: 'wins', goal: 3, coins: 500, gems: 2 },
  { id: 'd-cap5', text: 'Captura 5 fichas', metric: 'captures', goal: 5, coins: 200, gems: 0 },
  { id: 'd-cap10', text: 'Captura 10 fichas', metric: 'captures', goal: 10, coins: 350, gems: 1 },
  { id: 'd-crown6', text: 'Corona 6 fichas', metric: 'crowned', goal: 6, coins: 180, gems: 0 },
  { id: 'd-crown12', text: 'Corona 12 fichas', metric: 'crowned', goal: 12, coins: 320, gems: 1 },
  { id: 'd-soplo1', text: 'Sopla a un rival', metric: 'soplos', goal: 1, coins: 150, gems: 0 },
  { id: 'd-soplo3', text: 'Sopla 3 veces', metric: 'soplos', goal: 3, coins: 300, gems: 1 },
  { id: 'd-pairs8', text: 'Saca 8 pares', metric: 'pairs', goal: 8, coins: 150, gems: 0 },
  { id: 'd-pairs15', text: 'Saca 15 pares', metric: 'pairs', goal: 15, coins: 280, gems: 1 },
  { id: 'd-quick1', text: 'Juega 1 partida rápida', metric: 'quick', goal: 1, coins: 120, gems: 0 },
  { id: 'd-podium2', text: 'Queda en el podio 2 veces', metric: 'podiums', goal: 2, coins: 200, gems: 0 },
  { id: 'd-online1', text: 'Juega 1 partida online', metric: 'online', goal: 1, coins: 200, gems: 1 },
  { id: 'd-big1', text: 'Juega en la mesa Ciudad o más alta', metric: 'bigTable', goal: 1, coins: 300, gems: 1 },
  { id: 'd-six1', text: 'Juega una partida de 6 jugadores', metric: 'six', goal: 1, coins: 200, gems: 0 },
  { id: 'd-perfect1', text: 'Gana sin que te capturen', metric: 'perfect', goal: 1, coins: 400, gems: 2 },
  { id: 'd-duel1', text: 'Gana un duelo de 2 jugadores', metric: 'duel', goal: 1, coins: 250, gems: 1 },
  { id: 'd-team1', text: 'Juega una partida en parejas', metric: 'teams', goal: 1, coins: 180, gems: 0 },
  { id: 'd-tour1', text: 'Juega una partida de torneo', metric: 'tournament', goal: 1, coins: 300, gems: 1 },
];

export const WEEKLY_POOL: MissionDef[] = [
  { id: 'w-win2', text: 'Gana 2 partidas', metric: 'wins', goal: 2, coins: 500, gems: 0 },
  { id: 'w-win5', text: 'Gana 5 partidas', metric: 'wins', goal: 5, coins: 1200, gems: 3 },
  { id: 'w-win12', text: 'Gana 12 partidas', metric: 'wins', goal: 12, coins: 3000, gems: 8 },
  { id: 'w-cap30', text: 'Captura 30 fichas', metric: 'captures', goal: 30, coins: 1000, gems: 2 },
  { id: 'w-cap60', text: 'Captura 60 fichas', metric: 'captures', goal: 60, coins: 2000, gems: 5 },
  { id: 'w-games15', text: 'Juega 15 partidas', metric: 'games', goal: 15, coins: 900, gems: 2 },
  { id: 'w-games30', text: 'Juega 30 partidas', metric: 'games', goal: 30, coins: 2000, gems: 5 },
  { id: 'w-soplo5', text: 'Sopla 5 veces', metric: 'soplos', goal: 5, coins: 700, gems: 2 },
  { id: 'w-online3', text: 'Juega 3 partidas online', metric: 'online', goal: 3, coins: 800, gems: 2 },
  { id: 'w-online10', text: 'Juega 10 partidas online', metric: 'online', goal: 10, coins: 2200, gems: 6 },
  { id: 'w-crown40', text: 'Corona 40 fichas', metric: 'crowned', goal: 40, coins: 1100, gems: 2 },
  { id: 'w-big5', text: 'Juega 5 partidas en mesas de Ciudad o más', metric: 'bigTable', goal: 5, coins: 1500, gems: 4 },
  { id: 'w-perfect3', text: 'Gana 3 partidas sin que te capturen', metric: 'perfect', goal: 3, coins: 2500, gems: 8 },
  { id: 'w-podium8', text: 'Queda en el podio 8 veces', metric: 'podiums', goal: 8, coins: 1300, gems: 3 },
  { id: 'w-tour5', text: 'Juega 5 partidas de torneo', metric: 'tournament', goal: 5, coins: 1800, gems: 5 },
  { id: 'w-quick5', text: 'Juega 5 partidas rápidas', metric: 'quick', goal: 5, coins: 900, gems: 2 },
];

/** Elección determinista de misiones a partir de una clave (día o semana). */
export function pickMissions(pool: MissionDef[], key: string, n: number): MissionState[] {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const ids = pool.map((m) => m.id);
  const out: string[] = [];
  while (out.length < Math.min(n, ids.length)) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const id = ids[h % ids.length]!;
    if (!out.includes(id)) out.push(id);
  }
  return out.map((id) => ({ id, progress: 0, claimed: false }));
}

export function missionDef(id: string): MissionDef {
  return [...DAILY_POOL, ...WEEKLY_POOL].find((m) => m.id === id)!;
}

export function metricValue(metric: MissionMetric, m: MatchSummary): number {
  switch (metric) {
    case 'games': return 1;
    case 'wins': return m.won ? 1 : 0;
    case 'captures': return m.captures;
    case 'crowned': return m.crowned;
    case 'soplos': return m.soplos;
    case 'pairs': return m.pairs;
    case 'quick': return m.mode === 'quick' ? 1 : 0;
    case 'teams': return m.mode === 'teams' ? 1 : 0;
    case 'online': return m.mode === 'online' ? 1 : 0;
    case 'podiums': return m.place >= 0 && m.place <= 2 && m.players > 2 ? 1 : m.place === 0 ? 1 : 0;
    case 'bigTable': return m.entry >= 1000 ? 1 : 0;
    case 'six': return m.players === 6 ? 1 : 0;
    case 'perfect': return m.won && m.captured === 0 ? 1 : 0;
    case 'duel': return m.won && m.players === 2 ? 1 : 0;
    case 'tournament': return m.tournament ? 1 : 0;
  }
}

/** Suma el progreso de una partida. Devuelve las misiones recién completadas. */
export function advanceMissions(list: MissionState[], m: MatchSummary): { list: MissionState[]; completed: MissionDef[] } {
  const completed: MissionDef[] = [];
  const next = list.map((s) => {
    const def = missionDef(s.id);
    if (!def || s.progress >= def.goal) return s;
    const progress = Math.min(def.goal, s.progress + metricValue(def.metric, m));
    if (progress >= def.goal) completed.push(def);
    return { ...s, progress };
  });
  return { list: next, completed };
}
