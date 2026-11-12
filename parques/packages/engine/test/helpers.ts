import { applyAction, applyOrThrow, createGame, JAIL } from '../src';
import type { GameEvent, GameState, HouseRules, Move, PieceRef } from '../src';

export { JAIL };

/** Partida de 4 jugadores (lados 0..3) con semilla fija. */
export function newGame(rules: Partial<HouseRules> = {}, sides: 4 | 6 = 4, players: number = sides): GameState {
  return createGame({
    sides,
    seed: 42,
    rules,
    players: Array.from({ length: players }, (_, i) => ({ name: `J${i}`, side: i })),
  });
}

/** Fija las posiciones de las fichas (una lista por jugador) y el jugador en turno. */
export function setup(state: GameState, pieces: number[][], current = 0): GameState {
  const s = structuredClone(state);
  pieces.forEach((list, i) => {
    s.players[i]!.pieces = [...list];
  });
  s.current = current;
  return s;
}

export function roll(state: GameState, dice: [number, number], player = state.current) {
  return applyOrThrow(state, { type: 'ROLL', player, dice });
}

export function move(state: GameState, mv: Move, player = state.current) {
  return applyOrThrow(state, { type: 'MOVE', player, move: mv });
}

export const step = (owner: number, index: number, die: 0 | 1): Move => ({ type: 'step', piece: { owner, index }, die });
export const sum = (owner: number, index: number): Move => ({ type: 'sum', piece: { owner, index } });
export const exit = (count: number): Move => ({ type: 'exit', count });
export const ref = (owner: number, index: number): PieceRef => ({ owner, index });

export function tryAction(state: GameState, action: Parameters<typeof applyAction>[1]) {
  return applyAction(state, action);
}

export function types(events: GameEvent[]): string[] {
  return events.map((e) => e.type);
}

/** Progreso de un lado para quedar sobre una casilla absoluta (4 lados). */
export function progressAt(side: number, square: number, sides = 4): number {
  const len = sides * 17;
  return (square - (side * 17 + 5) + len) % len;
}
