/** LLEGADA y posiciones finales (1º, 2º, 3º...). */
import { homeFor } from '../board';
import { allHome, isTeamDone, partnerOf, progressRatio } from '../state';
import type { GameEvent, GameState } from '../types';

function pushRank(state: GameState, player: number, events: GameEvent[]): void {
  if (state.ranking.includes(player)) return;
  state.ranking.push(player);
  events.push({ type: 'PLAYER_FINISHED', player, place: state.ranking.length });
}

/** Revisa si `player` (dueño de la ficha que llegó) terminó, y si la partida acabó. */
export function checkFinish(state: GameState, player: number, events: GameEvent[]): void {
  const pl = state.players[player]!;
  if (!pl.finished && allHome(state, player)) {
    pl.finished = true;
    if (!state.rules.teams) pushRank(state, player, events);
    else if (isTeamDone(state, player)) {
      const partner = partnerOf(state, player)!;
      // El que coronó primero queda primero dentro de la pareja.
      pushRank(state, partner, events);
      pushRank(state, player, events);
    }
  }
  checkGameOver(state, events);
}

/** Jugadores que todavía deben tomar turnos. */
export function stillPlaying(state: GameState, player: number): boolean {
  if (state.players[player]!.left) return false;
  return state.rules.teams ? !isTeamDone(state, player) : !state.players[player]!.finished;
}

export function checkGameOver(state: GameState, events: GameEvent[]): void {
  if (state.phase === 'over') return;
  const remaining = state.players.map((_, i) => i).filter((i) => stillPlaying(state, i));
  const groups = new Set(remaining.map((i) => (state.rules.teams ? `t${state.players[i]!.team}` : `p${i}`)));
  if (groups.size <= 1) endGame(state, events);
}

/** Termina la partida: los que faltan se ordenan por avance (también para TIME_UP). */
export function endGame(state: GameState, events: GameEvent[]): void {
  const rest = state.players
    .map((_, i) => i)
    .filter((i) => !state.ranking.includes(i))
    .sort(
      (a, b) =>
        Number(!!state.players[a]!.left) - Number(!!state.players[b]!.left) ||
        teamScore(state, b) - teamScore(state, a) ||
        progressRatio(state, b) - progressRatio(state, a),
    );
  for (const i of rest) pushRank(state, i, events);
  state.phase = 'over';
  state.dice = null;
  state.pendingSoplo = null;
  events.push({ type: 'GAME_OVER', ranking: [...state.ranking] });
}

/** Primero cuentan las fichas coronadas y luego el avance total. */
function playerScore(state: GameState, player: number): number {
  const home = homeFor(state.sides);
  const crowned = state.players[player]!.pieces.filter((p) => p === home).length;
  return crowned * 10 + progressRatio(state, player);
}

function teamScore(state: GameState, player: number): number {
  const partner = partnerOf(state, player);
  return playerScore(state, player) + (partner === null ? 0 : playerScore(state, partner));
}
