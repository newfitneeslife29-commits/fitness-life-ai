import { describe, expect, it } from 'vitest';
import { createDeck } from '../deck';
import { initialState, reducer } from '../reducer';
import { Card } from '../types';
import { h } from './helpers';

/** Baraja con la mano dada arriba y el resto en orden. */
function stacked(top: Card[], next: Card[] = []): Card[] {
  const used = new Set([...top, ...next].map((c) => `${c.rank}${c.suit}`));
  return [...top, ...next, ...createDeck().filter((c) => !used.has(`${c.rank}${c.suit}`))];
}

describe('reducer', () => {
  it('starts in BETTING with 1000 credits', () => {
    const s = initialState();
    expect(s.phase).toBe('BETTING');
    expect(s.credits).toBe(1000);
  });

  it('cannot draw before dealing', () => {
    const s = initialState();
    expect(reducer(s, { type: 'DRAW' })).toBe(s);
  });

  it('deal subtracts the bet and deals 5 cards', () => {
    const s = reducer({ ...initialState(), bet: 3 }, { type: 'DEAL' });
    expect(s.phase).toBe('DEALT');
    expect(s.credits).toBe(997);
    expect(s.hand).toHaveLength(5);
    expect(s.deck).toHaveLength(47);
  });

  it('bet one cycles 1..5 and is blocked while dealt', () => {
    let s = initialState();
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'BET_ONE' });
      seen.push(s.bet);
    }
    expect(seen).toEqual([2, 3, 4, 5, 1]);
    const dealt = reducer(s, { type: 'DEAL' });
    expect(reducer(dealt, { type: 'BET_ONE' })).toBe(dealt);
  });

  it('bet max sets bet to 5 and deals', () => {
    const s = reducer(initialState(), { type: 'BET_MAX' });
    expect(s.bet).toBe(5);
    expect(s.phase).toBe('DEALT');
    expect(s.credits).toBe(995);
  });

  it('held cards stay after draw and the rest come from the same deck', () => {
    const deck = stacked(h('AS KS QS JS 2H'), h('TS'));
    let s = reducer({ ...initialState(), bet: 5 }, { type: 'DEAL', deck });
    for (const i of [0, 1, 2, 3]) s = reducer(s, { type: 'TOGGLE_HOLD', index: i });
    s = reducer(s, { type: 'DRAW' });
    expect(s.hand.slice(0, 4)).toEqual(h('AS KS QS JS'));
    expect(s.hand[4]).toEqual(h('TS')[0]);
    expect(s.result).toBe('ROYAL_FLUSH');
    expect(s.lastWin).toBe(4000);
    expect(s.credits).toBe(1000 - 5 + 4000);
    expect(s.stats.handsPlayed).toBe(1);
    expect(s.stats.byRank.ROYAL_FLUSH).toBe(1);
    expect(s.stats.biggestWin).toBe(4000);
  });

  it('cannot deal without credits; lowers bet when short', () => {
    const broke = { ...initialState(), credits: 0 };
    expect(reducer(broke, { type: 'DEAL' })).toBe(broke);
    const short = reducer({ ...initialState(), credits: 3, bet: 5 }, { type: 'DEAL' });
    expect(short.bet).toBe(3);
    expect(short.credits).toBe(0);
  });

  it('toggle hold only works while dealt', () => {
    const s = initialState();
    expect(reducer(s, { type: 'TOGGLE_HOLD', index: 0 })).toBe(s);
  });
});
