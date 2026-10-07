import { createDeck, shuffle } from './deck';
import { evaluateHand } from './evaluate';
import { payout } from './paytable';
import { emptyStats } from './stats';
import { Card, GameState, MAX_BET, STARTING_CREDITS } from './types';

export type Action =
  | { type: 'BET_ONE' }
  | { type: 'BET_MAX'; deck?: Card[] }
  | { type: 'DEAL'; deck?: Card[] } // `deck` permite inyectar una baraja en tests
  | { type: 'TOGGLE_HOLD'; index: number }
  | { type: 'SET_HOLDS'; held: boolean[] }
  | { type: 'DRAW' }
  | { type: 'ADD_CREDITS'; amount: number }
  | { type: 'RESET_STATS' };

const NO_HOLDS = [false, false, false, false, false];

export function initialState(saved?: Partial<Pick<GameState, 'credits' | 'bet' | 'stats'>>): GameState {
  return {
    phase: 'BETTING',
    credits: saved?.credits ?? STARTING_CREDITS,
    bet: saved?.bet ?? 1,
    deck: [],
    hand: [],
    held: NO_HOLDS,
    result: null,
    lastWin: 0,
    stats: saved?.stats ?? emptyStats(),
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'BET_ONE': {
      if (state.phase === 'DEALT') return state;
      const next = (state.bet % MAX_BET) + 1;
      return { ...state, bet: next > state.credits ? 1 : next };
    }

    case 'BET_MAX':
      if (state.phase === 'DEALT') return state;
      return reducer({ ...state, bet: MAX_BET }, { type: 'DEAL', deck: action.deck });

    case 'DEAL': {
      if (state.phase === 'DEALT' || state.credits <= 0) return state;
      // Si no alcanzan los créditos, se ajusta la apuesta al máximo posible.
      const bet = Math.min(state.bet, state.credits);
      const deck = action.deck ?? shuffle(createDeck());
      return {
        ...state,
        phase: 'DEALT',
        bet,
        credits: state.credits - bet,
        hand: deck.slice(0, 5),
        deck: deck.slice(5),
        held: NO_HOLDS,
        result: null,
        lastWin: 0,
      };
    }

    case 'TOGGLE_HOLD': {
      if (state.phase !== 'DEALT') return state;
      const held = [...state.held];
      held[action.index] = !held[action.index];
      return { ...state, held };
    }

    case 'SET_HOLDS':
      if (state.phase !== 'DEALT') return state;
      return { ...state, held: [...action.held] };

    case 'DRAW': {
      if (state.phase !== 'DEALT') return state;
      const deck = [...state.deck];
      const hand = state.hand.map((card, i) => (state.held[i] ? card : deck.shift()!));
      const result = evaluateHand(hand);
      const win = payout(result, state.bet);
      const s = state.stats;
      return {
        ...state,
        phase: 'RESULT',
        hand,
        deck,
        result,
        lastWin: win,
        credits: state.credits + win,
        stats: {
          handsPlayed: s.handsPlayed + 1,
          totalBet: s.totalBet + state.bet,
          totalWon: s.totalWon + win,
          byRank: { ...s.byRank, [result]: s.byRank[result] + 1 },
          biggestWin: Math.max(s.biggestWin, win),
        },
      };
    }

    case 'ADD_CREDITS':
      return { ...state, credits: state.credits + action.amount };

    case 'RESET_STATS':
      return { ...state, stats: emptyStats() };
  }
}
