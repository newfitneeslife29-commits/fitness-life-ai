import { useSyncExternalStore } from 'react';
import { uid } from '../lib/id';
import { buildPlan } from '../lib/plan';
import { activeExerciseFrom, createActiveWorkout, finishWorkout } from '../lib/workout';
import type { ActiveWorkout, AppState, Profile, Routine, RoutineExercise, Session, WorkingSet } from './types';

// All data lives on the device (localStorage). No account, no network.
// Export/import in Ajustes is the backup.

const STORAGE_KEY = 'fitness-life:v1';

const EMPTY: AppState = { version: 1, profile: null, routines: [], plan: null, sessions: [], active: null };

const load = (): AppState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return EMPTY;
        const parsed = JSON.parse(raw);
        return parsed?.version === 1 ? { ...EMPTY, ...parsed } : EMPTY;
    } catch {
        return EMPTY;
    }
};

let state: AppState = typeof localStorage === 'undefined' ? EMPTY : load();
const listeners = new Set<() => void>();
let saveError: string | null = null;

const persist = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        saveError = null;
    } catch (e) {
        saveError = e instanceof Error ? e.message : 'No se pudo guardar';
    }
};

const set = (updater: (s: AppState) => AppState) => {
    state = updater(state);
    persist();
    listeners.forEach(l => l());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
    window.addEventListener('storage', e => {
        if (e.key !== STORAGE_KEY) return;
        state = load();
        listeners.forEach(l => l());
    });
}

export const getState = () => state;
export const getSaveError = () => saveError;

export function useStore(): AppState;
export function useStore<T>(selector: (s: AppState) => T): T;
export function useStore<T>(selector?: (s: AppState) => T) {
    return useSyncExternalStore(subscribe, () => (selector ? selector(state) : state));
}

const updateActive = (fn: (a: ActiveWorkout) => ActiveWorkout) =>
    set(s => (s.active ? { ...s, active: fn(s.active) } : s));

const updateSet = (a: ActiveWorkout, exIndex: number, setIndex: number, fn: (w: WorkingSet) => WorkingSet): ActiveWorkout => ({
    ...a,
    exercises: a.exercises.map((ex, i) => i !== exIndex ? ex : {
        ...ex,
        sets: ex.sets.map((w, j) => j !== setIndex ? w : fn(w)),
    }),
});

export const actions = {
    completeOnboarding(profile: Omit<Profile, 'createdAt'>) {
        const { plan, routines } = buildPlan(profile);
        set(s => ({
            ...s,
            profile: { ...profile, createdAt: new Date().toISOString() },
            plan,
            routines: [...s.routines.filter(r => r.source === 'custom'), ...routines],
        }));
    },

    updateProfile(patch: Partial<Profile>) {
        set(s => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s));
    },

    // New plan from the current profile; custom routines are kept.
    regeneratePlan() {
        const profile = state.profile;
        if (!profile) return;
        const { plan, routines } = buildPlan(profile);
        set(s => ({ ...s, plan, routines: [...s.routines.filter(r => r.source === 'custom'), ...routines] }));
    },

    startWorkout(routineId: string | null) {
        const routine = state.routines.find(r => r.id === routineId) ?? null;
        set(s => ({ ...s, active: createActiveWorkout(routine, s.sessions) }));
    },

    discardWorkout() {
        set(s => ({ ...s, active: null }));
    },

    // Saves the workout and moves the plan to its next day. Returns the
    // session id, or null when nothing was completed (workout discarded).
    finishWorkout(): string | null {
        const active = state.active;
        if (!active) return null;
        const session = finishWorkout(active);
        set(s => {
            const plan = s.plan && session && active.routineId && s.plan.routineIds.includes(active.routineId)
                ? { ...s.plan, nextIndex: (s.plan.routineIds.indexOf(active.routineId) + 1) % s.plan.routineIds.length }
                : s.plan;
            return { ...s, active: null, plan, sessions: session ? [session, ...s.sessions] : s.sessions };
        });
        return session?.id ?? null;
    },

    setValue(exIndex: number, setIndex: number, field: 'weightKg' | 'reps', value: number) {
        const v = Number.isFinite(value) ? Math.max(0, value) : 0;
        updateActive(a => updateSet(a, exIndex, setIndex, w => ({ ...w, [field]: v })));
    },

    // Completing a set starts the rest timer for that exercise.
    toggleSet(exIndex: number, setIndex: number) {
        updateActive(a => {
            const wasDone = a.exercises[exIndex]?.sets[setIndex]?.done;
            const next = updateSet(a, exIndex, setIndex, w => ({
                ...w,
                done: !w.done,
                completedAt: w.done ? undefined : new Date().toISOString(),
            }));
            if (wasDone) return next;
            const rest = a.exercises[exIndex].restSec;
            return { ...next, restEndsAt: Date.now() + rest * 1000, restTotalSec: rest };
        });
    },

    addSet(exIndex: number) {
        updateActive(a => ({
            ...a,
            exercises: a.exercises.map((ex, i) => {
                if (i !== exIndex) return ex;
                const last = ex.sets[ex.sets.length - 1];
                return { ...ex, sets: [...ex.sets, { id: uid(), weightKg: last?.weightKg ?? 0, reps: last?.reps ?? ex.repMin, done: false }] };
            }),
        }));
    },

    removeSet(exIndex: number, setIndex: number) {
        updateActive(a => ({
            ...a,
            exercises: a.exercises.map((ex, i) => i !== exIndex ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIndex) }),
        }));
    },

    addExercise(exerciseId: string) {
        updateActive(a => ({
            ...a,
            exercises: [...a.exercises, activeExerciseFrom(state.sessions, { exerciseId, sets: 3, repMin: 8, repMax: 12, restSec: 90 })],
        }));
    },

    // Swap keeps the prescription (sets, reps, rest) but re-plans the load.
    swapExercise(exIndex: number, exerciseId: string) {
        updateActive(a => ({
            ...a,
            exercises: a.exercises.map((ex, i) => i !== exIndex ? ex : activeExerciseFrom(state.sessions, {
                exerciseId, sets: ex.sets.length || 3, repMin: ex.repMin, repMax: ex.repMax, restSec: ex.restSec,
            })),
        }));
    },

    removeExercise(exIndex: number) {
        updateActive(a => ({ ...a, exercises: a.exercises.filter((_, i) => i !== exIndex) }));
    },

    adjustRest(deltaSec: number) {
        updateActive(a => a.restEndsAt
            ? { ...a, restEndsAt: a.restEndsAt + deltaSec * 1000, restTotalSec: Math.max(1, a.restTotalSec + deltaSec) }
            : a);
    },

    skipRest() {
        updateActive(a => ({ ...a, restEndsAt: null }));
    },

    saveRoutine(routine: { id?: string; name: string; exercises: RoutineExercise[] }): string {
        const id = routine.id ?? uid();
        set(s => {
            const existing = s.routines.find(r => r.id === id);
            const next: Routine = { id, name: routine.name.trim() || 'Rutina', exercises: routine.exercises, source: existing?.source ?? 'custom' };
            return { ...s, routines: existing ? s.routines.map(r => r.id === id ? next : r) : [...s.routines, next] };
        });
        return id;
    },

    deleteRoutine(id: string) {
        set(s => {
            const plan = s.plan && s.plan.routineIds.includes(id)
                ? (() => {
                    const routineIds = s.plan!.routineIds.filter(r => r !== id);
                    return routineIds.length ? { ...s.plan!, routineIds, nextIndex: s.plan!.nextIndex % routineIds.length } : null;
                })()
                : s.plan;
            return { ...s, plan, routines: s.routines.filter(r => r.id !== id) };
        });
    },

    deleteSession(id: string) {
        set(s => ({ ...s, sessions: s.sessions.filter(x => x.id !== id) }));
    },

    exportData(): string {
        return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
    },

    // Replaces everything with a backup. Throws on an invalid file.
    importData(json: string) {
        const data = JSON.parse(json);
        if (data?.version !== 1 || !Array.isArray(data.sessions) || !Array.isArray(data.routines)) {
            throw new Error('El archivo no es una copia de seguridad de Fitness Life.');
        }
        const { exportedAt: _ignored, ...rest } = data as AppState & { exportedAt?: string };
        set(() => ({ ...EMPTY, ...rest, active: null }));
    },

    resetAll() {
        set(() => EMPTY);
    },
};

export type { Session };
