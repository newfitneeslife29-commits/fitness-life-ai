import { describe, expect, it } from 'vitest';
import { cleanRoutine, summarize } from './trainerTools';
import type { Session } from '../store/types';

describe('routines sent by the trainer', () => {
    it('keeps known exercises with sane numbers', () => {
        expect(cleanRoutine({
            name: '  Pierna fuerte  ',
            exercises: [
                { exerciseId: 'sentadilla', sets: 50, repMin: 12, repMax: 6, restSec: 5000 },
                { exerciseId: 'not-an-exercise', sets: 3, repMin: 8, repMax: 12, restSec: 90 },
                { exerciseId: 'press-banca', sets: 'x', repMin: null, repMax: 10, restSec: 60 },
            ],
        })).toEqual({
            name: 'Pierna fuerte',
            exercises: [
                { exerciseId: 'sentadilla', sets: 20, repMin: 12, repMax: 12, restSec: 900 },
                { exerciseId: 'press-banca', sets: 3, repMin: 8, repMax: 10, restSec: 60 },
            ],
        });
    });

    it('refuses anything else', () => {
        expect(cleanRoutine(null)).toBeNull();
        expect(cleanRoutine({ name: 'x', exercises: [{ exerciseId: 'nope' }] })).toBeNull();
        expect(cleanRoutine({ exercises: [] })).toBeNull();
    });
});

describe("the client's workout for the trainer", () => {
    it('sums up the working sets', () => {
        const at = (m: number) => new Date(Date.UTC(2026, 9, 20, 10, m)).toISOString();
        const s: Session = {
            id: 's1', routineId: null, routineName: 'Pecho', startedAt: at(0), endedAt: at(45),
            sets: [
                { id: 'a', exerciseId: 'press-banca', setIndex: 0, weightKg: 40, reps: 10, warmup: true, completedAt: at(5) },
                { id: 'b', exerciseId: 'press-banca', setIndex: 1, weightKg: 60, reps: 8, completedAt: at(10) },
                { id: 'c', exerciseId: 'press-banca', setIndex: 2, weightKg: 60, reps: 7, completedAt: at(15) },
                { id: 'd', exerciseId: 'flexiones', setIndex: 0, weightKg: 0, reps: 15, completedAt: at(20) },
            ],
        };
        const w = summarize(s);
        expect(w).toMatchObject({ name: 'Pecho', durationMin: 45, sets: 3, volumeKg: 900 });
        expect(w.exercises.map(e => [e.id, e.sets])).toEqual([
            ['press-banca', [{ kg: 60, reps: 8 }, { kg: 60, reps: 7 }]],
            ['flexiones', [{ kg: 0, reps: 15 }]],
        ]);
    });
});
