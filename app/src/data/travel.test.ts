import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getExercise } from './exercises';
import { HOW_TO } from './howto';
import { ADVENT_WORKOUTS, QUICK_WORKOUTS, TRAVEL_WORKOUTS, travelName, travelRoutine } from './travel';

describe('one-tap workouts', () => {
    it('use exercises that exist, have their steps, and covers that exist', () => {
        for (const w of [...TRAVEL_WORKOUTS, ...ADVENT_WORKOUTS, ...QUICK_WORKOUTS]) {
            for (const e of w.exercises) {
                expect(getExercise(e.exerciseId), `${w.id}: ${e.exerciseId}`).toBeTruthy();
                expect(HOW_TO[e.exerciseId], `${w.id}: steps for ${e.exerciseId}`).toBeTruthy();
                expect(e.repMin).toBeLessThanOrEqual(e.repMax);
            }
        }
        for (const w of QUICK_WORKOUTS) expect(existsSync(`public/covers/${w.cover}.webp`), w.cover).toBe(true);
        expect(new Set([...TRAVEL_WORKOUTS, ...ADVENT_WORKOUTS, ...QUICK_WORKOUTS].map(w => w.id)).size).toBe(TRAVEL_WORKOUTS.length + ADVENT_WORKOUTS.length + QUICK_WORKOUTS.length);
    });

    it('keep their name in the history', () => {
        const r = travelRoutine(QUICK_WORKOUTS[0]);
        expect(travelName(r.dayKey!)).toBe('Pecho y tríceps');
    });
});
