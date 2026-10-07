import { describe, expect, it } from 'vitest';
import { initialState, reducer } from '../reducer';
import { recommendHolds } from '../strategy';

describe('RTP simulation', () => {
  it('simplified strategy returns close to 99% over many hands', () => {
    const HANDS = 200_000;
    let s = { ...initialState(), credits: 1e9, bet: 5 };
    for (let i = 0; i < HANDS; i++) {
      s = reducer(s, { type: 'DEAL' });
      s = reducer(s, { type: 'SET_HOLDS', held: recommendHolds(s.hand) });
      s = reducer(s, { type: 'DRAW' });
    }
    const rtp = s.stats.totalWon / s.stats.totalBet;
    // Con 200 000 manos la desviación típica del RTP es ≈ 1 %; la escalera real pesa mucho.
    expect(rtp).toBeGreaterThan(0.95);
    expect(rtp).toBeLessThan(1.04);
  }, 60_000);
});
