import { describe, expect, it } from 'vitest';
import { percentTable, platesFor } from './plates';
import { estimate1RM } from './progression';

describe('gym calculator', () => {
    it('100 kg x 5 gives a max of about 116.7 kg and plate-round training weights', () => {
        const max = estimate1RM(100, 5);
        expect(max).toBe(116.7);
        const table = percentTable(max, 'kg');
        expect(table[0]).toEqual({ pct: 100, reps: '1', weight: 116.7 });
        expect(table.find(r => r.pct === 80)?.weight).toBe(92.5);
        expect(table.every(r => r.pct === 100 || r.weight % 2.5 === 0)).toBe(true);
    });

    it('pounds round to 5 lb', () => {
        const table = percentTable(225, 'lbs');
        expect(table.find(r => r.pct === 85)?.weight).toBe(190);
    });

    it('plates for 100 kg: 25 + 15 on each side', () => {
        expect(platesFor(100, 'kg')).toEqual({ perSide: [25, 15], loaded: 100, exact: true });
    });
});
