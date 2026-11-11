/** Misiones diarias y semanales. Funciones puras. */
import type { MatchSummary } from './economy';

export type MissionMetric = 'games' | 'wins' | 'captures' | 'crowned' | 'soplos' | 'pairs' | 'quick' | 'teams' | 'online' | 'podiums';

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

export const DAILY_POOL: MissionDef[] = [
  { id: 'd-games3', text: 'Juega 3 partidas', metric: 'games', goal: 3, coins: 150, gems: 0 },
  { id: 'd-win1', text: 'Gana 1 partida', metric: 'wins', goal: 1, coins: 200, gems: 1 },
  { id: 'd-cap5', text: 'Captura 5 fichas', metric: 'captures', goal: 5, coins: 200, gems: 0 },
  { id: 'd-crown6', text: 'Corona 6 fichas', metric: 'crowned', goal: 6, coins: 180, gems: 0 },
  { id: 'd-soplo1', text: 'Sopla a un rival', metric: 'soplos', goal: 1, coins: 150, gems: 1 },
  { id: 'd-pairs8', text: 'Saca 8 pares', metric: 'pairs', goal: 8, coins: 150, gems: 0 },
  { id: 'd-quick1', text: 'Juega 1 partida rápida', metric: 'quick', goal: 1, coins: 120, gems: 0 },
  { id: 'd-podium2', text: 'Queda en el podio 2 veces', metric: 'podiums', goal: 2, coins: 200, gems: 0 },
];

export const WEEKLY_POOL: MissionDef[] = [
  { id: 'w-win2', text: 'Gana 2 partidas', metric: 'wins', goal: 2, coins: 500, gems: 3 },
  { id: 'w-win5', text: 'Gana 5 partidas', metric: 'wins', goal: 5, coins: 1200, gems: 8 },
  { id: 'w-cap30', text: 'Captura 30 fichas', metric: 'captures', goal: 30, coins: 1000, gems: 5 },
  { id: 'w-games15', text: 'Juega 15 partidas', metric: 'games', goal: 15, coins: 900, gems: 5 },
  { id: 'w-soplo5', text: 'Sopla 5 veces', metric: 'soplos', goal: 5, coins: 700, gems: 5 },
  { id: 'w-online3', text: 'Juega 3 partidas online', metric: 'online', goal: 3, coins: 800, gems: 5 },
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
