/**
 * Protocolo online (compartido por servidor y cliente).
 * El servidor es la autoridad: guarda la semilla de los dados y valida cada jugada.
 */
import type { Action, GameEvent, GameState, HouseRules } from './types';

export interface NetSeat {
  side: number;
  name: string;
  avatar: string;
  kind: 'human' | 'bot';
  /** Id público del jugador humano (null para bots). */
  playerId: string | null;
  connected: boolean;
  /** Era humano y la IA lo reemplazó al abandonar. */
  replaced: boolean;
}

export interface RoomInfo {
  roomId: string;
  code: string | null;
  hostId: string | null;
  seats: NetSeat[];
  rules: Partial<HouseRules>;
  status: 'waiting' | 'playing' | 'over';
  kind: 'quick' | 'private';
}

export interface Deadlines {
  /** Milisegundos restantes del turno del jugador humano en turno (null = sin límite / bot). */
  turnMs: number | null;
  /** Milisegundos restantes de la ventana para soplar. */
  soploMs: number | null;
}

export interface UpdateMsg {
  state: GameState;
  events: GameEvent[];
  deadlines: Deadlines;
}

export interface Hello {
  playerId: string;
  name: string;
  avatar: string;
  country: string;
}

export interface ClientToServer {
  hello: (h: Hello, ack: (r: { ok: true }) => void) => void;
  quick_match: (ack: (r: { ok: boolean; error?: string }) => void) => void;
  cancel_match: () => void;
  create_private: (opts: { seats: number; rules: Partial<HouseRules> }, ack: (r: { ok: boolean; code?: string; error?: string }) => void) => void;
  join_private: (code: string, ack: (r: { ok: boolean; error?: string }) => void) => void;
  start_private: (ack: (r: { ok: boolean; error?: string }) => void) => void;
  action: (a: Action, ack?: (r: { ok: boolean; error?: string }) => void) => void;
  chat: (text: string) => void;
  leave: () => void;
  resume: (roomId: string, ack: (r: { ok: boolean }) => void) => void;
  ranking: (q: { scope: 'global' | 'country' | 'friends'; country?: string; friends?: string[] }, ack: (rows: RankRow[]) => void) => void;
  tournament: (ack: (t: TournamentInfo) => void) => void;
  tournament_claim: (ack: (r: { ok: boolean; coins?: number; gems?: number; place?: number; error?: string }) => void) => void;
}

export interface ServerToClient {
  room: (info: RoomInfo) => void;
  match_found: (info: RoomInfo & { mySeat: number }) => void;
  sync: (msg: UpdateMsg & { room: RoomInfo; mySeat: number }) => void;
  update: (msg: UpdateMsg) => void;
  chat: (msg: { seat: number; text: string }) => void;
  notice: (msg: { text: string }) => void;
  searching: (msg: { waiting: number; startsInMs: number }) => void;
}

export interface RankRow {
  playerId: string;
  name: string;
  avatar: string;
  country: string;
  rating: number;
  wins: number;
  games: number;
}

export interface TournamentInfo {
  weekKey: string;
  endsAt: number;
  rows: { playerId: string; name: string; avatar: string; points: number; games: number }[];
  prizes: { place: number; coins: number; gems: number }[];
}

/** Puntos de torneo y trofeos (rating) según el puesto. */
export const TOURNAMENT_POINTS = [10, 6, 3, 1, 1, 1];
export const RATING_DELTA = [25, 10, -5, -12, -12, -12];

/** Copia del estado sin la semilla de los dados (lo que ve el cliente). */
export function sanitizeState(state: GameState): GameState {
  return { ...state, rng: 0 };
}

/** Clave de semana ISO (p. ej. "2026-W46") para torneos semanales. */
export function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Fin (lunes 00:00 UTC siguiente) de la semana de `date`. */
export function weekEnd(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + (8 - day));
  return d.getTime();
}
