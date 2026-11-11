/**
 * Store de la partida (Zustand).
 *  - `game` es la verdad (estado del motor).
 *  - `view` son las posiciones que se DIBUJAN; se actualizan paso a paso
 *    mientras se reproducen los eventos para animar.
 *  - También maneja bots, temporizador de turno, ventana de soplo y efectos.
 */
import { create } from 'zustand';
import {
  applyAction,
  autoAction,
  canSoplar,
  createGame,
  getLegalMoves,
  shouldSoplar,
  squareOf,
} from '@parques/engine';
import type { Action, AiLevel, GameEvent, GameState, HouseRules, Move, PieceRef } from '@parques/engine';
import { piecePoint, trackCell, type Pt } from '../game/boardLayout';
import { BOT_LINES, pick } from '../game/phrases';

export interface SeatConfig {
  name: string;
  side: number;
  kind: 'human' | 'bot';
  level: AiLevel;
  avatar: string;
}

export interface MatchConfig {
  sides: 4 | 6;
  seats: SeatConfig[];
  rules: Partial<HouseRules>;
  /** Segundos por decisión de un humano (0 = sin límite). */
  turnSeconds: number;
  /** Límite de la partida en segundos (Modo Rápido), 0 = sin límite. */
  timeLimitSec: number;
  mode: 'ai' | 'local' | 'teams' | 'quick';
}

export type FxKind = 'burst' | 'crown' | 'jail' | 'exit';
export interface Fx {
  id: number;
  kind: FxKind;
  at: Pt;
  color: string;
}

export type BannerKind = 'triple' | 'soplo' | 'pair' | 'capture' | 'finish' | 'info';
export interface Banner {
  id: number;
  kind: BannerKind;
  title: string;
  sub?: string;
}

export interface Bubble {
  id: number;
  text: string;
}

export const SOPLO_WINDOW_MS = 4500;

const BASE = {
  roll: 650,
  step: 150,
  exit: 420,
  capture: 650,
  crown: 750,
  triple: 2100,
  soplo: 1500,
  turn: 250,
  forfeit: 500,
};

function readSpeed(): number {
  if (typeof location === 'undefined') return 1;
  const v = Number(new URLSearchParams(location.search).get('speed'));
  return Number.isFinite(v) && v > 0 ? v : 1;
}

interface GameStore {
  config: MatchConfig | null;
  game: GameState | null;
  view: number[][];
  shownDice: [number, number] | null;
  rolling: boolean;
  busy: boolean;
  selected: PieceRef | null;
  fx: Fx[];
  banner: Banner | null;
  bubbles: Record<number, Bubble>;
  turnDeadline: number | null;
  soploDeadline: number | null;
  matchDeadline: number | null;
  /** Lado que se dibuja abajo a la izquierda. */
  viewSide: number;
  speed: number;
  paused: boolean;

  start: (config: MatchConfig) => void;
  rematch: () => void;
  quit: () => void;
  dispatch: (action: Action) => boolean;
  humanRoll: () => void;
  humanMove: (move: Move) => void;
  humanSoplar: () => void;
  select: (ref: PieceRef | null) => void;
  say: (player: number, text: string) => void;
  setPaused: (p: boolean) => void;
}

let uid = 1;
let timers: ReturnType<typeof setTimeout>[] = [];
let queue: Promise<void> = Promise.resolve();
/** Se incrementa al empezar/salir de una partida para invalidar animaciones pendientes. */
let epoch = 0;

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}
function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms));
}

const colorVar = (state: GameState, owner: number) => `var(--${state.players[owner]!.color})`;

export const useGame = create<GameStore>((set, get) => {
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms / get().speed));

  function isHuman(player: number): boolean {
    return get().config?.seats.find((s) => s.side === get().game?.players[player]?.side)?.kind === 'human';
  }
  function seatOf(player: number): SeatConfig | undefined {
    const g = get().game;
    return get().config?.seats.find((s) => s.side === g?.players[player]?.side);
  }

  function pushFx(kind: FxKind, at: Pt, color: string, ms = 900) {
    const fx: Fx = { id: uid++, kind, at, color };
    set((s) => ({ fx: [...s.fx, fx] }));
    setTimeout(() => set((s) => ({ fx: s.fx.filter((f) => f.id !== fx.id) })), ms / get().speed + 200);
  }

  function showBanner(kind: BannerKind, title: string, sub: string | undefined, ms: number) {
    const b: Banner = { id: uid++, kind, title, sub };
    set({ banner: b });
    setTimeout(() => {
      if (get().banner?.id === b.id) set({ banner: null });
    }, ms / get().speed);
  }

  function botSay(player: number, lines: readonly string[], chance = 0.5) {
    if (isHuman(player) || Math.random() > chance) return;
    get().say(player, pick(lines));
  }

  function setPiece(view: number[][], ref: PieceRef, pos: number): number[][] {
    const next = view.map((l) => [...l]);
    next[ref.owner]![ref.index] = pos;
    return next;
  }

  function pointOf(state: GameState, ref: PieceRef, pos: number): Pt {
    return piecePoint(state.sides, state.players[ref.owner]!.side, pos, ref.index);
  }

  async function animate(events: GameEvent[], final: GameState, myEpoch: number) {
    const alive = () => myEpoch === epoch;
    for (const e of events) {
      if (!alive()) return;
      const g = get().game ?? final;
      switch (e.type) {
        case 'ROLLED': {
          set({ rolling: true, shownDice: get().shownDice ?? e.dice });
          await sleep(BASE.roll);
          set({ rolling: false, shownDice: e.dice });
          if (e.pair && e.pairStreak === 2 && final.rules.triplePairPenalty) {
            showBanner('pair', '¡Dos pares!', 'Pilas pues: un par más y a la cárcel', 1300);
            botSay((e.player + 1) % final.players.length, ['¡Pilas pues!', '¡Uy, se viene!'], 0.4);
          }
          break;
        }
        case 'JAIL_ATTEMPT_FAILED':
          await sleep(250);
          break;
        case 'EXITED_JAIL': {
          let view = get().view;
          for (const p of e.pieces) view = setPiece(view, p, 0);
          set({ view });
          pushFx('exit', pointOf(final, e.pieces[0]!, 0), colorVar(final, e.player));
          await sleep(BASE.exit);
          break;
        }
        case 'PIECE_MOVED': {
          for (const pos of e.path) {
            if (!alive()) return;
            set({ view: setPiece(get().view, e.piece, pos) });
            await sleep(BASE.step);
          }
          break;
        }
        case 'CAPTURED': {
          const pos = get().view[e.by.owner]![e.by.index]!;
          const sq = squareOf(g.sides, g.players[e.by.owner]!.side, pos);
          const at = sq === null ? pointOf(final, e.by, pos) : trackCell(g.sides, sq).center;
          pushFx('burst', at, colorVar(final, e.by.owner), 1000);
          showBanner('capture', '¡Captura!', `${g.players[e.by.owner]!.name} manda a la cárcel a ${g.players[e.victims[0]!.owner]!.name}`, 1100);
          navigator.vibrate?.(60);
          await sleep(BASE.capture * 0.45);
          let view = get().view;
          for (const v of e.victims) view = setPiece(view, v, -1);
          set({ view });
          botSay(e.by.owner, BOT_LINES.capture, 0.45);
          botSay(e.victims[0]!.owner, BOT_LINES.captured, 0.35);
          await sleep(BASE.capture * 0.55);
          break;
        }
        case 'CROWNED': {
          pushFx('crown', pointOf(final, e.piece, final.players[e.piece.owner]!.pieces[e.piece.index]!), 'var(--gold)', 1200);
          botSay(e.piece.owner, BOT_LINES.crown, 0.4);
          await sleep(BASE.crown);
          break;
        }
        case 'TRIPLE_PAIR': {
          showBanner('triple', '¡TRES PARES!', e.piece ? '¡Esa ficha se va pa\' la cárcel!' : 'Se acabó el turno', BASE.triple);
          navigator.vibrate?.([80, 60, 160]);
          await sleep(BASE.triple * 0.5);
          if (e.piece) {
            const pos = get().view[e.piece.owner]![e.piece.index]!;
            pushFx('jail', pointOf(final, e.piece, pos), 'var(--rojo)', 900);
            set({ view: setPiece(get().view, e.piece, -1) });
          }
          await sleep(BASE.triple * 0.5);
          break;
        }
        case 'SOPLADO': {
          const pos = get().view[e.piece.owner]![e.piece.index]!;
          pushFx('jail', pointOf(final, e.piece, pos), 'var(--azul)', 900);
          showBanner('soplo', '¡Lo soplé!', `${g.players[e.by]!.name} sopló a ${g.players[e.offender]!.name}`, BASE.soplo);
          set({ view: setPiece(get().view, e.piece, -1) });
          botSay(e.by, BOT_LINES.soplo, 0.7);
          await sleep(BASE.soplo * 0.6);
          break;
        }
        case 'DICE_FORFEITED':
          await sleep(BASE.forfeit);
          break;
        case 'PLAYER_FINISHED':
          showBanner('finish', `¡${g.players[e.player]!.name} coronó!`, `Puesto ${e.place}`, 1400);
          await sleep(500);
          break;
        case 'TURN_CHANGED':
          await sleep(BASE.turn);
          break;
        default:
          break;
      }
    }
  }

  /** Después de cada acción: bots, temporizadores, soplo y fin de partida. */
  function scheduleNext() {
    clearTimers();
    const { game, config, paused } = get();
    if (!game || !config || paused) return;
    const speed = get().speed;

    if (game.phase === 'over') {
      set({ turnDeadline: null, soploDeadline: null, matchDeadline: null });
      return;
    }

    // Ventana para soplar.
    let soploOpen = false;
    if (game.pendingSoplo) {
      soploOpen = true;
      const deadline = get().soploDeadline ?? Date.now() + SOPLO_WINDOW_MS / speed;
      set({ soploDeadline: deadline });
      later(() => get().dispatch({ type: 'DISMISS_SOPLO' }), Math.max(0, deadline - Date.now()));
      // Bots que pueden soplar reaccionan con un retraso según su nivel.
      game.players.forEach((_, i) => {
        const seat = seatOf(i);
        if (!seat || seat.kind !== 'bot' || canSoplar(game, i) !== null) return;
        const reaction = seat.level === 'expert' ? 900 : seat.level === 'normal' ? 1700 : 2800;
        later(() => {
          const g = get().game;
          if (g?.pendingSoplo && shouldSoplar(g, i, seat.level)) get().dispatch({ type: 'SOPLAR', player: i });
        }, (reaction + Math.random() * 900) / speed);
      });
    } else if (get().soploDeadline) {
      set({ soploDeadline: null });
    }

    const current = game.current;
    const seat = seatOf(current);
    if (!seat) return;

    if (seat.kind === 'bot') {
      set({ turnDeadline: null });
      if (soploOpen) return; // espera a que se cierre la ventana de soplo
      const delay = game.phase === 'roll' ? 650 : 450;
      later(() => {
        const g = get().game;
        if (!g || g.current !== current) return;
        const a = autoAction(g, seat.level);
        if (a) get().dispatch(a);
      }, delay / speed);
      return;
    }

    // Humano: temporizador de turno; si se acaba, la IA juega por él.
    if (config.turnSeconds > 0) {
      const ms = (config.turnSeconds * 1000) / speed;
      set({ turnDeadline: Date.now() + ms });
      later(() => {
        const g = get().game;
        if (!g || g.current !== current || get().busy) return;
        const a = autoAction(g, 'normal');
        if (a) get().dispatch(a);
      }, ms);
    }
    // Auto-selección cuando solo hay una ficha que se puede mover.
    autoSelect();
  }

  function autoSelect() {
    const { game } = get();
    if (!game || game.phase !== 'move') return;
    const pieces = new Map<string, PieceRef>();
    let hasExit = false;
    for (const m of legalMovesCache(game)) {
      if (m.type === 'exit') hasExit = true;
      else pieces.set(`${m.piece.owner}-${m.piece.index}`, m.piece);
    }
    if (pieces.size === 1 && !hasExit) set({ selected: [...pieces.values()][0]! });
  }

  return {
    config: null,
    game: null,
    view: [],
    shownDice: null,
    rolling: false,
    busy: false,
    selected: null,
    fx: [],
    banner: null,
    bubbles: {},
    turnDeadline: null,
    soploDeadline: null,
    matchDeadline: null,
    viewSide: 0,
    speed: readSpeed(),
    paused: false,

    start(config) {
      epoch++;
      clearTimers();
      queue = Promise.resolve();
      const game = createGame({
        sides: config.sides,
        rules: config.rules,
        players: config.seats.map((s) => ({ name: s.name, side: s.side, isBot: s.kind === 'bot' })),
      });
      const firstHuman = config.seats.filter((s) => s.kind === 'human').sort((a, b) => a.side - b.side)[0];
      const matchDeadline = config.timeLimitSec > 0 ? Date.now() + (config.timeLimitSec * 1000) / get().speed : null;
      set({
        config,
        game,
        view: game.players.map((p) => [...p.pieces]),
        shownDice: null,
        rolling: false,
        busy: false,
        selected: null,
        fx: [],
        banner: null,
        bubbles: {},
        turnDeadline: null,
        soploDeadline: null,
        matchDeadline,
        viewSide: firstHuman?.side ?? 0,
        paused: false,
      });
      if (matchDeadline) {
        const myEpoch = epoch;
        setTimeout(() => {
          if (myEpoch === epoch && get().game?.phase !== 'over') get().dispatch({ type: 'TIME_UP' });
        }, matchDeadline - Date.now());
      }
      scheduleNext();
    },

    rematch() {
      const c = get().config;
      if (c) get().start(c);
    },

    quit() {
      epoch++;
      clearTimers();
      set({ game: null, config: null, busy: false, banner: null, fx: [], selected: null });
    },

    dispatch(action) {
      const game = get().game;
      if (!game) return false;
      // Las acciones de juego esperan a que termine la animación anterior; soplar no.
      if (get().busy && action.type !== 'SOPLAR' && action.type !== 'TIME_UP') return false;
      const r = applyAction(game, action);
      if (!r.ok) return false;
      clearTimers();
      const myEpoch = epoch;
      const prevSoplo = game.pendingSoplo;
      set({ game: r.state, busy: true, selected: null, turnDeadline: null });
      if (JSON.stringify(r.state.pendingSoplo) !== JSON.stringify(prevSoplo)) set({ soploDeadline: null });
      queue = queue.then(async () => {
        await animate(r.events, r.state, myEpoch);
        if (myEpoch !== epoch) return;
        const g = get().game!;
        set({ view: g.players.map((p) => [...p.pieces]), busy: false });
        scheduleNext();
      });
      return true;
    },

    humanRoll() {
      const g = get().game;
      if (g && g.phase === 'roll' && isHuman(g.current)) get().dispatch({ type: 'ROLL', player: g.current });
    },

    humanMove(move) {
      const g = get().game;
      if (g && g.phase === 'move' && isHuman(g.current)) get().dispatch({ type: 'MOVE', player: g.current, move });
    },

    humanSoplar() {
      const g = get().game;
      if (!g?.pendingSoplo) return;
      // Sopla el humano elegible más cercano en orden de turno después del infractor.
      const n = g.players.length;
      for (let k = 1; k < n; k++) {
        const i = (g.pendingSoplo.offender + k) % n;
        if (isHuman(i) && canSoplar(g, i) === null) {
          get().dispatch({ type: 'SOPLAR', player: i });
          return;
        }
      }
    },

    select(ref) {
      set({ selected: ref });
    },

    say(player, text) {
      const b = { id: uid++, text };
      set((s) => ({ bubbles: { ...s.bubbles, [player]: b } }));
      setTimeout(() => {
        if (get().bubbles[player]?.id === b.id) {
          set((s) => {
            const next = { ...s.bubbles };
            delete next[player];
            return { bubbles: next };
          });
        }
      }, 2600);
    },

    setPaused(p) {
      set({ paused: p });
      if (p) clearTimers();
      else scheduleNext();
    },
  };
});

// Pequeña caché para no recalcular jugadas legales en cada render.
let cacheKey: GameState | null = null;
let cacheVal: Move[] = [];
export function legalMovesCache(state: GameState): Move[] {
  if (cacheKey !== state) {
    cacheKey = state;
    cacheVal = getLegalMoves(state);
  }
  return cacheVal;
}

export function humanSeat(config: MatchConfig | null, state: GameState | null, player: number): boolean {
  if (!config || !state) return false;
  return config.seats.find((s) => s.side === state.players[player]?.side)?.kind === 'human';
}
