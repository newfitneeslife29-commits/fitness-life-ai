import { describe, expect, it } from 'vitest';
import { getExercise } from '../data/exercises';
import { buildPlan } from './plan';

describe('cardio machines at home', () => {
    const base = { goal: 'grasa' as const, level: 'intermedio' as const, daysPerWeek: 3, setup: 'casa' as const };

    it('end each home workout with a machine, in turn', () => {
        const { routines } = buildPlan({ ...base, homeGear: ['bici', 'cinta'] });
        const last = routines.map(r => r.exercises[r.exercises.length - 1]);
        expect(last.map(e => e.exerciseId)).toEqual(['bicicleta-estatica', 'caminadora', 'bicicleta-estatica'].slice(0, routines.length));
        expect(last[0]).toMatchObject({ sets: 1, repMin: 900, repMax: 1200 });
    });

    it('add nothing without machines or at the gym', () => {
        const none = buildPlan(base).routines.flatMap(r => r.exercises);
        const gym = buildPlan({ ...base, setup: 'gimnasio', homeGear: ['bici'] }).routines.flatMap(r => r.exercises);
        expect([...none, ...gym].some(e => getExercise(e.exerciseId)?.kind === 'cardio')).toBe(false);
    });

    it('never rotate gentle or cardio moves into other plans', () => {
        for (let week = 1; week <= 8; week++) {
            for (const setup of ['gimnasio', 'mancuernas', 'casa'] as const) {
                const ex = buildPlan({ ...base, setup }, week).routines.flatMap(r => r.exercises);
                expect(ex.some(e => getExercise(e.exerciseId)?.kind)).toBe(false);
            }
        }
    });
});
