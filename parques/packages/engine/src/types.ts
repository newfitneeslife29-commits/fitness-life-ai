/**
 * Tipos del motor de Parqués. Todo aquí es serializable (JSON) para poder
 * enviarlo por red y guardarlo en localStorage sin transformaciones.
 */

export type Color = 'amarillo' | 'azul' | 'rojo' | 'verde' | 'morado' | 'naranja';

export const COLORS_4: readonly Color[] = ['amarillo', 'azul', 'rojo', 'verde'];
export const COLORS_6: readonly Color[] = ['amarillo', 'azul', 'rojo', 'verde', 'morado', 'naranja'];

/** Valores especiales de posición de una ficha. */
export const JAIL = -1;
/**
 * Posición = progreso desde la salida del jugador.
 *   -1            → cárcel
 *   0..ENTRY      → recorrido común (0 = salida, ENTRY = casilla de entrada al pasillo)
 *   ENTRY+1..HOME-1 → pasillo propio (no interactúa con nadie)
 *   HOME          → cielo (coronada)
 */
export type Position = number;

export interface HouseRules {
  /** Permite "soplar" a quien no capturó pudiendo hacerlo. */
  soplar: boolean;
  /** Tres pares seguidos → la ficha más adelantada va a la cárcel y termina el turno. */
  triplePairPenalty: boolean;
  /** Intentos para sacar par cuando no hay fichas en juego (1–3). */
  jailAttempts: number;
  /** Con un par salen todas las fichas de la cárcel (true) o solo `exitCount`. */
  exitAll: boolean;
  /** Fichas que salen con un par cuando `exitAll` es false. */
  exitCount: number;
  /** Partida por parejas (compañeros en lados opuestos). */
  teams: boolean;
  /** Fichas por jugador (4 normal, 2 en Modo Rápido). */
  piecesPerPlayer: number;
}

export const DEFAULT_RULES: HouseRules = {
  soplar: true,
  triplePairPenalty: true,
  jailAttempts: 3,
  exitAll: true,
  exitCount: 2,
  teams: false,
  piecesPerPlayer: 4,
};

export interface PlayerSetup {
  name: string;
  /** Lado del tablero (0..sides-1). Define color, salida y pasillo. */
  side: number;
  isBot?: boolean;
}

export interface GameConfig {
  /** 4 o 6 lados. */
  sides: 4 | 6;
  players: PlayerSetup[];
  rules?: Partial<HouseRules>;
  /** Semilla para el generador de dados. */
  seed?: number;
}

export interface PlayerState {
  name: string;
  side: number;
  color: Color;
  isBot: boolean;
  /** Equipo (solo modo parejas), si no `null`. */
  team: number | null;
  pieces: Position[];
  /** Ya coronó todas sus fichas. */
  finished: boolean;
  stats: PlayerStats;
}

export interface PlayerStats {
  captures: number;
  captured: number;
  crowned: number;
  pairs: number;
  soplosHechos: number;
  soplosRecibidos: number;
  tripleParCastigos: number;
}

export interface PieceRef {
  owner: number;
  index: number;
}

export type Phase = 'roll' | 'move' | 'over';

export interface PendingSoplo {
  /** Jugador que no capturó pudiendo hacerlo. */
  offender: number;
  /** Ficha que podía capturar (la que se va a la cárcel si lo soplan). */
  piece: PieceRef;
}

export interface GameState {
  sides: 4 | 6;
  rules: HouseRules;
  players: PlayerState[];
  /** Índice (en `players`) del jugador en turno. */
  current: number;
  phase: Phase;
  dice: [number, number] | null;
  diceUsed: [boolean, boolean];
  /** Pares seguidos en el turno actual. */
  pairStreak: number;
  /** Tiros fallidos para salir de la cárcel en este turno (solo sin fichas en juego). */
  jailRollsUsed: number;
  /** Estado del RNG. */
  rng: number;
  /** Ficha(s) que podían capturar en esta tirada (para soplar). */
  missedCapture: PieceRef | null;
  /** Hubo al menos una captura en esta tirada. */
  capturedThisRoll: boolean;
  pendingSoplo: PendingSoplo | null;
  /** Orden de llegada (índices de jugadores). 1º, 2º, ... */
  ranking: number[];
  turn: number;
  /** Contador de acciones aplicadas (útil para sincronizar online). */
  version: number;
}

export type Move =
  | { type: 'exit' }
  | { type: 'step'; piece: PieceRef; die: 0 | 1 }
  | { type: 'sum'; piece: PieceRef };

export type Action =
  | { type: 'ROLL'; player: number; dice?: [number, number] }
  | { type: 'MOVE'; player: number; move: Move }
  | { type: 'SOPLAR'; player: number }
  | { type: 'DISMISS_SOPLO' }
  | { type: 'TIME_UP' };

export type GameEvent =
  | { type: 'ROLLED'; player: number; dice: [number, number]; pair: boolean; pairStreak: number }
  | { type: 'JAIL_ATTEMPT_FAILED'; player: number; attemptsLeft: number }
  | { type: 'EXITED_JAIL'; player: number; pieces: PieceRef[] }
  | { type: 'PIECE_MOVED'; piece: PieceRef; from: Position; to: Position; path: Position[] }
  | { type: 'CAPTURED'; by: PieceRef; victims: PieceRef[] }
  | { type: 'CROWNED'; piece: PieceRef }
  | { type: 'TRIPLE_PAIR'; player: number; piece: PieceRef | null }
  | { type: 'DICE_FORFEITED'; player: number; dice: number[] }
  | { type: 'SOPLO_AVAILABLE'; offender: number; piece: PieceRef }
  | { type: 'SOPLADO'; by: number; offender: number; piece: PieceRef }
  | { type: 'SOPLO_EXPIRED' }
  | { type: 'EXTRA_TURN'; player: number }
  | { type: 'TURN_CHANGED'; player: number }
  | { type: 'PLAYER_FINISHED'; player: number; place: number }
  | { type: 'GAME_OVER'; ranking: number[] };

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: string };
