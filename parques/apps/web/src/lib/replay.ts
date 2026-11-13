/**
 * Repetición de la última partida (v1.2): se graban las posiciones de las fichas y los dados
 * después de cada jugada (un "cuadro" por cambio de estado) y se guardan en el celular al terminar.
 */
import type { GameState } from '@parques/engine';
import { useGame } from '../stores/gameStore';

export interface ReplayFrame {
  /** Posiciones de las fichas por jugador. */
  v: number[][];
  d: [number, number] | null;
  c: number;
}
export interface Replay {
  at: number;
  final: GameState;
  viewSide: number;
  me: number;
  frames: ReplayFrame[];
}

const KEY = 'parques-replay';
const MAX_FRAMES = 1500;
let frames: ReplayFrame[] = [];
let saved = false;

export function loadReplay(): Replay | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Replay | null;
    return r?.frames?.length ? r : null;
  } catch {
    return null;
  }
}

const same = (a: ReplayFrame, b: ReplayFrame) => a.c === b.c && JSON.stringify(a.v) === JSON.stringify(b.v) && String(a.d) === String(b.d);

/** Empieza a grabar (se llama una vez al abrir la app). */
export function startReplayRecorder() {
  useGame.subscribe((s, prev) => {
    const g = s.game;
    if (!g || g === prev.game) return;
    if (!prev.game || (prev.game.phase === 'over' && g.phase !== 'over') || prev.game.players.length !== g.players.length) {
      frames = [];
      saved = false;
    }
    const f: ReplayFrame = { v: g.players.map((p) => [...p.pieces]), d: g.dice ? [g.dice[0], g.dice[1]] : null, c: g.current };
    const last = frames[frames.length - 1];
    if (!last || !same(last, f)) frames.push(f);
    if (frames.length > MAX_FRAMES) frames.splice(1, frames.length - MAX_FRAMES);
    if (g.phase === 'over' && !saved && frames.length > 3) {
      saved = true;
      const me = s.config?.seats.findIndex((x) => x.kind === 'human') ?? 0;
      const r: Replay = { at: Date.now(), final: { ...g, rng: 0 }, viewSide: s.viewSide, me: Math.max(0, me), frames };
      try {
        localStorage.setItem(KEY, JSON.stringify(r));
      } catch {
        /* sin espacio */
      }
    }
  });
}
