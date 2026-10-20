import { useEffect } from 'react';
import { getState, useStore } from '../store/store';
import type { AppState } from '../store/types';
import { localDay } from './activity';
import { stepsOn } from './movement';
import { durationMin, weekStart } from './stats';
import { getSupabase } from './supabase';

// Weekly ranking among friends: the app sends this week's totals (workouts,
// minutes moving, steps) and shows them next to the people the person follows.

export interface WeekTotals { workouts: number; minutes: number; steps: number }

export const weekTotals = (state: Pick<AppState, 'sessions' | 'cardio' | 'steps'>, now = new Date()): WeekTotals => {
    const start = weekStart(now);
    const from = localDay(start);
    const inWeek = (iso: string) => localDay(new Date(iso)) >= from;
    const sessions = state.sessions.filter(s => inWeek(s.startedAt));
    const cardio = (state.cardio ?? []).filter(c => inWeek(c.startedAt));
    let steps = 0;
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) steps += stepsOn(state, localDay(d));
    return {
        workouts: Math.min(50, sessions.length),
        minutes: Math.min(10_000, Math.round(sessions.reduce((m, s) => m + durationMin(s), 0) + cardio.reduce((m, c) => m + c.durationSec / 60, 0))),
        steps: Math.min(1_000_000, Math.round(steps)),
    };
};

export const weekKey = (now = new Date()) => localDay(weekStart(now));

let sent = '';
export const useFriendsWeekSync = () => {
    const account = useStore(s => s.account?.id ?? null);
    const sessions = useStore(s => s.sessions);
    const cardio = useStore(s => s.cardio);
    const steps = useStore(s => s.steps);
    useEffect(() => {
        if (!account) return;
        const week = weekKey();
        const totals = weekTotals({ sessions, cardio, steps });
        const key = `${account}:${week}:${totals.workouts}:${totals.minutes}:${totals.steps}`;
        if (key === sent) return;
        const timer = window.setTimeout(() => {
            void getSupabase().then(s => s.from('weekly_stats').upsert(
                { user_id: account, week, ...totals, updated_at: new Date().toISOString() }, { onConflict: 'user_id,week' },
            )).then(r => { if (!r.error) sent = key; }).catch(() => {});
        }, 3000);
        return () => window.clearTimeout(timer);
    }, [account, sessions, cardio, steps]);
};

export interface FriendRow extends WeekTotals { userId: string; name: string; avatarPath: string | null; avatarUpdated: string | null; me: boolean }

export const fetchFriendsWeek = async (): Promise<FriendRow[]> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('friends_week', { week: weekKey() });
    if (error) throw error;
    const rows = ((data ?? []) as { user_id: string; name: string; avatar_path: string | null; avatar_updated: string | null; workouts: number; minutes: number; steps: number; me: boolean }[])
        .map(r => ({ userId: r.user_id, name: r.name, avatarPath: r.avatar_path, avatarUpdated: r.avatar_updated, workouts: r.workouts, minutes: r.minutes, steps: r.steps, me: r.me }));
    // My row from this phone's data, even before it reaches the server.
    const account = getState().account;
    if (account && !rows.some(r => r.me)) {
        rows.push({ userId: account.id, name: '', avatarPath: null, avatarUpdated: null, me: true, ...weekTotals(getState()) });
    }
    return rows;
};
