import { describe, expect, it } from 'vitest';
import { workoutAround } from '../data/programs';
import { activitySummary } from './activity';
import { currentPause, daysLeft, endPause, injuryPause, pausedDays, restPause } from './pause';
import { pauseEndAt } from './reminders';

const at = (d: number, h = 10) => new Date(2026, 9, d, h);

describe('rest and injury mode', () => {
    it('a rest lasts the days chosen', () => {
        const p = restPause(3, at(20));
        expect(p).toEqual({ kind: 'rest', zones: [], from: '2026-10-20', until: '2026-10-22' });
        expect(currentPause({ pause: p }, at(22))).toEqual(p);
        expect(currentPause({ pause: p }, at(23))).toBeNull();
        expect(daysLeft(p, at(20))).toBe(3);
        expect(daysLeft(p, at(22))).toBe(1);
    });

    it('an injury lasts until it is ended, at most 60 days', () => {
        const p = injuryPause(['rodillas'], at(1));
        expect(currentPause({ pause: p }, at(30))).toEqual(p);
        expect(currentPause({ pause: p }, new Date(2026, 10, 29))).toEqual(p);
        expect(currentPause({ pause: p }, new Date(2026, 10, 30))).toBeNull();
    });

    it('the streak waits through paused days', () => {
        // Active on the 10th–12th, paused 13th–16th, active again on the 17th.
        const active = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-17'];
        const profile = { pause: null, pastPauses: [{ from: '2026-10-13', to: '2026-10-16' }] };
        expect(activitySummary(active, [], at(17)).activeStreak).toBe(1);
        expect(activitySummary(active, [], at(17), pausedDays(profile, at(17))).activeStreak).toBe(4);
        // While still paused today, the streak shows what was kept.
        const resting = { pause: restPause(7, at(13)) };
        expect(activitySummary(active.slice(0, 3), [], at(15), pausedDays(resting, at(15))).activeStreak).toBe(3);
        // Without the pause, two missed days end it.
        expect(activitySummary(active.slice(0, 3), [], at(15)).activeStreak).toBe(0);
    });

    it('ending a pause keeps it for the streak', () => {
        const p = injuryPause(['espalda'], at(5));
        const ended = endPause({ pause: p }, at(9));
        expect(ended).toEqual({ pause: null, pastPauses: [{ from: '2026-10-05', to: '2026-10-09' }] });
        expect(pausedDays(ended, at(20)).has('2026-10-07')).toBe(true);
        expect(pausedDays(ended, at(20)).has('2026-10-10')).toBe(false);
    });

    it('injured workouts swap the exercises that load the zone, or leave them out', () => {
        const ex = (exerciseId: string) => ({ exerciseId, sets: 3, repMin: 8, repMax: 12, restSec: 90 });
        const r = workoutAround([ex('sentadilla'), ex('press-banca'), ex('escaladores')], ['rodillas'], 'gimnasio');
        expect(r.exercises.map(e => e.exerciseId)).toEqual(['hip-thrust', 'press-banca', 'dead-bug']);
        expect(r).toMatchObject({ swapped: 2, removed: 0 });
        // At home there is no hip thrust machine: the glute bridge instead.
        expect(workoutAround([ex('sentadilla')], ['rodillas'], 'casa').exercises[0].exerciseId).toBe('puente-gluteo');
        // Nothing to swap to: left out.
        const out = workoutAround([ex('curl-barra'), ex('curl-martillo')], ['munecas'], 'gimnasio');
        expect(out.exercises.map(e => e.exerciseId)).toEqual(['curl-martillo']);
        expect(out).toMatchObject({ swapped: 0, removed: 1 });
    });
});

describe('launch fixes', () => {
    it('an injury swap from reps to a hold gets seconds, and back', () => {
        const ex = (exerciseId: string, repMin: number, repMax: number) => ({ exerciseId, sets: 3, repMin, repMax, restSec: 60 });
        const knees = workoutAround([ex('escaladores', 20, 45)], ['rodillas'], 'casa').exercises[0];
        expect(knees).toMatchObject({ exerciseId: 'dead-bug', repMin: 8, repMax: 12 });
        const back = workoutAround([ex('crunch', 12, 15)], ['espalda'], 'casa').exercises[0];
        expect(back).toMatchObject({ exerciseId: 'dead-bug', repMin: 12, repMax: 15 });
    });

    it('the morning after a rest, a reminder to come back', () => {
        expect(pauseEndAt('2026-10-31')).toEqual(new Date(2026, 10, 1, 9, 0, 0));
        expect(pauseEndAt('2026-10-22', '18:30')).toEqual(new Date(2026, 9, 23, 18, 30, 0));
    });
});
