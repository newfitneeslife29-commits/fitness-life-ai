import { supabase } from './supabaseClient';
import { LoggedSet } from '../lib/progression';

// Workout logging with an offline queue: every write gets a client-side id and
// is queued in localStorage first, then flushed to Supabase in order. Upserts
// keyed by id make a retried write harmless, so sets logged with no signal in
// the gym are not lost.

export interface SetRecord extends LoggedSet {
    id: string;
    session_id: string;
    exercise_name: string;
    set_index: number;
    rpe?: number | null;
    completed_at: string;
}

export interface SessionRecord {
    id: string;
    routine_id: string | null;
    routine_name: string | null;
    started_at: string;
    ended_at: string | null;
    total_volume_kg: number | null;
    workout_sets: SetRecord[];
}

type PendingOp =
    | { kind: 'session'; row: Record<string, unknown> }
    | { kind: 'set'; row: Record<string, unknown> }
    | { kind: 'finish'; id: string; patch: Record<string, unknown> };

const QUEUE_KEY = 'fitness_pending_workout_ops';

const readQueue = (): PendingOp[] => {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
};

const writeQueue = (ops: PendingOp[]) => {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
    } catch {
        // Storage full or blocked: nothing else we can do offline.
    }
};

const enqueue = (op: PendingOp) => writeQueue([...readQueue(), op]);

export const pendingCount = () => readQueue().length;

let flushing: Promise<void> | null = null;

// Send queued writes in order; stop at the first failure and keep the rest.
export const flushPending = (): Promise<void> => {
    // A write enqueued after the running flush last read the queue would be
    // missed, so queue another pass behind it instead of sharing it.
    if (flushing) return flushing.then(() => flushPending());
    flushing = (async () => {
        // Re-read the queue each time: writes can be enqueued while we flush.
        for (let queue = readQueue(); queue.length > 0; queue = readQueue()) {
            const op = queue[0];
            const { error } = op.kind === 'session'
                ? await supabase.from('workout_sessions').upsert(op.row)
                : op.kind === 'set'
                    ? await supabase.from('workout_sets').upsert(op.row)
                    : await supabase.from('workout_sessions').update(op.patch).eq('id', op.id);
            if (error) {
                console.warn('Workout sync paused:', error.message);
                break;
            }
            // enqueue() only appends, so the head is still the op just sent.
            writeQueue(readQueue().slice(1));
        }
    })().finally(() => { flushing = null; });
    return flushing;
};

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { flushPending(); });
}

export const startSession = (routine: { id?: string; title: string }) => {
    const id = crypto.randomUUID();
    enqueue({
        kind: 'session',
        row: {
            id,
            routine_id: routine.id ?? null,
            routine_name: routine.title,
            started_at: new Date().toISOString(),
        },
    });
    flushPending();
    return id;
};

export const logSet = (
    sessionId: string,
    set: { exercise_name: string; set_index: number; weight_kg: number; reps: number; rpe?: number | null; is_warmup?: boolean },
): SetRecord => {
    const record: SetRecord = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        completed_at: new Date().toISOString(),
        rpe: set.rpe ?? null,
        is_warmup: set.is_warmup ?? false,
        ...set,
    };
    enqueue({ kind: 'set', row: { ...record } });
    flushPending();
    return record;
};

export const finishSession = (sessionId: string, totalVolumeKg: number) => {
    enqueue({
        kind: 'finish',
        id: sessionId,
        patch: { ended_at: new Date().toISOString(), total_volume_kg: Math.round(totalVolumeKg * 100) / 100 },
    });
    return flushPending();
};

// Sets from the most recent session in which each exercise was performed.
export const getLastSets = async (exerciseNames: string[]): Promise<Record<string, SetRecord[]>> => {
    const names = [...new Set(exerciseNames)];
    if (names.length === 0) return {};
    const { data, error } = await supabase
        .from('workout_sets')
        .select('id, session_id, exercise_name, set_index, weight_kg, reps, rpe, is_warmup, completed_at')
        .in('exercise_name', names)
        .order('completed_at', { ascending: false })
        .limit(names.length * 20);
    if (error || !data) return {};

    const result: Record<string, SetRecord[]> = {};
    const latestSession: Record<string, string> = {};
    for (const row of data as SetRecord[]) {
        const name = row.exercise_name;
        latestSession[name] ??= row.session_id;
        if (row.session_id !== latestSession[name]) continue;
        (result[name] ??= []).push({ ...row, weight_kg: Number(row.weight_kg) });
    }
    return result;
};

// Finished sessions, newest first, with their sets.
export const getHistory = async (limit = 60): Promise<SessionRecord[]> => {
    const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, routine_id, routine_name, started_at, ended_at, total_volume_kg, workout_sets(id, session_id, exercise_name, set_index, weight_kg, reps, rpe, is_warmup, completed_at)')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit);
    if (error || !data) {
        if (error) console.error('Error loading history:', error.message);
        return [];
    }
    return (data as SessionRecord[]).map(s => ({
        ...s,
        total_volume_kg: s.total_volume_kg === null ? null : Number(s.total_volume_kg),
        workout_sets: (s.workout_sets || [])
            .map(set => ({ ...set, weight_kg: Number(set.weight_kg) }))
            .sort((a, b) => a.completed_at.localeCompare(b.completed_at)),
    }));
};
