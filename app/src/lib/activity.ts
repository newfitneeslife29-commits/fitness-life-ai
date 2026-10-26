import type { Session } from '../store/types';

// Days the app was opened and days with a workout, as local "YYYY-MM-DD".
export const localDay = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const trainedDays = (sessions: Session[]) => new Set(sessions.map(s => localDay(new Date(s.startedAt))));

// Training counts as being active even if the open was not recorded (older data).
const activeSet = (activeDays: string[], trained: Set<string>) => new Set([...activeDays, ...trained]);

// The Monday that starts the week of a day, as a local day.
const weekOf = (d: Date) => localDay(addDays(d, -((d.getDay() + 6) % 7)));

// Consecutive days counting back from today (or yesterday, if today is not in
// yet). Paused days (rest or injury mode, lib/pause.ts) neither break nor add.
// With `protect`, one missed day a week (Monday to Sunday) doesn't break it
// either, never two in a row: the streak protector. `saved` lists those days.
const streakIn = (days: Set<string>, now: Date, paused: Set<string> = new Set(), protect = false) => {
    const today = localDay(now);
    let d = days.has(today) || paused.has(today) ? now : addDays(now, -1);
    let n = 0;
    const saved: string[] = [];
    for (;;) {
        const k = localDay(d);
        if (days.has(k)) n++;
        else if (paused.has(k)) { /* neither breaks nor adds */ }
        else if (protect && n > 0 && saved.at(-1) !== localDay(addDays(d, 1)) && !saved.some(s => weekOf(new Date(`${s}T12:00`)) === weekOf(d))
            && days.has(localDay(addDays(d, -1)))) saved.push(k);
        else break;
        d = addDays(d, -1);
    }
    return { n, saved };
};

const longestRun = (days: Set<string>) => {
    let best = 0;
    for (const k of days) {
        const [y, m, d] = k.split('-').map(Number);
        const start = new Date(y, m - 1, d);
        if (days.has(localDay(addDays(start, -1)))) continue; // not the start of a run
        let n = 1;
        while (days.has(localDay(addDays(start, n)))) n++;
        best = Math.max(best, n);
    }
    return best;
};

export const activitySummary = (activeDays: string[], sessions: Session[], now = new Date(), paused?: Set<string>) => {
    const trained = trainedDays(sessions);
    const active = activeSet(activeDays, trained);
    const month = localDay(now).slice(0, 7);
    const inMonth = (s: Set<string>) => [...s].filter(k => k.startsWith(month)).length;
    const { n: activeStreak, saved } = streakIn(active, now, paused, true);
    return {
        activeThisMonth: inMonth(active),
        trainedThisMonth: inMonth(trained),
        activeStreak,
        // Days the protector kept the streak, and whether this week's is still free.
        streakSaved: saved,
        protectorLeft: !saved.some(k => weekOf(new Date(`${k}T12:00`)) === weekOf(now)),
        trainedStreak: streakIn(trained, now, paused).n,
        // A streak kept through a rest is the best one too.
        bestStreak: Math.max(longestRun(active), activeStreak),
        activeTotal: active.size,
        trainedTotal: trained.size,
    };
};

export interface ActivityDay {
    date: Date;
    inMonth: boolean;
    opened: boolean;
    trained: boolean;
    future: boolean;
}

// A month as weeks of 7 days (Monday first), padded with the days around it.
export const monthGrid = (year: number, month: number, activeDays: string[], sessions: Session[], now = new Date()): ActivityDay[][] => {
    const trained = trainedDays(sessions);
    const active = activeSet(activeDays, trained);
    const first = new Date(year, month, 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    const last = new Date(year, month + 1, 0);
    const weeks = Math.ceil(((first.getDay() + 6) % 7 + last.getDate()) / 7);
    const today = localDay(now);
    return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, w * 7 + i);
        const k = localDay(date);
        return { date, inMonth: date.getMonth() === month, opened: active.has(k), trained: trained.has(k), future: k > today };
    }));
};
