/** Evaluación heurística de un estado desde el punto de vista de un jugador. */
import { entryFor, exitSquare, homeFor, isInCorridor, isOnTrack, isSafeSquare, squareOf } from '../board';
import { areTeammates } from '../state';
import type { GameState } from '../types';
import { JAIL } from '../types';

/** P(con dos dados se puede avanzar exactamente d: un dado o la suma), d = 1..12. */
export const HIT_PROB: readonly number[] = (() => {
  const out = [0];
  for (let d = 1; d <= 12; d++) {
    let hits = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a === d || b === d || a + b === d) hits++;
    out.push(hits / 36);
  }
  return out;
})();

export function pieceValue(state: GameState, pos: number): number {
  const home = homeFor(state.sides);
  if (pos === JAIL) return 0;
  if (pos === home) return home + 60;
  return 15 + pos + (isInCorridor(state.sides, pos) ? 12 : 0);
}

/** Probabilidad aproximada de que una ficha en `square` sea capturada en el próximo turno rival. */
export function dangerAt(state: GameState, owner: number, square: number): number {
  const entry = entryFor(state.sides);
  const len = state.sides * 17;
  let safeProb = 1;
  state.players.forEach((rival, r) => {
    if (areTeammates(state, owner, r)) return;
    // Rival sale de la cárcel con par sobre su salida ocupada.
    if (square === exitSquare(rival.side) && rival.pieces.includes(JAIL)) safeProb *= 1 - 1 / 6;
    if (isSafeSquare(square)) return;
    for (const rp of rival.pieces) {
      if (!isOnTrack(state.sides, rp)) continue;
      const rsq = squareOf(state.sides, rival.side, rp)!;
      const d = (square - rsq + len) % len;
      if (d >= 1 && d <= 12 && rp + d <= entry) safeProb *= 1 - HIT_PROB[d]!;
    }
  });
  return 1 - safeProb;
}

function sideScore(state: GameState, player: number): number {
  const pl = state.players[player]!;
  let score = 0;
  for (const pos of pl.pieces) {
    const v = pieceValue(state, pos);
    score += v;
    if (isOnTrack(state.sides, pos)) {
      score -= dangerAt(state, player, squareOf(state.sides, pl.side, pos)!) * (v + 20);
    }
  }
  return score;
}

/** Puntaje del equipo de `player` menos (una fracción de) el de los rivales. */
export function evaluate(state: GameState, player: number): number {
  if (state.phase === 'over') {
    const place = state.ranking.indexOf(player);
    if (place === 0) return 1e6;
  }
  let mine = 0;
  let rivals = 0;
  let rivalCount = 0;
  state.players.forEach((_, i) => {
    const s = sideScore(state, i);
    if (areTeammates(state, player, i)) mine += s;
    else {
      rivals += s;
      rivalCount++;
    }
  });
  return mine - (rivalCount ? (rivals / rivalCount) * 0.9 : 0);
}
