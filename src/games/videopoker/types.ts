export type Suit = 'S' | 'H' | 'D' | 'C'; // picas, corazones, diamantes, tréboles
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J … 14=A

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HandRank =
  | 'ROYAL_FLUSH'
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'JACKS_OR_BETTER'
  | 'NOTHING';

export const HAND_RANKS: HandRank[] = [
  'ROYAL_FLUSH',
  'STRAIGHT_FLUSH',
  'FOUR_OF_A_KIND',
  'FULL_HOUSE',
  'FLUSH',
  'STRAIGHT',
  'THREE_OF_A_KIND',
  'TWO_PAIR',
  'JACKS_OR_BETTER',
  'NOTHING',
];

export type Phase = 'BETTING' | 'DEALT' | 'RESULT';

export interface Stats {
  handsPlayed: number;
  totalBet: number;
  totalWon: number;
  byRank: Record<HandRank, number>;
  biggestWin: number;
}

export interface GameState {
  phase: Phase;
  credits: number;
  bet: number; // 1..5
  deck: Card[]; // cartas restantes
  hand: Card[]; // siempre 5 cartas tras el reparto
  held: boolean[]; // 5 posiciones
  result: HandRank | null;
  lastWin: number;
  stats: Stats;
}

export const MAX_BET = 5;
export const STARTING_CREDITS = 1000;
