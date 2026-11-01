import { describe, expect, it } from 'vitest';
import type { ActiveExercise } from '../store/types';
import { adjustForFeel } from './feel';

const ex = (exerciseId: string, n: number, weightKg: number): ActiveExercise => ({
    exerciseId, repMin: 8, repMax: 12, restSec: 90,
    sets: Array.from({ length: n }, (_, i) => ({ id: `${exerciseId}${i}`, weightKg, reps: 10, done: false })),
});
const base = [ex('press-banca', 4, 60), ex('remo', 3, 41), ex('plancha', 2, 0)];

describe('adjustForFeel', () => {
    it('normal keeps the plan as it is', () => {
        expect(adjustForFeel(base, 'normal', 'kg')).toBe(base);
    });

    it('tired: one set less from 3 sets up and 10% less weight on real plates', () => {
        const out = adjustForFeel(base, 'tired', 'kg');
        expect(out.map(e => e.sets.length)).toEqual([3, 2, 2]);
        expect(out[0].sets[0].weightKg).toBe(52.5); // 54 → 52.5
        expect(out[1].sets[0].weightKg).toBe(35); // 36.9 → 35
        expect(out[2].sets[0].weightKg).toBe(0); // bodyweight stays
    });

    it('tired in pounds rounds to 5 lb', () => {
        const out = adjustForFeel([ex('sentadilla', 3, 100 * 0.45359237)], 'tired', 'lbs');
        expect(Math.round(out[0].sets[0].weightKg / 0.45359237)).toBe(90);
    });

    it('strong: one extra set of the first exercise only', () => {
        const out = adjustForFeel(base, 'strong', 'kg');
        expect(out.map(e => e.sets.length)).toEqual([5, 3, 2]);
        const extra = out[0].sets[4];
        expect(extra).toMatchObject({ weightKg: 60, reps: 10, done: false });
        expect(extra.id).not.toBe(out[0].sets[3].id);
    });

    it('never touches the plan it starts from', () => {
        adjustForFeel(base, 'tired', 'kg');
        adjustForFeel(base, 'strong', 'kg');
        expect(base.map(e => e.sets.length)).toEqual([4, 3, 2]);
        expect(base[0].sets[0].weightKg).toBe(60);
    });
});
