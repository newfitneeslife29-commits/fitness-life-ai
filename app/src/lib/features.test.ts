import { describe, expect, it } from 'vitest';
import { busyAlternatives, getExercise } from '../data/exercises';
import { womenProgram } from '../data/programs';
import type { Session } from '../store/types';
import { activitySummary, localDay, monthGrid } from './activity';
import { bmiBand, bmiOf, healthyWeightRange } from './nutrition';
import { recoveryAlerts, recoveryStatus } from './recovery';
import { equivalent, monthWrap } from './wrapped';

describe('busyAlternatives', () => {
    it('offers the same main muscle with dumbbells or cables first', () => {
        const options = busyAlternatives('prensa');
        expect(options.length).toBeGreaterThan(0);
        for (const e of options) {
            expect(e.muscle).toBe('cuadriceps');
            expect(e.equipment).not.toBe('maquina');
        }
        expect(options[0].equipment).toBe('mancuernas');
    });
    it('leaves out exercises already in the workout and keeps timed with timed', () => {
        const ids = busyAlternatives('jalon-pecho').map(e => e.id);
        expect(ids).not.toContain('jalon-pecho');
        expect(busyAlternatives('jalon-pecho', ['remo-mancuerna']).map(e => e.id)).not.toContain('remo-mancuerna');
        for (const e of busyAlternatives('pallof')) expect(!!e.timed).toBe(!!getExercise('pallof')?.timed);
    });
});

const sessionOn = (d: Date): Session => ({ id: d.toISOString(), routineId: null, routineName: 'x', startedAt: d.toISOString(), endedAt: d.toISOString(), sets: [] });

describe('activity', () => {
    const now = new Date(2026, 9, 12, 18); // 12 Oct 2026
    it('counts active and training days this month and the streaks', () => {
        const opened = ['2026-09-30', '2026-10-10', '2026-10-11'];
        const sessions = [sessionOn(new Date(2026, 9, 12, 9)), sessionOn(new Date(2026, 9, 5, 9))];
        const s = activitySummary(opened, sessions, now);
        expect(s.activeThisMonth).toBe(4); // 5, 10, 11, 12
        expect(s.trainedThisMonth).toBe(2);
        expect(s.activeStreak).toBe(3); // 10, 11, 12
        expect(s.bestStreak).toBe(3);
        expect(s.trainedTotal).toBe(2);
    });
    it('keeps a streak alive when today is not in yet', () => {
        expect(activitySummary(['2026-10-10', '2026-10-11'], [], now).activeStreak).toBe(2);
        expect(activitySummary(['2026-10-09'], [], now).activeStreak).toBe(0);
    });
    it('lays out a month in Monday-first weeks', () => {
        const grid = monthGrid(2026, 9, ['2026-10-01'], [sessionOn(new Date(2026, 9, 2, 9))], now);
        expect(grid.every(w => w.length === 7)).toBe(true);
        const days = grid.flat();
        expect(days[0].date.getDay()).toBe(1);
        expect(days.filter(d => d.inMonth)).toHaveLength(31);
        expect(days.find(d => localDay(d.date) === '2026-10-01')?.opened).toBe(true);
        expect(days.find(d => localDay(d.date) === '2026-10-02')?.trained).toBe(true);
        expect(days.find(d => localDay(d.date) === '2026-10-20')?.future).toBe(true);
    });
});

describe('bmi', () => {
    it('computes BMI, its band and the healthy range', () => {
        expect(bmiOf(80, 180)).toBeCloseTo(24.69, 1);
        expect(bmiBand(17)).toBe('under');
        expect(bmiBand(22)).toBe('normal');
        expect(bmiBand(27)).toBe('over');
        expect(bmiBand(31)).toBe('obese');
        expect(healthyWeightRange(180)).toEqual({ minKg: 59.9, maxKg: 80.7 });
    });
});

describe('womenProgram', () => {
    it('has a plan to lose and one to keep weight for every place, home included', () => {
        for (const aim of ['bajar', 'mantener'] as const) {
            for (const setup of ['casa', 'mancuernas', 'gimnasio'] as const) {
                const p = womenProgram(aim, setup);
                expect(p, `${aim} ${setup}`).toBeDefined();
                expect(p.setup).toBe(setup);
                expect(p.women).toBe(aim);
                expect(p.days.length).toBeGreaterThanOrEqual(3);
            }
        }
    });
});

describe('recovery', () => {
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString();
    const set = (exerciseId: string, i: number) => ({ id: `${exerciseId}${i}`, exerciseId, setIndex: i, weightKg: 50, reps: 8, completedAt: '' });
    const legs: Session = { id: 'a', routineId: null, routineName: 'Pierna', startedAt: at(10, 18), endedAt: at(10, 19), sets: [set('sentadilla', 1), set('sentadilla', 2), set('press-banca', 1)] };
    it('marks a group trained hard as recovering for 48 hours', () => {
        const status = recoveryStatus([legs], new Date(2026, 9, 11, 12).getTime());
        expect(status.map(s => s.group)).toEqual(['piernas']); // one set of chest is not enough
        expect(status[0].ready).toBe(false);
        expect(recoveryStatus([legs], new Date(2026, 9, 12, 20).getTime())[0].ready).toBe(true);
    });
    it('reminds one hour before the usual training time once rested', () => {
        const alerts = recoveryAlerts([legs], new Date(2026, 9, 11, 12));
        expect(alerts).toHaveLength(1);
        expect(alerts[0].groups).toEqual(['piernas']);
        // Rested on the 12th at 19:00; usually trains at 18:00 -> reminder on the 13th at 17:00.
        expect(alerts[0].at).toEqual(new Date(2026, 9, 13, 17));
        expect(recoveryAlerts([legs], new Date(2026, 9, 20, 12))).toHaveLength(0);
    });
});

describe('wrapped', () => {
    it('compares the weight lifted with the heaviest thing lifted at least once', () => {
        expect(equivalent(12_450)).toEqual({ key: 'bus', emoji: '🚌', count: 1 });
        expect(equivalent(11_000)?.key).toBe('elephant');
        expect(equivalent(11_000)?.count).toBe(1);
        expect(equivalent(14_000)?.count).toBe(1);
        expect(equivalent(25)).toBeNull();
    });
    it('sums the month and finds new records', () => {
        const s = (id: string, d: Date, w: number, r: number): Session => ({
            id, routineId: null, routineName: 'x', startedAt: d.toISOString(), endedAt: new Date(d.getTime() + 3_600_000).toISOString(),
            sets: [{ id: id + 's', exerciseId: 'press-banca', setIndex: 1, weightKg: w, reps: r, completedAt: '' }],
        });
        const sessions = [s('b', new Date(2026, 9, 3, 9), 80, 5), s('a', new Date(2026, 8, 20, 9), 75, 5)];
        const wrap = monthWrap(sessions, 2026, 9);
        expect(wrap.sessions).toBe(1);
        expect(wrap.volumeKg).toBe(400);
        expect(wrap.minutes).toBe(60);
        expect(wrap.trainedDays.size).toBe(1);
        expect(wrap.records).toEqual([{ exerciseId: 'press-banca', weightKg: 80, reps: 5, isNew: true }]);
    });
});
