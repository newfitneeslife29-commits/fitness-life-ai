import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '../data/exercises';
import { PROGRAMS, pickProgram } from '../data/programs';
import type { Session } from '../store/types';
import { buildPlan } from './plan';
import { exerciseSeries, lastPerformance, sessionsThisWeek, setsPerMuscle, streakWeeks, weekStart, weeklySeries } from './stats';

describe('catalog integrity', () => {
    it('has unique exercise ids', () => {
        expect(new Set(EXERCISES.map(e => e.id)).size).toBe(EXERCISES.length);
    });
    it('only references existing exercises that match the program setup', () => {
        const allowed = {
            gimnasio: ['barra', 'mancuernas', 'maquina', 'polea', 'peso corporal', 'kettlebell'],
            mancuernas: ['mancuernas', 'peso corporal'],
            casa: ['peso corporal'],
        };
        for (const p of PROGRAMS) {
            for (const day of p.days) {
                for (const slot of day.slots) {
                    const ex = getExercise(slot.exerciseId);
                    expect(ex, `${p.id}: ${slot.exerciseId}`).toBeDefined();
                    expect(allowed[p.setup]).toContain(ex!.equipment);
                }
            }
        }
    });
});

describe('pickProgram / buildPlan', () => {
    it('picks a program by setup and days per week', () => {
        expect(pickProgram('gimnasio', 3).id).toBe('gym-full-body');
        expect(pickProgram('gimnasio', 4).id).toBe('gym-upper-lower');
        expect(pickProgram('gimnasio', 6).id).toBe('gym-ppl');
        expect(pickProgram('mancuernas', 2).id).toBe('db-full-body');
        expect(pickProgram('mancuernas', 4).id).toBe('db-upper-lower');
        expect(pickProgram('casa', 5).id).toBe('home-bodyweight');
    });

    it('sets reps by goal and sets by level', () => {
        const strength = buildPlan({ goal: 'fuerza', level: 'principiante', daysPerWeek: 3, setup: 'gimnasio' });
        const squat = strength.routines[0].exercises[0];
        expect(squat).toMatchObject({ exerciseId: 'sentadilla', sets: 3, repMin: 4, repMax: 6, restSec: 180 });

        const muscle = buildPlan({ goal: 'musculo', level: 'avanzado', daysPerWeek: 3, setup: 'gimnasio' });
        expect(muscle.routines[0].exercises[0]).toMatchObject({ sets: 4, repMin: 6, repMax: 10 });
        const plank = muscle.routines[0].exercises.find(e => e.exerciseId === 'plancha');
        expect(plank).toMatchObject({ repMin: 20, repMax: 45 });

        expect(strength.plan.routineIds).toEqual(strength.routines.map(r => r.id));
        expect(strength.plan.nextIndex).toBe(0);
    });
});

const session = (startedAt: string, sets: [string, number, number][]): Session => ({
    id: startedAt,
    routineId: null,
    routineName: 'Test',
    startedAt,
    endedAt: startedAt,
    sets: sets.map(([exerciseId, weightKg, reps], i) => ({ id: `${startedAt}-${i}`, exerciseId, setIndex: i + 1, weightKg, reps, completedAt: startedAt })),
});

describe('stats', () => {
    // Wednesday 7 Oct 2026, local time.
    const now = new Date(2026, 9, 7, 12);
    const sessions = [
        session(new Date(2026, 9, 6, 18).toISOString(), [['press-banca', 62.5, 8], ['sentadilla', 100, 5]]),
        session(new Date(2026, 9, 1, 18).toISOString(), [['press-banca', 60, 10]]),
        session(new Date(2026, 8, 15, 18).toISOString(), [['flexiones', 0, 15]]),
    ];

    it('starts weeks on Monday', () => {
        expect(weekStart(now).getDay()).toBe(1);
        expect(weekStart(now).getDate()).toBe(5);
    });

    it('counts this week and the streak', () => {
        expect(sessionsThisWeek(sessions, now)).toHaveLength(1);
        expect(streakWeeks(sessions, now)).toBe(2); // this week + last week; two weeks ago is empty
        expect(streakWeeks([], now)).toBe(0);
    });

    it('builds weekly series oldest first', () => {
        const series = weeklySeries(sessions, 3, now);
        expect(series.map(w => w.sessions)).toEqual([0, 1, 1]);
        expect(series[2].volumeKg).toBe(62.5 * 8 + 100 * 5);
    });

    it('counts sets per primary muscle', () => {
        expect(setsPerMuscle(sessions)).toEqual({ pecho: 3, cuadriceps: 1 });
    });

    it('charts e1RM for loaded lifts and reps for bodyweight', () => {
        expect(exerciseSeries(sessions, 'press-banca').map(p => p.value)).toEqual([80, 79.2]);
        expect(exerciseSeries(sessions, 'flexiones').map(p => p.value)).toEqual([15]);
    });

    it('finds the last performance of an exercise', () => {
        expect(lastPerformance(sessions, 'press-banca').map(s => s.weightKg)).toEqual([62.5]);
        expect(lastPerformance(sessions, 'dominadas')).toEqual([]);
    });
});

describe('trainingCalendar', () => {
    it('lays out Monday-first weeks ending this week and marks trained days', async () => {
        const { trainingCalendar } = await import('./stats');
        const now = new Date(2026, 9, 7, 12); // Wednesday
        const cal = trainingCalendar([session(new Date(2026, 9, 6, 18).toISOString(), [['press-banca', 60, 10]])], 2, now);
        expect(cal).toHaveLength(2);
        expect(cal[0][0].date.getDay()).toBe(1);
        expect(cal[1][1]).toMatchObject({ count: 1, volumeKg: 600, future: false }); // Tue 6 Oct
        expect(cal[1][2].future).toBe(false); // today
        expect(cal[1][3].future).toBe(true);
    });
});
