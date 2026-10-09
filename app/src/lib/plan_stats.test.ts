import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '../data/exercises';
import { adaptDays, getProgram, PROGRAMS, pickProgram } from '../data/programs';
import type { Level, Session, Setup } from '../store/types';
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
        const pick = (setup: Setup, daysPerWeek: number, level: Level = 'intermedio') => pickProgram({ setup, daysPerWeek, level }).id;
        expect(pick('gimnasio', 3)).toBe('gym-full-body');
        expect(pick('gimnasio', 4)).toBe('gym-upper-lower');
        expect(pick('gimnasio', 6)).toBe('gym-ppl');
        expect(pick('mancuernas', 2)).toBe('db-full-body');
        expect(pick('mancuernas', 4)).toBe('db-upper-lower');
        expect(pick('casa', 5)).toBe('home-bodyweight');
    });

    it('starts beginners with the first-steps programs', () => {
        expect(pickProgram({ setup: 'gimnasio', daysPerWeek: 3, level: 'principiante' }).id).toBe('gym-start');
        expect(pickProgram({ setup: 'mancuernas', daysPerWeek: 2, level: 'principiante' }).id).toBe('db-start');
        expect(pickProgram({ setup: 'casa', daysPerWeek: 4, level: 'principiante' }).id).toBe('home-start');
        // Training 5+ days already: the regular split.
        expect(pickProgram({ setup: 'gimnasio', daysPerWeek: 5, level: 'principiante' }).id).toBe('gym-ppl');
    });

    it('never picks a Premium program on its own', () => {
        for (const setup of ['gimnasio', 'mancuernas', 'casa'] as const) {
            for (const daysPerWeek of [2, 3, 4, 5, 6]) {
                for (const level of ['principiante', 'intermedio', 'avanzado'] as const) {
                    expect(getProgram(pickProgram({ setup, daysPerWeek, level }).id)?.premium).toBeFalsy();
                }
            }
        }
        expect(PROGRAMS.filter(p => p.premium).length).toBeGreaterThanOrEqual(5);
    });

    it('swaps exercises that load a sore joint, within the setup', () => {
        const home = adaptDays(getProgram('home-start')!, ['rodillas']);
        const ids = home.flatMap(d => d.slots.map(s => s.exerciseId));
        expect(ids).not.toContain('sentadilla-libre');
        expect(ids).not.toContain('zancadas-libres');
        for (const id of ids) expect(getExercise(id)!.equipment).toBe('peso corporal');
        // No repeats inside a day.
        for (const day of home) expect(new Set(day.slots.map(s => s.exerciseId)).size).toBe(day.slots.length);

        const gym = adaptDays(getProgram('gym-full-body')!, ['espalda', 'hombros']);
        const gymIds = gym.flatMap(d => d.slots.map(s => s.exerciseId));
        expect(gymIds).not.toContain('peso-muerto-rumano');
        expect(gymIds).not.toContain('press-militar');
        expect(gymIds).not.toContain('remo-barra');

        const plan = buildPlan({ goal: 'salud', level: 'principiante', daysPerWeek: 3, setup: 'casa', limitations: ['munecas'] });
        expect(plan.routines.flatMap(r => r.exercises.map(e => e.exerciseId))).not.toContain('flexiones');
    });

    it('uses the program picked from the list', () => {
        const { plan } = buildPlan({ goal: 'musculo', level: 'intermedio', daysPerWeek: 3, setup: 'gimnasio', programId: 'premium-glutes' });
        expect(plan.programId).toBe('premium-glutes');
    });

    it('sets reps by goal and sets by level', () => {
        const strength = buildPlan({ goal: 'fuerza', level: 'principiante', daysPerWeek: 3, setup: 'gimnasio' });
        const squat = strength.routines[0].exercises[0];
        expect(squat).toMatchObject({ exerciseId: 'prensa', sets: 3, repMin: 4, repMax: 6, restSec: 180 });

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
