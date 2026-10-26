import { describe, expect, it } from 'vitest';
import { addPoint, cardioKcal, distanceM, movingSec, pace, stepsFor, toDist } from './cardio';
import { sleepNights } from './health';
import { manualSleep, stepGoalOf, stepsOn, walkPlanStatus } from './movement';
import { actions, getState, stepsStart } from '../store/store';
import type { ActiveCardio, AppState } from '../store/types';

const start = (kind: ActiveCardio['kind'] = 'walk'): ActiveCardio =>
    ({ kind, startedAt: new Date(0).toISOString(), pausedAt: null, pausedMs: 0, distanceM: 0, last: null, gps: 'waiting' });

describe('cardio', () => {
    it('measures distance between GPS points', () => {
        // 0.001° of latitude is about 111 m.
        expect(distanceM({ lat: 40, lon: -3 }, { lat: 40.001, lon: -3 })).toBeCloseTo(111.2, 0);
    });

    it('adds walking distance, and skips inaccurate fixes, jitter, jumps and pauses', () => {
        let a = start();
        a = addPoint(a, { lat: 40, lon: -3, accuracy: 10, at: 0 });
        expect(a.gps).toBe('ok');
        a = addPoint(a, { lat: 40.0005, lon: -3, accuracy: 10, at: 60_000 }); // 55 m in a minute
        expect(a.distanceM).toBeCloseTo(55.6, 0);
        a = addPoint(a, { lat: 40.002, lon: -3, accuracy: 80, at: 70_000 }); // inaccurate
        a = addPoint(a, { lat: 40.000501, lon: -3, accuracy: 5, at: 80_000 }); // 0.1 m: jitter
        a = addPoint(a, { lat: 40.01, lon: -3, accuracy: 5, at: 81_000 }); // 1 km in a second: a jump
        expect(a.distanceM).toBeCloseTo(55.6, 0);
        a = addPoint({ ...a, pausedAt: 1 }, { lat: 40.02, lon: -3, accuracy: 5, at: 200_000 });
        expect(a.distanceM).toBeCloseTo(55.6, 0);
    });

    it('allows bike speeds a walk would not', () => {
        const fix = (a: ActiveCardio, lat: number, at: number) => addPoint(a, { lat, lon: -3, accuracy: 5, at });
        const ride = fix(fix(start('bike'), 40, 0), 40.0001, 1000); // 11 m in a second ≈ 40 km/h
        const walk = fix(fix(start('walk'), 40, 0), 40.0001, 1000);
        expect(ride.distanceM).toBeGreaterThan(10);
        expect(walk.distanceM).toBe(0);
    });

    it('leaves pauses out of the time', () => {
        const a = { ...start(), startedAt: new Date(0).toISOString(), pausedMs: 60_000 };
        expect(movingSec(a, 600_000)).toBe(540);
    });

    it('works out pace, miles, steps and calories', () => {
        expect(pace(5000, 3000, 'kg')).toBe(600); // 10:00 per km
        expect(toDist(1609.344, 'lbs')).toBeCloseTo(1);
        expect(stepsFor(1000, 180)).toBe(1339); // 74.7 cm steps
        expect(cardioKcal('walk', 5000, 3600, 80)).toBe(344); // 5 km/h → MET 4.3
        expect(cardioKcal('bike', 20000, 3600, 80)).toBe(640); // 20 km/h → MET 8
    });
});

describe('steps', () => {
    it('uses the saved count, or the steps of the day\'s walks', () => {
        const walk = { id: 'w', kind: 'walk' as const, startedAt: new Date(2026, 9, 14, 9).toISOString(), endedAt: '', durationSec: 1800, distanceM: 2000, steps: 2600, kcal: 100, source: 'gps' as const };
        expect(stepsOn({ steps: { '2026-10-14': 9000 }, cardio: [walk] }, '2026-10-14')).toBe(9000);
        expect(stepsOn({ steps: {}, cardio: [walk] }, '2026-10-14')).toBe(2600);
    });
});

describe('sleep', () => {
    it('groups Health samples by the morning, counting time asleep', () => {
        const nights = sleepNights([
            { startDate: '2026-10-13T23:00:00', endDate: '2026-10-14T02:00:00', sleepState: 'deep' },
            { startDate: '2026-10-14T02:00:00', endDate: '2026-10-14T02:30:00', sleepState: 'awake' },
            { startDate: '2026-10-14T02:30:00', endDate: '2026-10-14T07:00:00', sleepState: 'light' },
            { startDate: '2026-10-13T22:45:00', endDate: '2026-10-14T07:10:00', sleepState: 'inBed' },
        ]);
        expect(nights).toEqual([{ day: '2026-10-14', bedAt: new Date('2026-10-13T22:45:00').toISOString(), wakeAt: new Date('2026-10-14T07:10:00').toISOString(), minutes: 450 }]);
    });

    it('keeps a night together across midnight and counts overlaps once', () => {
        const nights = sleepNights([
            // Phone and watch record the same hours.
            { startDate: '2026-10-13T23:00:00', endDate: '2026-10-14T03:00:00', sleepState: 'light' },
            { startDate: '2026-10-13T23:30:00', endDate: '2026-10-14T03:00:00', sleepState: 'deep' },
            { startDate: '2026-10-14T03:20:00', endDate: '2026-10-14T07:00:00', sleepState: 'asleep' },
            // A nap the same afternoon doesn't replace the night.
            { startDate: '2026-10-14T15:00:00', endDate: '2026-10-14T16:10:00', sleepState: 'asleep' },
        ]);
        expect(nights).toEqual([{ day: '2026-10-14', bedAt: new Date('2026-10-13T23:00:00').toISOString(), wakeAt: new Date('2026-10-14T07:00:00').toISOString(), minutes: 460 }]);
    });

    it('takes bedtime from the evening before when typed by hand', () => {
        const e = manualSleep(new Date(2026, 9, 14), '23:30', '07:00');
        expect(e).toMatchObject({ day: '2026-10-14', minutes: 450, source: 'manual' });
        expect(manualSleep(new Date(2026, 9, 14), '01:00', '08:00').minutes).toBe(420);
    });
});

describe('walking plan', () => {
    it('follows the calendar week and the walks done', () => {
        const plan = { id: 'empezar', startedAt: new Date(2026, 9, 1, 10).toISOString(), done: ['1:0'] };
        const status = walkPlanStatus(plan, new Date(2026, 9, 9))!; // day 8: week 2
        expect(status).toMatchObject({ week: 1, walk: 1, doneThisWeek: 1, finished: false });
        expect(status.spec).toMatchObject({ minutes: 20, steps: 6000 });
        expect(stepGoalOf({ profile: null, walkPlan: null })).toBe(8000);
    });
});

describe('steps from Health and the phone sensor', () => {
    const profile = { createdAt: '2026-10-20T15:00:00.000Z' } as AppState['profile'];
    it('count from the first day the app was used', () => {
        expect(stepsStart({ profile, sessions: [], activeDays: [] }, new Date(2026, 9, 26))).toBe('2026-10-20');
        expect(stepsStart({ profile, sessions: [], activeDays: ['2026-10-12', '2026-10-20'] }, new Date(2026, 9, 26))).toBe('2026-10-12');
        expect(stepsStart({ profile: null, sessions: [], activeDays: [] }, new Date(2026, 9, 26))).toBe('2026-10-26');
    });
    it('leave out the weeks before, and clear them once', () => {
        actions.importData(JSON.stringify({ ...JSON.parse(actions.exportData()), profile, sessions: [], activeDays: [], steps: { '2026-10-01': 5000, '2026-10-21': 3000 } }));
        actions.recordSteps({ '2026-10-02': 7000, '2026-10-21': 4000, '2026-10-22': 6000 });
        expect(getState().steps).toEqual({ '2026-10-21': 4000, '2026-10-22': 6000 });
        expect(getState().stepsFrom).toBe('2026-10-20');
    });
});
