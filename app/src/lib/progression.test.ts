import { describe, expect, it } from 'vitest';
import { displayToKg, estimate1RM, kgToDisplay, newRecords, personalRecords, suggestNext, volume } from './progression';

const range = (repMin: number, repMax: number) => ({ repMin, repMax });

describe('estimate1RM', () => {
    it('uses the Epley formula', () => {
        expect(estimate1RM(100, 5)).toBe(116.7);
        expect(estimate1RM(60, 10)).toBe(80);
    });
    it('returns the weight for one rep and 0 for empty sets', () => {
        expect(estimate1RM(140, 1)).toBe(140);
        expect(estimate1RM(0, 10)).toBe(0);
        expect(estimate1RM(50, 0)).toBe(0);
    });
});

describe('volume', () => {
    it('ignores warm-up sets', () => {
        expect(volume([
            { weightKg: 20, reps: 10, warmup: true },
            { weightKg: 60, reps: 8 },
            { weightKg: 60, reps: 7 },
        ])).toBe(900);
    });
});

describe('suggestNext', () => {
    it('adds the exercise step when every top set hit the top of the range', () => {
        expect(suggestNext(range(8, 12), [{ weightKg: 60, reps: 12 }, { weightKg: 60, reps: 12 }], 2.5))
            .toEqual({ weightKg: 62.5, reps: 8, increased: true });
        expect(suggestNext(range(4, 6), [{ weightKg: 100, reps: 6 }], 5))
            .toEqual({ weightKg: 105, reps: 4, increased: true });
    });

    it('keeps the weight and asks for one more rep otherwise', () => {
        expect(suggestNext(range(8, 12), [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 9 }], 2.5))
            .toEqual({ weightKg: 60, reps: 10, increased: true });
    });

    it('never asks for more than the top of the range at the same weight', () => {
        expect(suggestNext(range(8, 12), [{ weightKg: 60, reps: 12 }, { weightKg: 60, reps: 11 }], 2.5))
            .toEqual({ weightKg: 60, reps: 12, increased: true });
    });

    it('judges only the heaviest working sets and ignores warm-ups', () => {
        expect(suggestNext(range(6, 8), [
            { weightKg: 40, reps: 10, warmup: true },
            { weightKg: 70, reps: 8 },
            { weightKg: 65, reps: 6 },
        ], 2.5)).toEqual({ weightKg: 72.5, reps: 6, increased: true });
    });

    it('progresses bodyweight exercises by reps, capped at repMax + 5', () => {
        expect(suggestNext(range(8, 12), [{ weightKg: 0, reps: 12 }], 0)).toEqual({ weightKg: 0, reps: 13, increased: true });
        expect(suggestNext(range(8, 12), [{ weightKg: 0, reps: 17 }], 0)).toEqual({ weightKg: 0, reps: 17, increased: false });
        expect(suggestNext(range(20, 45), [{ weightKg: 0, reps: 30 }], 0)).toEqual({ weightKg: 0, reps: 31, increased: true });
    });

    it('returns null with no history', () => {
        expect(suggestNext(range(8, 12), [], 2.5)).toBeNull();
        expect(suggestNext(range(8, 12), [{ weightKg: 20, reps: 10, warmup: true }], 2.5)).toBeNull();
    });
});

describe('records', () => {
    const sets = [
        { exerciseId: 'banca', weightKg: 60, reps: 10 },
        { exerciseId: 'banca', weightKg: 70, reps: 3 },
        { exerciseId: 'sentadilla', weightKg: 100, reps: 5 },
        { exerciseId: 'sentadilla', weightKg: 120, reps: 1, warmup: true },
    ];

    it('keeps the best e1RM and heaviest set per exercise', () => {
        const prs = personalRecords(sets);
        expect(prs.get('banca')).toEqual({ exerciseId: 'banca', bestE1rm: 80, bestWeightKg: 70, repsAtBestWeight: 3, bestReps: 10 });
        expect(prs.get('sentadilla')?.bestE1rm).toBe(116.7);
    });

    it('flags only records that beat earlier sessions', () => {
        expect(newRecords(sets, [
            { exerciseId: 'banca', weightKg: 65, reps: 10 },      // e1RM 86.7 > 80
            { exerciseId: 'sentadilla', weightKg: 90, reps: 5 },  // worse
            { exerciseId: 'remo', weightKg: 50, reps: 10 },       // first time, not a record
        ])).toEqual([{ exerciseId: 'banca', kind: 'e1rm' }]);
        expect(newRecords([{ exerciseId: 'flexiones', weightKg: 0, reps: 15 }], [{ exerciseId: 'flexiones', weightKg: 0, reps: 18 }]))
            .toEqual([{ exerciseId: 'flexiones', kind: 'reps' }]);
    });
});

describe('unit conversion', () => {
    it('converts between kg and lbs', () => {
        expect(kgToDisplay(100, 'lbs')).toBe(220.5);
        expect(kgToDisplay(62.5, 'kg')).toBe(62.5);
        expect(displayToKg(225, 'lbs')).toBe(102.06);
    });
});
