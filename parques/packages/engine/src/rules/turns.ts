/** TURNOS: fin de tirada, turno extra por par y paso al siguiente jugador. */
import { isPairRoll } from '../moves';
import type { GameEvent, GameState } from '../types';
import { stillPlaying } from './finish';
import { finalizeSoplo } from './soplar';

export function nextPlayer(state: GameState, events: GameEvent[]): void {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const i = (state.current + step) % n;
    if (stillPlaying(state, i)) {
      state.current = i;
      break;
    }
  }
  state.phase = 'roll';
  state.dice = null;
  state.diceUsed = [false, false];
  state.pairStreak = 0;
  state.jailRollsUsed = 0;
  state.turn++;
  events.push({ type: 'TURN_CHANGED', player: state.current });
}

/** Termina el uso de los dados actuales (todos usados o sin jugadas posibles). */
export function endRoll(state: GameState, events: GameEvent[]): void {
  const unused = state.dice ? state.dice.filter((_, i) => !state.diceUsed[i]) : [];
  if (unused.length > 0 && state.phase !== 'over') {
    events.push({ type: 'DICE_FORFEITED', player: state.current, dice: unused });
  }
  finalizeSoplo(state, events);
  if (state.phase === 'over') return;
  if (isPairRoll(state) && stillPlaying(state, state.current)) {
    state.phase = 'roll';
    state.diceUsed = [true, true];
    state.jailRollsUsed = 0;
    events.push({ type: 'EXTRA_TURN', player: state.current });
  } else {
    nextPlayer(state, events);
  }
}
