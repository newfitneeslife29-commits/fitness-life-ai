import { describe, expect, it } from 'vitest';
import {
    displayToKg,
    estimate1RM,
    isLowerBody,
    kgToDisplay,
    parseRepRange,
    personalRecords,
    sessionVolume,
    suggestNext,
} from './progression';

describe('estimate1RM', () => {
    it('uses the Epley formula', () => {
        expect(estimate1RM(100, 5)).toBe(116.7);
        expect(estimate1RM(60, 10)).toBe(80);
    });
    it('returns the weight for a single rep and 0 for empty sets', () => {
        expect(estimate1RM(140, 1)).toBe(140);
        expect(estimate1RM(0, 10)).toBe(0);
        expect(estimate1RM(50, 0)).toBe(0);
    });
});

describe('sessionVolume', () => {
    it('ignores warm-up sets', () => {
        expect(sessionVolume([
            { weight_kg: 20, reps: 10, is_warmup: true },
            { weight_kg: 60, reps: 8 },
            { weight_kg: 60, reps: 7 },
        ])).toBe(900);
    });
});

describe('parseRepRange', () => {
    it('parses ranges, single numbers and timed sets', () => {
        expect(parseRepRange('8-12')).toEqual({ min: 8, max: 12 });
        expect(parseRepRange('10 – 15 reps')).toEqual({ min: 10, max: 15 });
        expect(parseRepRange('12')).toEqual({ min: 12, max: 12 });
        expect(parseRepRange(5)).toEqual({ min: 5, max: 5 });
        expect(parseRepRange('30s')).toBeNull();
        expect(parseRepRange('45 sec')).toBeNull();
        expect(parseRepRange('AMRAP')).toBeNull();
    });
});

describe('isLowerBody', () => {
    it('recognises English and Spanish lower-body lifts', () => {
        expect(isLowerBody('Barbell Back Squat')).toBe(true);
        expect(isLowerBody('Peso muerto rumano')).toBe(true);
        expect(isLowerBody('Bench Press')).toBe(false);
    });
});

describe('suggestNext', () => {
    it('adds 2.5 kg to upper-body lifts when every set hit the top of the range', () => {
        const next = suggestNext('Bench Press', '8-12', [
            { weight_kg: 60, reps: 12 },
            { weight_kg: 60, reps: 12 },
        ]);
        expect(next).toEqual({ weight_kg: 62.5, reps: 8, increased: true });
    });

    it('adds 5 kg to lower-body lifts', () => {
        const next = suggestNext('Back Squat', '5', [
            { weight_kg: 100, reps: 5 },
            { weight_kg: 100, reps: 5 },
            { weight_kg: 100, reps: 5 },
        ]);
        expect(next).toEqual({ weight_kg: 105, reps: 5, increased: true });
    });

    it('keeps the load and asks for one more rep when the range was not completed', () => {
        const next = suggestNext('Bench Press', '8-12', [
            { weight_kg: 60, reps: 10 },
            { weight_kg: 60, reps: 9 },
        ]);
        expect(next).toEqual({ weight_kg: 60, reps: 10, increased: false });
    });

    it('ignores warm-ups and judges only the heaviest working sets', () => {
        const next = suggestNext('Bench Press', '6-8', [
            { weight_kg: 40, reps: 10, is_warmup: true },
            { weight_kg: 70, reps: 8 },
            { weight_kg: 65, reps: 6 },
        ]);
        expect(next).toEqual({ weight_kg: 72.5, reps: 6, increased: true });
    });

    it('repeats the last performance for timed sets and returns null with no history', () => {
        expect(suggestNext('Plank', '45s', [{ weight_kg: 0, reps: 1 }]))
            .toEqual({ weight_kg: 0, reps: 1, increased: false });
        expect(suggestNext('Bench Press', '8-12', [])).toBeNull();
    });

    it('does not add load to bodyweight exercises', () => {
        expect(suggestNext('Push Up', '10-15', [{ weight_kg: 0, reps: 15 }]))
            .toEqual({ weight_kg: 0, reps: 15, increased: false });
    });
});

describe('personalRecords', () => {
    it('keeps the best e1RM and heaviest set per exercise, best first', () => {
        const prs = personalRecords([
            { exercise_name: 'Bench Press', weight_kg: 60, reps: 10 },
            { exercise_name: 'Bench Press', weight_kg: 70, reps: 3 },
            { exercise_name: 'Squat', weight_kg: 100, reps: 5 },
            { exercise_name: 'Squat', weight_kg: 120, reps: 1, is_warmup: true },
        ]);
        expect(prs).toEqual([
            { exercise_name: 'Squat', best_e1rm: 116.7, best_weight_kg: 100, best_reps_at_weight: 5 },
            { exercise_name: 'Bench Press', best_e1rm: 80, best_weight_kg: 70, best_reps_at_weight: 3 },
        ]);
    });
});

describe('unit conversion', () => {
    it('round-trips kg and lbs', () => {
        expect(kgToDisplay(100, 'lbs')).toBe(220.5);
        expect(kgToDisplay(100, 'kg')).toBe(100);
        expect(displayToKg(225, 'lbs')).toBe(102.06);
    });
});
