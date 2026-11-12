/**
 * Reducer puro: applyAction(state, action) → { state, events }.
 * Nunca muta el estado recibido. Los eventos describen lo que pasó, en orden,
 * para que la UI lo anime paso a paso.
 */
import { entryFor, homeFor, squareOf } from './board';
import { getLegalMoves, isLegalMove, dieValueOf } from './moves';
import { rollDice } from './rng';
import { captureAt } from './rules/capture';
import { checkFinish, endGame } from './rules/finish';
import { exitJail } from './rules/jail';
import { applySoplo, canSoplar, trackMissedCapture } from './rules/soplar';
import { applyTriplePairPenalty } from './rules/triplePair';
import { endRoll, nextPlayer } from './rules/turns';
import { clone, controlledPlayer, hasPieceInPlay, posOf, setPos } from './state';
import type { Action, ActionResult, GameEvent, GameState, Move } from './types';

const fail = (error: string): ActionResult => ({ ok: false, error });

export function applyAction(input: GameState, action: Action): ActionResult {
  if (input.phase === 'over' && action.type !== 'DISMISS_SOPLO') return fail('La partida terminó');
  const state = clone(input);
  const events: GameEvent[] = [];
  let error: string | null = null;

  switch (action.type) {
    case 'ROLL':
      error = doRoll(state, action.player, action.dice, events);
      break;
    case 'MOVE':
      error = doMove(state, action.player, action.move, events);
      break;
    case 'SOPLAR':
      error = canSoplar(state, action.player);
      if (!error) {
        applySoplo(state, action.player, events);
        // Si al jugador en turno le soplaron y ya no puede mover, se cierra su tirada.
        if (state.phase === 'move' && getLegalMoves(state).length === 0) endRoll(state, events);
      }
      break;
    case 'DISMISS_SOPLO':
      if (state.pendingSoplo) {
        state.pendingSoplo = null;
        events.push({ type: 'SOPLO_EXPIRED' });
      }
      break;
    case 'TIME_UP':
      endGame(state, events);
      break;
    default:
      error = 'Acción desconocida';
  }
  if (error) return fail(error);
  state.version++;
  return { ok: true, state, events };
}

function doRoll(state: GameState, player: number, forced: [number, number] | undefined, events: GameEvent[]): string | null {
  if (state.phase !== 'roll') return 'No es momento de tirar los dados';
  if (player !== state.current) return 'No es tu turno';

  let dice: [number, number];
  if (forced) {
    if (!forced.every((d) => Number.isInteger(d) && d >= 1 && d <= 6)) return 'Dados inválidos';
    dice = [forced[0], forced[1]];
  } else {
    const [rolled, next] = rollDice(state.rng);
    dice = rolled;
    state.rng = next;
  }

  if (state.pendingSoplo && state.pendingSoplo.offender !== player) {
    state.pendingSoplo = null;
    events.push({ type: 'SOPLO_EXPIRED' });
  }

  const pair = dice[0] === dice[1];
  if (pair) {
    state.pairStreak++;
    state.players[player]!.stats.pairs++;
  }
  state.dice = dice;
  state.diceUsed = [false, false];
  state.missedCapture = null;
  state.capturedThisRoll = false;
  events.push({ type: 'ROLLED', player, dice, pair, pairStreak: state.pairStreak });

  // Tres pares seguidos.
  if (pair && state.pairStreak >= 3 && state.rules.triplePairPenalty) {
    applyTriplePairPenalty(state, events);
    nextPlayer(state, events);
    return null;
  }

  const owner = controlledPlayer(state, player);
  if (!hasPieceInPlay(state, owner)) {
    // Sin fichas en juego: intentos para sacar par. Con par se elige cuántas salen (fase move).
    if (!pair) {
      state.jailRollsUsed++;
      const left = state.rules.jailAttempts - state.jailRollsUsed;
      state.diceUsed = [true, true];
      events.push({ type: 'JAIL_ATTEMPT_FAILED', player, attemptsLeft: Math.max(0, left) });
      if (left <= 0) nextPlayer(state, events);
      return null;
    }
  }

  state.phase = 'move';
  if (getLegalMoves(state).length === 0) endRoll(state, events);
  return null;
}

function doMove(state: GameState, player: number, move: Move, events: GameEvent[]): string | null {
  if (state.phase !== 'move') return 'No es momento de mover';
  if (player !== state.current) return 'No es tu turno';
  if (!move || !isLegalMove(state, move)) return 'Jugada ilegal';

  trackMissedCapture(state, move);
  const owner = controlledPlayer(state, player);

  if (move.type === 'exit') {
    exitJail(state, owner, move.count, events);
    if (move.count === 1) state.diceUsed[state.diceUsed[0] ? 1 : 0] = true;
    else state.diceUsed = [true, true];
  } else {
    const from = posOf(state, move.piece);
    const to = from + dieValueOf(state, move);
    const path: number[] = [];
    for (let p = from + 1; p <= to; p++) path.push(p);
    setPos(state, move.piece, to);
    if (move.type === 'sum') state.diceUsed = [true, true];
    else state.diceUsed[move.die] = true;
    events.push({ type: 'PIECE_MOVED', piece: move.piece, from, to, path });

    if (to <= entryFor(state.sides)) {
      const side = state.players[move.piece.owner]!.side;
      captureAt(state, move.piece, squareOf(state.sides, side, to)!, events);
    } else if (to === homeFor(state.sides)) {
      state.players[player]!.stats.crowned++;
      events.push({ type: 'CROWNED', piece: move.piece });
      checkFinish(state, move.piece.owner, events);
      if ((state.phase as GameState['phase']) === 'over') return null;
    }
  }

  if (state.diceUsed.every(Boolean) || getLegalMoves(state).length === 0) endRoll(state, events);
  return null;
}

/** Atajo: aplica y lanza error si la acción es ilegal (útil en pruebas y scripts). */
export function applyOrThrow(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(r.error);
  return { state: r.state, events: r.events };
}
