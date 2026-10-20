import { localDay } from './activity';
import type { Pause, Profile } from '../store/types';

// Rest or injury mode. While it lasts the streak waits (those days neither
// break nor add to it), the streak and training reminders stop and, when
// injured, workouts swap or leave out the exercises that load the sore zones
// (data/programs.ts workoutAround). Past pauses are kept so the streak stays
// whole after coming back.

export const REST_DAYS = [3, 7, 14] as const;
// Days the streak can wait at most, so an old forgotten pause doesn't keep it forever.
export const MAX_PAUSE_DAYS = 60;

const addDays = (day: string, n: number) => {
    const [y, m, d] = day.split('-').map(Number);
    return localDay(new Date(y, m - 1, d + n));
};

export const restPause = (days: number, now = new Date()): Pause => {
    const from = localDay(now);
    return { kind: 'rest', zones: [], from, until: addDays(from, days - 1) };
};

export const injuryPause = (zones: Pause['zones'], now = new Date()): Pause => ({ kind: 'injury', zones, from: localDay(now), until: null });

// The pause in force today (a rest that ended is over).
export const currentPause = (profile: Pick<Profile, 'pause'> | null | undefined, now = new Date()): Pause | null => {
    const p = profile?.pause;
    if (!p) return null;
    const today = localDay(now);
    if (p.from > today) return null;
    if (p.until && p.until < today) return null;
    if (addDays(p.from, MAX_PAUSE_DAYS - 1) < today) return null;
    return p;
};

// The days the streak waits: past pauses and the current one up to today.
export const pausedDays = (profile: Pick<Profile, 'pause' | 'pastPauses'> | null | undefined, now = new Date()): Set<string> => {
    const days = new Set<string>();
    const today = localDay(now);
    const add = (from: string, to: string) => {
        const last = [to, today, addDays(from, MAX_PAUSE_DAYS - 1)].sort()[0];
        for (let d = from; d <= last; d = addDays(d, 1)) days.add(d);
    };
    for (const p of profile?.pastPauses ?? []) add(p.from, p.to);
    const p = profile?.pause;
    if (p && p.from <= today) add(p.from, p.until ?? today);
    return days;
};

// Ending the pause today: it joins the past ones (the last 20).
export const endPause = (profile: Pick<Profile, 'pause' | 'pastPauses'>, now = new Date()): Pick<Profile, 'pause' | 'pastPauses'> => {
    const p = profile.pause;
    if (!p) return { pause: null, pastPauses: profile.pastPauses };
    const today = localDay(now);
    const to = p.until && p.until < today ? p.until : today;
    const past = p.from <= to ? [...(profile.pastPauses ?? []), { from: p.from, to }] : profile.pastPauses ?? [];
    return { pause: null, pastPauses: past.slice(-20) };
};

export const daysLeft = (p: Pause, now = new Date()) => {
    if (!p.until) return null;
    const [y, m, d] = p.until.split('-').map(Number);
    const end = new Date(y, m - 1, d);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
};
