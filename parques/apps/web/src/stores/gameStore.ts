/**
 * Store de la partida (Zustand).
 *  - `game` es la verdad (estado del motor; en online, la copia que manda el servidor).
 *  - `view` son las posiciones que se DIBUJAN; se actualizan paso a paso
 *    mientras se reproducen los eventos para animar.
 *  - En local maneja bots, temporizador de turno y ventana de soplo.
 *    En online todo eso lo hace el servidor (autoridad) y aquí solo se anima.
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
import type { Action, AiLevel, GameEvent, GameState, HouseRules, Move, PieceRef, UpdateMsg } from '@parques/engine';
import { piecePoint, trackCell, type Pt } from '../game/boardLayout';
import { BOT_LINES, pick } from '../game/phrases';
import { play, vibrate } from '../audio/audio';
import type { TableTier, MatchOutcome } from '@parques/engine';
import { useProfile } from './profileStore';
import { tr } from '../lib/i18n';

export interface SeatConfig {
  name: string;
  side: number;
  kind: 'human' | 'bot' | 'remote';
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
  mode: 'ai' | 'local' | 'teams' | 'quick' | 'online';
  table: TableTier['id'] | null;
  /** Entrada que paga cada jugador (0 = gratis). */
  entry: number;
}

/** Conexión con el servidor durante una partida online. */
export interface OnlineLink {
  sendAction: (a: Action) => void;
  sendChat: (text: string) => void;
  leave: () => void;
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
  step: 220,
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
  online: OnlineLink | null;
  /** Mi asiento (índice de jugador) en online. */
  mySeat: number | null;
  outcome: MatchOutcome | null;

  start: (config: MatchConfig) => void;
  startOnline: (config: MatchConfig, msg: UpdateMsg, link: OnlineLink, mySeat: number, endsAt?: number | null) => void;
  /** Premios que mandó el servidor al terminar. */
  setOutcome: (o: MatchOutcome) => void;
  receive: (msg: UpdateMsg) => void;
  rematch: () => void;
  quit: () => void;
  dispatch: (action: Action) => boolean;
  humanRoll: () => void;
  humanMove: (move: Move) => void;
  humanSoplar: () => void;
  select: (ref: PieceRef | null) => void;
  say: (player: number, text: string) => void;
  chat: (text: string) => void;
  /** Emote pagado con gemas. Devuelve false si no alcanzan las gemas. */
  emote: (emoteId: string) => Promise<string | null>;
  setPaused: (p: boolean) => void;
  /** Aplica los premios de la partida al perfil (una sola vez). */
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

  function seatOf(player: number): SeatConfig | undefined {
    const g = get().game;
    return get().config?.seats.find((s) => s.side === g?.players[player]?.side);
  }
  function isHuman(player: number): boolean {
    if (get().online) return player === get().mySeat;
    return seatOf(player)?.kind === 'human';
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
    if (get().online || isHuman(player) || Math.random() > chance) return;
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
          play('roll');
          await sleep(BASE.roll);
          set({ rolling: false, shownDice: e.dice });
          play('land');
          if (e.pair) play('pair');
          if (e.pair && e.pairStreak === 2 && final.rules.triplePairPenalty) {
            showBanner('pair', tr('¡Dos pares!'), tr('Pilas pues: un par más y a la cárcel'), 1300);
            botSay((e.player + 1) % final.players.length, BOT_LINES.pilas, 0.4);
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
          play('exit');
          pushFx('exit', pointOf(final, e.pieces[0]!, 0), colorVar(final, e.player));
          await sleep(BASE.exit);
          break;
        }
        case 'PIECE_MOVED': {
          let k = 0;
          for (const pos of e.path) {
            if (!alive()) return;
            set({ view: setPiece(get().view, e.piece, pos) });
            play('step', 1 + Math.min(0.6, k++ * 0.05));
            await sleep(BASE.step);
          }
          break;
        }
        case 'EXTRA_TURN': {
          if (e.reason === 'capture') {
            showBanner('info', tr('¡Tira otra vez!'), tr('Capturar te da otra tirada'), 1100);
            await sleep(BASE.turn);
          }
          break;
        }
        case 'CAPTURED': {
          const pos = get().view[e.by.owner]![e.by.index]!;
          const sq = squareOf(g.sides, g.players[e.by.owner]!.side, pos);
          const at = sq === null ? pointOf(final, e.by, pos) : trackCell(g.sides, sq).center;
          pushFx('burst', at, colorVar(final, e.by.owner), 1000);
          play('capture');
          showBanner('capture', tr('¡Captura!'), tr('{a} manda a la cárcel a {b}', { a: g.players[e.by.owner]!.name, b: g.players[e.victims[0]!.owner]!.name }), 1100);
          vibrate(60);
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
          play('crown');
          botSay(e.piece.owner, BOT_LINES.crown, 0.4);
          await sleep(BASE.crown);
          break;
        }
        case 'TRIPLE_PAIR': {
          showBanner('triple', tr('¡TRES PARES!'), e.piece ? tr('¡Esa ficha se va pa\' la cárcel!') : tr('Se acabó el turno'), BASE.triple);
          play('triple');
          vibrate([80, 60, 160]);
          await sleep(BASE.triple * 0.5);
          if (e.piece) {
            const pos = get().view[e.piece.owner]![e.piece.index]!;
            pushFx('jail', pointOf(final, e.piece, pos), 'var(--rojo)', 900);
            set({ view: setPiece(get().view, e.piece, -1) });
            play('jail');
          }
          await sleep(BASE.triple * 0.5);
          break;
        }
        case 'SOPLADO': {
          const pos = get().view[e.piece.owner]![e.piece.index]!;
          pushFx('jail', pointOf(final, e.piece, pos), 'var(--azul)', 900);
          play('soplo');
          showBanner('soplo', tr('¡Lo soplé!'), tr('{a} sopló a {b}', { a: g.players[e.by]!.name, b: g.players[e.offender]!.name }), BASE.soplo);
          set({ view: setPiece(get().view, e.piece, -1) });
          botSay(e.by, BOT_LINES.soplo, 0.7);
          await sleep(BASE.soplo * 0.6);
          break;
        }
        case 'SOPLO_AVAILABLE':
          if (!isHuman(e.offender)) play('tap', 1.6);
          break;
        case 'DICE_FORFEITED':
          await sleep(BASE.forfeit);
          break;
        case 'PLAYER_FINISHED':
          showBanner('finish', tr('¡{name} coronó!', { name: g.players[e.player]!.name }), tr('Puesto {n}', { n: e.place }), 1400);
          await sleep(500);
          break;
        case 'TURN_CHANGED':
          if (isHuman(e.player)) play('turn');
          await sleep(BASE.turn);
          break;
        default:
          break;
      }
    }
  }

  /** Después de cada acción (solo local): bots, temporizadores, soplo y fin de partida. */
  function scheduleNext() {
    clearTimers();
    const { game, config, paused } = get();
    if (!game || !config || paused) return;
    if (get().online) {
      autoSelect();
      return;
    }
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
    autoSelect();
  }

  /** Auto-selección cuando solo hay una ficha que se puede mover. */
  function autoSelect() {
    const { game } = get();
    if (!game || game.phase !== 'move' || !isHuman(game.current)) return;
    const pieces = new Map<string, PieceRef>();
    let hasExit = false;
    for (const m of legalMovesCache(game)) {
      if (m.type === 'exit') hasExit = true;
      else pieces.set(`${m.piece.owner}-${m.piece.index}`, m.piece);
    }
    if (pieces.size === 1 && !hasExit) set({ selected: [...pieces.values()][0]! });
  }

  function viewSideFor(config: MatchConfig, mySeat: number | null, game: GameState): number {
    if (mySeat !== null) return game.players[mySeat]!.side;
    const firstHuman = config.seats.filter((s) => s.kind === 'human').sort((a, b) => a.side - b.side)[0];
    return firstHuman?.side ?? 0;
  }

  const fresh = (config: MatchConfig, game: GameState) => ({
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
    paused: false,
    outcome: null,
  });

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
    online: null,
    mySeat: null,
    outcome: null,

    start(config) {
      epoch++;
      clearTimers();
      queue = Promise.resolve();
      const game = createGame({
        sides: config.sides,
        rules: config.rules,
        players: config.seats.map((s) => ({ name: s.name, side: s.side, isBot: s.kind === 'bot' })),
      });
      const matchDeadline = config.timeLimitSec > 0 ? Date.now() + (config.timeLimitSec * 1000) / get().speed : null;
      set({ ...fresh(config, game), matchDeadline, online: null, mySeat: null, viewSide: viewSideFor(config, null, game) });
      if (matchDeadline) {
        const myEpoch = epoch;
        setTimeout(() => {
          if (myEpoch === epoch && get().game?.phase !== 'over') get().dispatch({ type: 'TIME_UP' });
        }, matchDeadline - Date.now());
      }
      scheduleNext();
    },

    setOutcome(o) {
      set({ outcome: o });
    },

    startOnline(config, msg, link, mySeat, endsAt) {
      epoch++;
      clearTimers();
      queue = Promise.resolve();
      set({ ...fresh(config, msg.state), matchDeadline: endsAt ?? null, online: link, mySeat, viewSide: viewSideFor(config, mySeat, msg.state) });
      applyDeadlines(msg);
      autoSelect();
    },

    receive(msg) {
      if (!get().online) return;
      const myEpoch = epoch;
      set({ game: msg.state, busy: true, selected: null });
      applyDeadlines(msg);
      queue = queue.then(async () => {
        await animate(msg.events, msg.state, myEpoch);
        if (myEpoch !== epoch) return;
        const g = get().game!;
        set({ view: g.players.map((p) => [...p.pieces]), busy: false });
        autoSelect();
      });
    },

    rematch() {
      const c = get().config;
      if (c && !get().online) get().start(c);
    },

    quit() {
      epoch++;
      clearTimers();
      get().online?.leave();
      set({ game: null, config: null, busy: false, banner: null, fx: [], selected: null, online: null, mySeat: null });
    },

    dispatch(action) {
      const game = get().game;
      if (!game) return false;
      const link = get().online;
      if (link) {
        if (get().busy && action.type !== 'SOPLAR') return false;
        link.sendAction(action);
        return true;
      }
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
      if (get().online) {
        const me = get().mySeat;
        if (me !== null && canSoplar(g, me) === null) get().dispatch({ type: 'SOPLAR', player: me });
        return;
      }
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
      if (ref) play('tap');
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

    chat(text) {
      const link = get().online;
      if (link) {
        link.sendChat(text);
        return;
      }
      const g = get().game;
      const config = get().config;
      if (!g || !config) return;
      const speaker = isHuman(g.current) ? g.current : g.players.findIndex((_, i) => isHuman(i));
      if (speaker >= 0) get().say(speaker, text);
    },

    async emote(emoteId) {
      // El servidor cobra las gemas; en online también reparte el emote a la mesa.
      const r = await useProfile.getState().emote(emoteId);
      if (!r.ok) return tr(r.error ?? 'Te faltan gemas');
      play('pair');
      if (!get().online && r.result?.glyph) {
        const g = get().game;
        const me = g ? g.players.findIndex((_, i) => isHuman(i)) : -1;
        if (me >= 0) get().say(me, r.result.glyph);
      }
      return null;
    },

    setPaused(p) {
      if (get().online) return;
      set({ paused: p });
      if (p) clearTimers();
      else scheduleNext();
    },

  };

  function applyDeadlines(msg: UpdateMsg) {
    const now = Date.now();
    set({
      turnDeadline: msg.deadlines.turnMs !== null ? now + msg.deadlines.turnMs : null,
      soploDeadline: msg.deadlines.soploMs !== null ? now + msg.deadlines.soploMs : null,
    });
  }
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

/** ¿El jugador `player` lo controla esta pantalla? */
export function humanSeat(config: MatchConfig | null, state: GameState | null, player: number): boolean {
  if (!config || !state) return false;
  const { online, mySeat } = useGame.getState();
  if (online) return player === mySeat;
  return config.seats.find((s) => s.side === state.players[player]?.side)?.kind === 'human';
}
