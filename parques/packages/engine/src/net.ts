/**
 * Protocolo online (compartido por servidor y cliente).
 * El servidor es la autoridad: guarda la semilla de los dados y valida cada jugada.
 */
import type { Action, GameEvent, GameState, HouseRules } from './types';
import type { TableId } from './economy';
import type { MatchOutcome, Profile, Friend } from './meta/profile';
import type { ClubInfo, ClubMessage, ClubRow, DirectMessage, FlashBracket } from './meta/social';

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
  /** Mesa (define la entrada que paga cada jugador); null = práctica sin apuesta. */
  table: TableId | null;
  entry: number;
  sides: 4 | 6;
  mode: 'online' | 'ai' | 'quick' | 'teams';
  /** Fin del Modo Rápido (timestamp del servidor) o null. */
  endsAt: number | null;
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
  /** Nivel del jugador (para las salas con nivel mínimo). */
  level?: number;
}

/** Operaciones sobre la cuenta que ejecuta el servidor. */
export type ProfileOp =
  | { op: 'get' }
  | { op: 'identity'; patch: { name?: string; avatar?: string; photo?: string | null; country?: string } }
  | { op: 'buy'; itemId: string }
  | { op: 'equip'; itemId: string }
  | { op: 'daily' }
  | { op: 'spin' }
  | { op: 'mission'; id: string }
  | { op: 'pass'; tier: number; track: 'free' | 'premium' }
  | { op: 'friend_add'; friend: Friend }
  | { op: 'friend_remove'; id: string }
  | { op: 'emote'; emoteId: string }
  | { op: 'tournament_claim' }
  | { op: 'ad' }
  | { op: 'event_claim'; tier: number }
  | { op: 'deal'; itemId: string }
  | { op: 'chest'; chestId: string }
  | { op: 'exchange'; gems: number }
  | { op: 'cup_join'; tier: string }
  | { op: 'rank_friends_claim' }
  | { op: 'win_chest' }
  | { op: 'double_win'; matchId: string }
  | { op: 'save_streak' }
  | { op: 'league_claim' }
  | { op: 'block'; id: string }
  | { op: 'unblock'; id: string }
  | { op: 'referral'; code: string }
  | { op: 'club_chest'; tier: number };

/** Datos públicos de un jugador (búsqueda de amigos). */
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  country: string;
  level: number;
  rating: number;
  wins: number;
  games: number;
  online: boolean;
}

/** Copa (torneo con inscripción) de la semana. */
export interface CupInfo {
  tier: string;
  weekKey: string;
  endsAt: number;
  joined: boolean;
  myGames: number;
  players: number;
  pool: number;
  prizes: number[];
  rows: { playerId: string; name: string; avatar: string; points: number; games: number }[];
}

/** Salón de la fama: más torneos ganados y más monedas ganadas en torneos. */
export interface HallOfFame {
  wins: { playerId: string; name: string; avatar: string; value: number }[];
  coins: { playerId: string; name: string; avatar: string; value: number }[];
}

/** Premios del ranking de la semana pasada (ya entregados o por reclamar). */
export interface RankRewardsInfo {
  week: string;
  global: { place: number; coins: number; gems: number } | null;
  country: { place: number; coins: number; gems: number } | null;
  friends: { place: number; coins: number; gems: number; claimed: boolean } | null;
}

export interface ProfileOpResult {
  ok: boolean;
  error?: string;
  profile?: Profile;
  /** Datos extra según la operación (premio de la ruleta, día reclamado, etc.). */
  result?: Record<string, unknown>;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  id?: string;
  /** Solo al crear la cuenta: el secreto para volver a entrar (y código de recuperación). */
  token?: string;
  profile?: Profile;
}

/** Partida contra la máquina en el servidor. */
export interface PlayAiOpts {
  table: TableId | null;
  players: 2 | 3 | 4 | 6;
  teams?: boolean;
  quick?: boolean;
  level?: 'easy' | 'normal' | 'expert';
  rules?: Partial<HouseRules>;
  /** Jugar el reto del día (reglas y premio los pone el servidor). */
  challenge?: boolean;
  /** Jugar esa etapa del modo Historia. */
  story?: number;
}

export interface ClientToServer {
  auth: (a: { id?: string; token?: string }, ack: (r: AuthResult) => void) => void;
  profile_op: (op: ProfileOp, ack: (r: ProfileOpResult) => void) => void;
  play_ai: (o: PlayAiOpts, ack: (r: { ok: boolean; error?: string }) => void) => void;
  quick_match: (table: TableId, ack: (r: { ok: boolean; error?: string }) => void) => void;
  cancel_match: () => void;
  create_private: (opts: { seats: number; rules: Partial<HouseRules>; table?: TableId }, ack: (r: { ok: boolean; code?: string; error?: string }) => void) => void;
  join_private: (code: string, ack: (r: { ok: boolean; error?: string }) => void) => void;
  start_private: (ack: (r: { ok: boolean; error?: string }) => void) => void;
  action: (a: Action, ack?: (r: { ok: boolean; error?: string }) => void) => void;
  chat: (text: string) => void;
  leave: () => void;
  resume: (roomId: string, ack: (r: { ok: boolean }) => void) => void;
  ranking: (q: { scope: 'global' | 'country' | 'friends'; country?: string; friends?: string[] }, ack: (rows: RankRow[]) => void) => void;
  tournament: (ack: (t: TournamentInfo) => void) => void;
  cups: (ack: (cups: CupInfo[]) => void) => void;
  cup_match: (tier: string, ack: (r: { ok: boolean; error?: string }) => void) => void;
  league: (ack: (r: { rating: number; games: number; claimed: boolean }) => void) => void;
  hall_of_fame: (ack: (h: HallOfFame) => void) => void;
  rank_rewards: (ack: (r: RankRewardsInfo) => void) => void;
  find_player: (id: string, ack: (p: PublicPlayer | null) => void) => void;
  friends_online: (ids: string[], ack: (online: string[]) => void) => void;
  invite: (o: { to: string; code: string }, ack: (r: { ok: boolean; error?: string }) => void) => void;
  /** Iniciar sesión / vincular con Apple o Google (token de identidad del proveedor). */
  /** v1.2 social */
  report: (o: { playerId: string; reason: string }, ack: (r: { ok: boolean; error?: string }) => void) => void;
  dm: (o: { to: string; text: string }, ack: (r: { ok: boolean; error?: string; msg?: DirectMessage }) => void) => void;
  dm_history: (withId: string, ack: (msgs: DirectMessage[]) => void) => void;
  club_list: (q: string, ack: (rows: ClubRow[]) => void) => void;
  club_info: (ack: (c: ClubInfo | null) => void) => void;
  club_create: (o: { name: string; emoji: string }, ack: (r: { ok: boolean; error?: string; profile?: Profile }) => void) => void;
  club_join: (id: string, ack: (r: { ok: boolean; error?: string }) => void) => void;
  club_leave: (ack: (r: { ok: boolean; error?: string }) => void) => void;
  club_kick: (playerId: string, ack: (r: { ok: boolean; error?: string }) => void) => void;
  club_chat: (text: string, ack?: (r: { ok: boolean; error?: string }) => void) => void;
  flash_join: (ack: (r: { ok: boolean; error?: string }) => void) => void;
  flash_cancel: () => void;
  /** Mesa privada en parejas: el anfitrión y su amigo buscan otra pareja (o la máquina). */
  duo_match: (ack: (r: { ok: boolean; error?: string }) => void) => void;
  auth_provider: (o: { provider: 'apple' | 'google'; idToken: string; name?: string; link: boolean }, ack: (r: AuthResult & { linked?: boolean }) => void) => void;
}

export interface ServerToClient {
  room: (info: RoomInfo) => void;
  match_found: (info: RoomInfo & { mySeat: number }) => void;
  sync: (msg: UpdateMsg & { room: RoomInfo; mySeat: number }) => void;
  update: (msg: UpdateMsg) => void;
  chat: (msg: { seat: number; text: string }) => void;
  notice: (msg: { text: string }) => void;
  searching: (msg: { waiting: number; startsInMs: number }) => void;
  /** Perfil actualizado por el servidor. */
  profile: (p: Profile) => void;
  /** Premios de la partida que acaba de terminar. */
  match_result: (r: { outcome: MatchOutcome & { matchId?: string; special?: { kind: string; coins: number; gems: number; itemIds?: string[]; stage?: number } | null }; profile: Profile }) => void;
  /** Un amigo te invita a su mesa privada. */
  /** Mensaje directo de un amigo. */
  dm: (m: DirectMessage) => void;
  club_chat: (m: ClubMessage) => void;
  /** Estado del torneo relámpago (fila y llaves). */
  flash: (m: { waiting?: number; startsInMs?: number; bracket?: FlashBracket }) => void;
  invited: (m: { from: { id: string; name: string; avatar: string }; code: string }) => void;
}

/** Id del producto en Google Play / App Store (sin ':' ni '-'). */
export function storeProductId(productId: string): string {
  // Las tiendas solo aceptan letras sin tilde, números y "_" (p. ej. item:effect-pólvora → item_effect_polvora).
  return productId.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[:-]/g, '_').toLowerCase();
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
