import type { AppState } from '../store/types';
import { localDay } from './activity';

// The welcome challenge: four small steps in the first 7 days, so a new
// person finds the app's core (training, food, water) before the habit fades.
// Counted from the person's own data; three workouts that week also earn the
// "Good start" medal (lib/achievements.ts).

export const WELCOME_DAYS = 7;
const DAY_MS = 86_400_000;

export const WELCOME_STEPS = ['workout', 'meal', 'water', 'three'] as const;
export type WelcomeStep = typeof WELCOME_STEPS[number];

type Data = Pick<AppState, 'sessions' | 'meals' | 'water'>;

export interface Welcome {
    done: Record<WelcomeStep, boolean>;
    count: number;
    daysLeft: number; // 0 once the week is over
}

export const welcomeStatus = (data: Data, startedAt: string, now = new Date()): Welcome => {
    const from = Date.parse(startedAt);
    const until = from + WELCOME_DAYS * DAY_MS;
    const inWeek = (iso: string) => {
        const t = Date.parse(iso);
        return t >= from && t < until;
    };
    const workouts = data.sessions.filter(s => inWeek(s.startedAt)).length;
    const firstDay = localDay(new Date(from));
    const lastDay = localDay(new Date(until - 1));
    const done: Record<WelcomeStep, boolean> = {
        workout: workouts >= 1,
        meal: data.meals.some(m => inWeek(m.date)),
        water: Object.entries(data.water ?? {}).some(([day, ml]) => ml > 0 && day >= firstDay && day <= lastDay),
        three: workouts >= 3,
    };
    return {
        done,
        count: WELCOME_STEPS.filter(s => done[s]).length,
        daysLeft: Math.max(0, Math.ceil((until - now.getTime()) / DAY_MS)),
    };
};
