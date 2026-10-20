import { useEffect } from 'react';
import { toast } from '../components/feedback';
import { exerciseName, getExercise } from '../data/exercises';
import { t } from '../i18n';
import { actions, getState, useStore } from '../store/store';
import type { Routine, RoutineExercise, Session } from '../store/types';
import { publicUrl } from './community';
import { uid } from './id';
import { resizeImage } from './image';
import { volume } from './progression';
import { getSupabase } from './supabase';
import { fetchHires, hireState, sendMessage } from './trainerPay';

// More for trainers and their clients: reviews, routines the trainer sends,
// the client's workouts seen by the trainer, and photos in the chat.

const missing = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42P01' || e?.code === 'PGRST205';

// ---------- Reviews ----------

export interface Rating { stars: number; reviews: number }

export const fetchRatings = async (): Promise<Record<string, Rating>> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('trainer_ratings');
    if (error) {
        if (missing(error)) return {};
        throw error;
    }
    return Object.fromEntries(((data ?? []) as { trainer_id: string; stars: number; reviews: number }[])
        .map(r => [r.trainer_id, { stars: Number(r.stars), reviews: r.reviews }]));
};

export interface Review { clientId: string; stars: number; body: string; updatedAt: string; name: string; avatar: string | null }

export const fetchReviews = async (trainerId: string): Promise<Review[]> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('trainer_reviews_of', { trainer: trainerId });
    if (error) throw error;
    return ((data ?? []) as { client_id: string; stars: number; body: string; updated_at: string; name: string; avatar_path: string | null; avatar_updated: string | null }[])
        .map(r => ({ clientId: r.client_id, stars: r.stars, body: r.body, updatedAt: r.updated_at, name: r.name, avatar: publicUrl(r.avatar_path, r.avatar_updated ?? undefined) }));
};

const myId = async () => (await (await getSupabase()).auth.getSession()).data.session?.user.id ?? '';

export const fetchMyReview = async (trainerId: string): Promise<{ stars: number; body: string } | null> => {
    const supabase = await getSupabase();
    const { data } = await supabase.from('trainer_reviews').select('stars, body').eq('trainer_id', trainerId).eq('client_id', await myId()).maybeSingle();
    return data as { stars: number; body: string } | null;
};

export const saveReview = async (trainerId: string, stars: number, body: string) => {
    const supabase = await getSupabase();
    const { error } = await supabase.from('trainer_reviews')
        .upsert({ trainer_id: trainerId, client_id: await myId(), stars, body: body.trim().slice(0, 500) }, { onConflict: 'trainer_id,client_id' });
    if (error) throw error;
};

// ---------- Routines the trainer sends ----------

interface SentRoutine { name: string; exercises: RoutineExercise[] }

export const sendRoutine = async (linkId: string, routine: Pick<Routine, 'name' | 'exercises'>) => {
    const supabase = await getSupabase();
    const sent: SentRoutine = { name: routine.name, exercises: routine.exercises };
    const { error } = await supabase.from('trainer_routines').insert({ link_id: linkId, routine: sent });
    if (error) throw error;
    // The chat says it too (and notifies the client's phone).
    return sendMessage(linkId, t('coachRoutine.message', { name: routine.name })).catch(() => null);
};

// Only the exercises this version of the app knows, with sane numbers.
export const cleanRoutine = (r: unknown): SentRoutine | null => {
    const v = r as Partial<SentRoutine> | null;
    if (!v || typeof v.name !== 'string' || !Array.isArray(v.exercises)) return null;
    const clamp = (n: unknown, min: number, max: number, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d);
    const exercises = v.exercises
        .filter(e => e && typeof e.exerciseId === 'string' && getExercise(e.exerciseId))
        .slice(0, 30)
        .map(e => {
            const repMin = clamp(e.repMin, 1, 100, 8);
            return { exerciseId: e.exerciseId, sets: clamp(e.sets, 1, 20, 3), repMin, repMax: Math.max(repMin, clamp(e.repMax, 1, 100, 12)), restSec: clamp(e.restSec, 0, 900, 90) };
        });
    return exercises.length ? { name: v.name.trim().slice(0, 60) || 'Rutina', exercises } : null;
};

const HAS_TRAINER = 'fitness-life:has-trainer';
export const hasTrainer = () => {
    try {
        return localStorage.getItem(HAS_TRAINER) === '1';
    } catch {
        return false;
    }
};
const rememberTrainer = (yes: boolean) => {
    try {
        if (yes) localStorage.setItem(HAS_TRAINER, '1');
        else localStorage.removeItem(HAS_TRAINER);
    } catch { /* only saves a request */ }
};

// Adds the routines the trainer sent to the client's routines (once each;
// calls made at the same time share the same look).
let receiving: Promise<string[]> | null = null;
export const receiveRoutines = () => {
    receiving ??= receive().finally(() => { receiving = null; });
    return receiving;
};
const receive = async (): Promise<string[]> => {
    const hires = (await fetchHires()).filter(h => h.role === 'client');
    rememberTrainer(hires.length > 0);
    if (!hires.length) return [];
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('trainer_routines').select('id, routine')
        .in('link_id', hires.map(h => h.id)).is('received_at', null).order('created_at').limit(20);
    if (error) {
        if (missing(error)) return [];
        throw error;
    }
    const names: string[] = [];
    for (const row of (data ?? []) as { id: string; routine: unknown }[]) {
        const routine = cleanRoutine(row.routine);
        const { error: marked } = await supabase.from('trainer_routines').update({ received_at: new Date().toISOString() }).eq('id', row.id);
        if (marked || !routine) continue;
        actions.saveRoutine(routine);
        names.push(routine.name);
    }
    return names;
};

// When the app opens (for people with a trainer): new routines from them.
export const useCoachRoutines = () => {
    const accountId = useStore(s => s.account?.id ?? null);
    useEffect(() => {
        if (!accountId || !hasTrainer()) return;
        void receiveRoutines().then(names => names.forEach(name => toast(t('coachRoutine.received', { name }), 4500))).catch(() => {});
    }, [accountId]);
};

// ---------- The client's workouts, for the trainer ----------

export interface WorkoutSummary {
    name: string;
    durationMin: number;
    sets: number;
    volumeKg: number;
    exercises: { id: string; name: string; sets: { kg: number; reps: number }[] }[];
}

export const summarize = (s: Session): WorkoutSummary => {
    const work = s.sets.filter(x => !x.warmup);
    const ids = [...new Set(work.map(x => x.exerciseId))];
    return {
        name: s.routineName,
        durationMin: Math.max(1, Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60_000)),
        sets: work.length,
        volumeKg: Math.round(volume(work)),
        exercises: ids.slice(0, 30).map(id => ({
            id, name: exerciseName(id),
            sets: work.filter(x => x.exerciseId === id).slice(0, 20).map(x => ({ kg: x.weightKg, reps: x.reps })),
        })),
    };
};

// After a workout: to the trainers the person has now (if they share it).
export const shareWorkout = async (session: Session) => {
    if (!hasTrainer() || getState().profile?.shareWithTrainer === false) return;
    const hires = (await fetchHires()).filter(h => h.role === 'client' && h.open && hireState(h) !== 'ended');
    if (!hires.length) return;
    const supabase = await getSupabase();
    await supabase.from('trainer_client_sessions').upsert(
        hires.map(h => ({ link_id: h.id, session_id: session.id, summary: summarize(session), started_at: session.startedAt })),
        { onConflict: 'link_id,session_id', ignoreDuplicates: true },
    );
};

export interface ClientWorkout extends WorkoutSummary { id: string; startedAt: string }

export const fetchClientWorkouts = async (linkId: string): Promise<ClientWorkout[]> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from('trainer_client_sessions').select('id, summary, started_at')
        .eq('link_id', linkId).order('started_at', { ascending: false }).limit(60);
    if (error) {
        if (missing(error)) return [];
        throw error;
    }
    return ((data ?? []) as { id: string; summary: WorkoutSummary; started_at: string }[]).map(r => ({ ...r.summary, id: r.id, startedAt: r.started_at }));
};

// The latest workout of each client (trainer's panel).
export const fetchLastWorkouts = async (): Promise<Record<string, string>> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('trainer_last_sessions');
    if (error) return {};
    return Object.fromEntries(((data ?? []) as { link_id: string; started_at: string }[]).map(r => [r.link_id, r.started_at]));
};

// ---------- Photos in the chat ----------

const BUCKET = 'trainer-chat';

export const sendPhoto = async (linkId: string, file: Blob) => {
    const supabase = await getSupabase();
    const photo = await resizeImage(file, 1600, { quality: 0.82 });
    const path = `${linkId}/${uid()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, photo, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return path;
};

// Private photos: a link that works for an hour, kept while the app is open.
const signed = new Map<string, Promise<string | null>>();
export const photoUrl = (path: string) => {
    let url = signed.get(path);
    if (!url) {
        url = getSupabase()
            .then(s => s.storage.from(BUCKET).createSignedUrl(path, 3600))
            .then(r => r.data?.signedUrl ?? null)
            .catch(() => null);
        signed.set(path, url);
        setTimeout(() => signed.delete(path), 55 * 60_000);
    }
    return url;
};
