import { describe, expect, it } from 'vitest';
import type { Routine, Session } from '../store/types';
import { createActiveWorkout, finishWorkout } from './workout';

const routine: Routine = {
    id: 'r1',
    name: 'Torso',
    source: 'custom',
    exercises: [
        { exerciseId: 'press-banca', sets: 3, repMin: 8, repMax: 12, restSec: 120 },
        { exerciseId: 'flexiones', sets: 2, repMin: 10, repMax: 15, restSec: 60 },
        { exerciseId: 'remo-barra', sets: 2, repMin: 8, repMax: 12, restSec: 90 },
    ],
};

const history: Session[] = [{
    id: 's1',
    routineId: 'r1',
    routineName: 'Torso',
    startedAt: '2026-10-01T18:00:00.000Z',
    endedAt: '2026-10-01T19:00:00.000Z',
    sets: [
        { id: 'a', exerciseId: 'press-banca', setIndex: 1, weightKg: 60, reps: 12, completedAt: '2026-10-01T18:05:00.000Z' },
        { id: 'b', exerciseId: 'press-banca', setIndex: 2, weightKg: 60, reps: 12, completedAt: '2026-10-01T18:08:00.000Z' },
        { id: 'c', exerciseId: 'flexiones', setIndex: 1, weightKg: 0, reps: 14, completedAt: '2026-10-01T18:20:00.000Z' },
    ],
}];

describe('createActiveWorkout', () => {
    const active = createActiveWorkout(routine, history, new Date('2026-10-07T18:00:00.000Z'));

    it('prefills the progression suggestion from history', () => {
        expect(active.exercises[0].sets).toHaveLength(3);
        expect(active.exercises[0].sets[0]).toMatchObject({ weightKg: 62.5, reps: 8, done: false });
        expect(active.exercises[1].sets[0]).toMatchObject({ weightKg: 0, reps: 15 });
    });

    it('starts new exercises at 0 kg and the bottom of the range', () => {
        expect(active.exercises[2].sets[0]).toMatchObject({ weightKg: 0, reps: 8 });
    });

    it('supports an empty free workout', () => {
        expect(createActiveWorkout(null, history).exercises).toEqual([]);
        expect(createActiveWorkout(null, history).routineName).toBe('Entreno libre');
    });
});

describe('finishWorkout', () => {
    it('keeps only completed sets and numbers them per exercise', () => {
        const active = createActiveWorkout(routine, history);
        active.exercises[0].sets[0].done = true;
        active.exercises[0].sets[2].done = true;
        active.exercises[1].sets[1].done = true;
        const session = finishWorkout(active, new Date('2026-10-07T19:00:00.000Z'))!;
        expect(session.sets.map(s => [s.exerciseId, s.setIndex])).toEqual([
            ['press-banca', 1], ['press-banca', 2], ['flexiones', 1],
        ]);
        expect(session.endedAt).toBe('2026-10-07T19:00:00.000Z');
        expect(session.routineId).toBe('r1');
    });

    it('discards a workout without completed sets', () => {
        expect(finishWorkout(createActiveWorkout(routine, history))).toBeNull();
    });
});
