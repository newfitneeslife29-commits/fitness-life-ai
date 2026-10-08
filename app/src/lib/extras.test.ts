import { describe, expect, it } from 'vitest';
import type { Session } from '../store/types';
import { unlockedAchievements } from './achievements';
import { platesFor, warmupSets } from './plates';
import { kgToDisplay, stepForUnit } from './progression';

describe('stepForUnit', () => {
    it('keeps kg steps and maps them to real plate jumps in lb', () => {
        expect(stepForUnit(2.5, 'kg')).toBe(2.5);
        expect(kgToDisplay(stepForUnit(2.5, 'lbs'), 'lbs')).toBe(5);
        expect(kgToDisplay(stepForUnit(5, 'lbs'), 'lbs')).toBe(10);
        expect(kgToDisplay(stepForUnit(1, 'lbs'), 'lbs')).toBe(2.5);
        expect(stepForUnit(0, 'lbs')).toBe(0);
    });
});

describe('platesFor', () => {
    it('loads the heaviest plates first, per side', () => {
        expect(platesFor(100, 'kg')).toEqual({ perSide: [25, 15], loaded: 100, exact: true });
        expect(platesFor(62.5, 'kg')).toEqual({ perSide: [20, 1.25], loaded: 62.5, exact: true });
        expect(platesFor(225, 'lbs')).toEqual({ perSide: [45, 45], loaded: 225, exact: true });
    });
    it('handles the empty bar and weights that cannot be made exactly', () => {
        expect(platesFor(20, 'kg')).toEqual({ perSide: [], loaded: 20, exact: true });
        expect(platesFor(15, 'kg').exact).toBe(false);
        expect(platesFor(61, 'kg')).toEqual({ perSide: [20], loaded: 60, exact: false });
    });
});

describe('warmupSets', () => {
    it('ramps from the empty bar to ~85%', () => {
        expect(warmupSets(100, 'kg')).toEqual([
            { weightKg: 20, reps: 10 }, { weightKg: 50, reps: 5 }, { weightKg: 70, reps: 3 }, { weightKg: 85, reps: 1 },
        ]);
    });
    it('skips warm-ups for light loads and duplicate steps', () => {
        expect(warmupSets(25, 'kg')).toEqual([]);
        expect(warmupSets(40, 'kg').map(s => s.weightKg)).toEqual([20, 27.5, 35]);
    });
});

const day = (iso: string, sets: [string, number, number][]): Session => ({
    id: iso,
    routineId: null,
    routineName: 'T',
    startedAt: iso,
    endedAt: iso,
    sets: sets.map(([exerciseId, weightKg, reps], i) => ({ id: `${iso}${i}`, exerciseId, setIndex: i + 1, weightKg, reps, completedAt: iso })),
});

describe('unlockedAchievements', () => {
    it('unlocks at the session that earned each achievement', () => {
        const s1 = day(new Date(2026, 8, 7, 7, 30).toISOString(), [['sentadilla', 100, 5]]);
        const s2 = day(new Date(2026, 8, 9, 18).toISOString(), [['sentadilla', 105, 5], ['press-banca', 60, 10]]);
        const s3 = day(new Date(2026, 8, 11, 22).toISOString(), Array.from({ length: 10 }, () => ['sentadilla', 100, 5] as [string, number, number]));
        const got = unlockedAchievements([s3, s1, s2], 3);
        expect(got.get('primer-entreno')?.sessionId).toBe(s1.id);
        expect(got.get('madrugador')?.sessionId).toBe(s1.id);
        expect(got.get('primer-record')?.sessionId).toBe(s2.id);
        expect(got.get('semana-completa')?.sessionId).toBe(s3.id);
        expect(got.get('sesion-5t')?.sessionId).toBe(s3.id);
        expect(got.get('nocturno')?.sessionId).toBe(s3.id);
        expect(got.has('racha-4')).toBe(false);
    });

    it('counts a 4-week streak', () => {
        const weeks = [1, 8, 15, 22].map(d => day(new Date(2026, 8, d, 18).toISOString(), [['flexiones', 0, 10]]));
        expect(unlockedAchievements(weeks, 3).get('racha-4')?.sessionId).toBe(weeks[3].id);
    });
});
