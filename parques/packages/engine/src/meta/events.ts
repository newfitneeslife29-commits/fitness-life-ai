/**
 * Eventos cada 15 días: un reto con premios por niveles y un objeto exclusivo al final.
 * El evento activo se calcula con la fecha (todos los jugadores ven el mismo).
 */
import { metricValue, type MissionMetric } from './missions';
import type { MatchSummary } from './rewards';

export const EVENT_DAYS = 15;
/** Inicio del calendario de eventos (1 de enero de 2026, hora de Colombia). */
const EPOCH = Date.UTC(2026, 0, 1, 5);
const DAY = 86_400_000;

export interface EventTier {
  goal: number;
  coins: number;
  gems: number;
  /** Objeto exclusivo del evento (solo el último nivel). */
  itemId?: string;
}

export interface EventDef {
  id: string;
  name: string;
  emoji: string;
  /** Qué suma puntos. */
  metric: MissionMetric;
  /** Texto del reto con {n} = puntos por partida. */
  how: string;
  colors: [string, string];
  tiers: EventTier[];
}

const tiers = (unit: number, itemId: string): EventTier[] => [
  { goal: unit * 2, coins: 500, gems: 0 },
  { goal: unit * 5, coins: 1000, gems: 2 },
  { goal: unit * 10, coins: 2000, gems: 4 },
  { goal: unit * 18, coins: 3500, gems: 6 },
  { goal: unit * 30, coins: 6000, gems: 10 },
  { goal: unit * 45, coins: 10000, gems: 15 },
  { goal: unit * 60, coins: 15000, gems: 25, itemId },
];

export const EVENTS: EventDef[] = [
  { id: 'ev-capturas', name: 'Fiesta de capturas', emoji: '💥', metric: 'captures', how: 'Cada ficha que capturas suma 1 punto', colors: ['#ff4e50', '#f9d423'], tiers: tiers(5, 'pieces-fuego') },
  { id: 'ev-coronas', name: 'Maratón al cielo', emoji: '👑', metric: 'crowned', how: 'Cada ficha que coronas suma 1 punto', colors: ['#f7971e', '#ffd200'], tiers: tiers(8, 'board-cielo') },
  { id: 'ev-ganadores', name: 'Rey de la mesa', emoji: '🏆', metric: 'wins', how: 'Cada partida ganada suma 1 punto', colors: ['#8e2de2', '#4a00e0'], tiers: tiers(1, 'frame-rey') },
  { id: 'ev-pares', name: 'Pares locos', emoji: '🎯', metric: 'pairs', how: 'Cada par que sacas suma 1 punto', colors: ['#00c6ff', '#0072ff'], tiers: tiers(10, 'dice-locos') },
  { id: 'ev-online', name: 'Parche online', emoji: '🌐', metric: 'online', how: 'Cada partida online suma 1 punto', colors: ['#11998e', '#38ef7d'], tiers: tiers(1, 'effect-cumbia') },
  { id: 'ev-podio', name: 'Siempre en el podio', emoji: '🥇', metric: 'podiums', how: 'Cada vez que quedas en el podio suma 1 punto', colors: ['#fc5c7d', '#6a82fb'], tiers: tiers(2, 'frame-podio') },
  { id: 'ev-soplos', name: 'Sopla, sopla', emoji: '🌬️', metric: 'soplos', how: 'Cada soplo suma 1 punto', colors: ['#56ccf2', '#2f80ed'], tiers: tiers(1, 'pieces-viento') },
  { id: 'ev-partidas', name: 'Parqués sin parar', emoji: '🎲', metric: 'games', how: 'Cada partida suma 1 punto', colors: ['#ee0979', '#ff6a00'], tiers: tiers(2, 'board-tejo') },
];

export interface ActiveEvent {
  def: EventDef;
  /** Identificador del periodo (cambia cada 15 días). */
  period: string;
  startsAt: number;
  endsAt: number;
}

export function eventAt(now = Date.now()): ActiveEvent {
  const n = Math.max(0, Math.floor((now - EPOCH) / (EVENT_DAYS * DAY)));
  const def = EVENTS[n % EVENTS.length]!;
  const startsAt = EPOCH + n * EVENT_DAYS * DAY;
  return { def, period: `${def.id}#${n}`, startsAt, endsAt: startsAt + EVENT_DAYS * DAY };
}

export function eventPoints(def: EventDef, m: MatchSummary): number {
  return metricValue(def.metric, m);
}

export interface EventState {
  period: string;
  points: number;
  claimed: number[];
}
