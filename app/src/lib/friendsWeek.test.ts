import { describe, expect, it } from 'vitest';
import { weekKey, weekTotals } from './friendsWeek';
import type { CardioSession, Session } from '../store/types';

const s = (day: number, min: number): Session => ({
    id: `s${day}`, routineId: null, routineName: 'X', sets: [],
    startedAt: new Date(2026, 9, day, 18).toISOString(), endedAt: new Date(2026, 9, day, 18, min).toISOString(),
});

describe('weekly ranking totals', () => {
    it('counts Monday to now', () => {
        const now = new Date(2026, 9, 21, 12); // Wednesday
        expect(weekKey(now)).toBe('2026-10-19');
        const cardio = [{ id: 'c', kind: 'walk', startedAt: new Date(2026, 9, 20, 8).toISOString(), endedAt: '', durationSec: 1800, distanceM: 2000, steps: 0, kcal: 0, source: 'manual' }] as CardioSession[];
        expect(weekTotals({ sessions: [s(18, 60), s(19, 45), s(20, 30)], cardio, steps: { '2026-10-18': 9000, '2026-10-19': 8000, '2026-10-21': 4000 } }, now))
            .toEqual({ workouts: 2, minutes: 105, steps: 12000 });
    });
});
