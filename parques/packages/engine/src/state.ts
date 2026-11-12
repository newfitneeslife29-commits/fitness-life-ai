/** Consultas y utilidades sobre el estado (sin efectos). */
import { entryFor, homeFor, isActive, isOnTrack, squareOf } from './board';
import type { GameState, PieceRef, PlayerState } from './types';
import { JAIL } from './types';

export function clone(state: GameState): GameState {
  return structuredClone(state);
}

export function posOf(state: GameState, ref: PieceRef): number {
  return state.players[ref.owner]!.pieces[ref.index]!;
}

export function setPos(state: GameState, ref: PieceRef, pos: number): void {
  state.players[ref.owner]!.pieces[ref.index] = pos;
}

export function areTeammates(state: GameState, a: number, b: number): boolean {
  if (a === b) return true;
  const ta = state.players[a]!.team;
  return ta !== null && ta === state.players[b]!.team;
}

export function allHome(state: GameState, player: number): boolean {
  const home = homeFor(state.sides);
  return state.players[player]!.pieces.every((p) => p === home);
}

export function partnerOf(state: GameState, player: number): number | null {
  if (!state.rules.teams) return null;
  const team = state.players[player]!.team;
  const idx = state.players.findIndex((p, i) => i !== player && p.team === team);
  return idx >= 0 ? idx : null;
}

/**
 * Jugador cuyas fichas mueve `player`. En parejas, quien ya coronó todo
 * sigue tirando y mueve las fichas de su compañero.
 */
export function controlledPlayer(state: GameState, player: number): number {
  if (!allHome(state, player)) return player;
  const partner = partnerOf(state, player);
  if (partner !== null && !allHome(state, partner)) return partner;
  return player;
}

export function hasPieceInPlay(state: GameState, player: number): boolean {
  return state.players[player]!.pieces.some((p) => isActive(state.sides, p));
}

export function jailPieces(state: GameState, player: number): PieceRef[] {
  return state.players[player]!.pieces.flatMap((p, index) => (p === JAIL ? [{ owner: player, index }] : []));
}

/** Fichas rivales (no compañeras) sobre una casilla absoluta del recorrido común. */
export function rivalsOnSquare(state: GameState, player: number, square: number): PieceRef[] {
  const out: PieceRef[] = [];
  state.players.forEach((pl: PlayerState, owner) => {
    if (areTeammates(state, player, owner)) return;
    pl.pieces.forEach((pos, index) => {
      if (isOnTrack(state.sides, pos) && squareOf(state.sides, pl.side, pos) === square) {
        out.push({ owner, index });
      }
    });
  });
  return out;
}

/** Progreso total de un jugador (0..1), útil para desempates y la IA. */
export function progressRatio(state: GameState, player: number): number {
  const home = homeFor(state.sides);
  const pieces = state.players[player]!.pieces;
  return pieces.reduce((acc, p) => acc + (p < 0 ? 0 : p + 1), 0) / (pieces.length * (home + 1));
}

export function isTeamDone(state: GameState, player: number): boolean {
  const partner = partnerOf(state, player);
  return allHome(state, player) && (partner === null || allHome(state, partner));
}

export { entryFor, homeFor };
