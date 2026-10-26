import { useEffect } from 'react';
import { toast } from '../components/feedback';
import { getExercise } from '../data/exercises';
import { t, type Key } from '../i18n';
import { actions, getState, useStore } from '../store/store';
import type { AppState, JoinedChallenge } from '../store/types';
import { localDay } from './activity';
import { stepsOn } from './movement';
import { CHALLENGE_OFF } from './shop';
import { getSupabase } from './supabase';

// 30-day challenges: the app counts the progress from the person's own data
// (workouts, steps, walks…) and, with an account, sends it for the
// leaderboard of everyone doing the same challenge.

export const CHALLENGE_DAYS = 30;
const DAY_MS = 86_400_000;

type Data = Pick<AppState, 'sessions' | 'cardio' | 'steps' | 'activeDays'>;

export interface ChallengeDef {
    id: string;
    emoji: string;
    target: number;
    // Progress between `from` and `to` (local days "YYYY-MM-DD", both included).
    count: (data: Data, from: string, to: string) => number;
}

const inRange = (day: string, from: string, to: string) => day >= from && day <= to;
const dayOf = (iso: string) => localDay(new Date(iso));

const days = (from: string, to: string) => {
    const out: string[] = [];
    const [y, m, d] = from.split('-').map(Number);
    for (let i = 0; i <= CHALLENGE_DAYS; i++) {
        const day = localDay(new Date(y, m - 1, d + i));
        if (day > to) break;
        out.push(day);
    }
    return out;
};

export const CHALLENGES: ChallengeDef[] = [
    {
        id: 'consistency', emoji: '🔥', target: 25,
        count: (data, from, to) => new Set([
            ...(data.activeDays ?? []),
            ...data.sessions.map(s => dayOf(s.startedAt)),
            ...(data.cardio ?? []).map(c => dayOf(c.startedAt)),
        ].filter(d => inRange(d, from, to))).size,
    },
    {
        id: 'workouts12', emoji: '🏋️', target: 12,
        count: (data, from, to) => data.sessions.filter(s => inRange(dayOf(s.startedAt), from, to)).length,
    },
    {
        id: 'steps10k', emoji: '👟', target: 20,
        count: (data, from, to) => days(from, to).filter(d => stepsOn({ steps: data.steps, cardio: data.cardio }, d) >= 10_000).length,
    },
    {
        id: 'core', emoji: '🧱', target: 15,
        count: (data, from, to) => new Set(data.sessions
            .filter(s => s.sets.some(x => !x.warmup && getExercise(x.exerciseId)?.muscle === 'core'))
            .map(s => dayOf(s.startedAt))
            .filter(d => inRange(d, from, to))).size,
    },
    {
        id: 'cardio', emoji: '🚴', target: 10,
        count: (data, from, to) => (data.cardio ?? []).filter(c => inRange(dayOf(c.startedAt), from, to)).length,
    },
];

export const challengeDef = (id: string) => CHALLENGES.find(c => c.id === id);
export const challengeName = (id: string) => t(`challenge.${id}.name` as Key);
export const challengeGoal = (id: string) => t(`challenge.${id}.goal` as Key);

export interface ChallengeStatus {
    progress: number;
    target: number;
    daysLeft: number;
    state: 'running' | 'done' | 'ended';
}

export const challengeStatus = (joined: JoinedChallenge, data: Data, now = new Date()): ChallengeStatus => {
    const def = challengeDef(joined.id)!;
    const start = new Date(joined.joinedAt);
    const end = new Date(start.getTime() + CHALLENGE_DAYS * DAY_MS);
    const from = localDay(start);
    const to = localDay(new Date(Math.min(end.getTime() - 1, now.getTime())));
    const progress = Math.min(def.target, def.count(data, from, to));
    const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
    const state = joined.doneAt || progress >= def.target ? 'done' : now >= end ? 'ended' : 'running';
    return { progress, target: def.target, daysLeft, state };
};

// ---------- Leaderboard ----------

export interface BoardRow { userId: string; name: string; avatarPath: string | null; avatarUpdated: string | null; progress: number; rank: number; me: boolean }

export const fetchBoard = async (id: string): Promise<BoardRow[]> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('challenge_board', { challenge: id });
    if (error) throw error;
    return ((data ?? []) as { user_id: string; name: string; avatar_path: string | null; avatar_updated: string | null; progress: number; rank: number; me: boolean }[])
        .map(r => ({ userId: r.user_id, name: r.name, avatarPath: r.avatar_path, avatarUpdated: r.avatar_updated, progress: r.progress, rank: Number(r.rank), me: r.me }));
};

export const fetchPeople = async (): Promise<Record<string, number>> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('challenge_counts');
    if (error) return {};
    return Object.fromEntries(((data ?? []) as { challenge: string; people: number }[]).map(r => [r.challenge, r.people]));
};

const sentProgress = new Map<string, string>();
const sendProgress = async (joined: JoinedChallenge, progress: number) => {
    const key = `${joined.joinedAt}:${progress}`;
    if (sentProgress.get(joined.id) === key) return;
    const supabase = await getSupabase();
    const { error } = await supabase.from('challenge_entries').upsert(
        { challenge: joined.id, user_id: getState().account!.id, joined_at: joined.joinedAt, progress, updated_at: new Date().toISOString() },
        { onConflict: 'challenge,user_id' },
    );
    if (!error) sentProgress.set(joined.id, key);
};

export const leaveBoard = async (id: string) => {
    if (!getState().account) return;
    const supabase = await getSupabase();
    await supabase.from('challenge_entries').delete().eq('challenge', id).eq('user_id', getState().account!.id);
    sentProgress.delete(id);
};

// Keeps progress, medals and the leaderboard up to date as the data changes.
export const useChallenges = () => {
    const joined = useStore(s => s.challenges);
    const sessions = useStore(s => s.sessions);
    const cardio = useStore(s => s.cardio);
    const steps = useStore(s => s.steps);
    const activeDays = useStore(s => s.activeDays);
    const account = useStore(s => s.account?.id ?? null);
    useEffect(() => {
        if (!joined?.length) return;
        const data = { sessions, cardio, steps, activeDays };
        for (const j of joined) {
            if (!challengeDef(j.id)) continue;
            const status = challengeStatus(j, data);
            if (status.state === 'done' && !j.doneAt) {
                actions.markChallengeDone(j.id);
                toast(`${t('challenges.completedToast', { name: challengeName(j.id) })} ${t('challenges.rewardToast', { n: CHALLENGE_OFF })}`, 6000);
            }
            if (account && status.state !== 'ended') void sendProgress(j, status.progress).catch(() => {});
        }
    }, [joined, sessions, cardio, steps, activeDays, account]);
};
