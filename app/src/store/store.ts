import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useSyncExternalStore } from 'react';
import { detectLang, setLang, t, type Lang } from '../i18n';
import { uid } from '../lib/id';
import { routineName } from '../lib/names';
import { applyTheme, type Theme } from '../lib/theme';
import { buildPlan } from '../lib/plan';
import { activeExerciseFrom, createActiveWorkout, finishWorkout } from '../lib/workout';
import type { Account, ActiveWorkout, AiUsage, AppState, ChatMessage, Macros, Meal, PremiumStatus, Profile, Routine, RoutineExercise, WorkingSet } from './types';

// The device holds the working copy of everything. With an account, a copy
// also lives in the cloud (lib/cloud.ts); without one, export/import in
// Ajustes is the user's backup.
//
// localStorage is the synchronous working copy. Inside the iOS/Android apps
// it is mirrored to native storage (Preferences), because iOS may purge a web
// view's localStorage when the device is low on space.

const STORAGE_KEY = 'fitness-life:v1';

const EMPTY: AppState = {
    version: 1, profile: null, routines: [], plan: null, sessions: [], active: null, bodyWeights: [], seenAchievements: [],
    meals: [], nutritionTargets: null, coachChat: [], aiUsage: null, premium: null,
};

const unitOf = (s: AppState) => s.profile?.unit ?? 'kg';

const parse = (raw: string | null): AppState | null => {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed?.version === 1 ? { ...EMPTY, ...parsed } : null;
    } catch {
        return null;
    }
};

const load = (): AppState => {
    try {
        return parse(localStorage.getItem(STORAGE_KEY)) ?? EMPTY;
    } catch {
        return EMPTY;
    }
};

const native = () => Capacitor.isNativePlatform();
let mirrorTimer: number | undefined;
const mirrorNow = () => {
    window.clearTimeout(mirrorTimer);
    mirrorTimer = undefined;
    void Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(state) }).catch(() => {});
};
// Typing in a set changes state on every keystroke: batch native writes.
const mirrorSoon = () => {
    window.clearTimeout(mirrorTimer);
    mirrorTimer = window.setTimeout(mirrorNow, 400);
};

let state: AppState = typeof localStorage === 'undefined' ? EMPTY : load();
// First run: follow the phone's language (es/pt, otherwise English) and appearance.
setLang(state.lang ?? detectLang());
applyTheme(state.theme ?? 'system');
const listeners = new Set<() => void>();
let saveError: string | null = null;

const persist = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        saveError = null;
    } catch (e) {
        saveError = e instanceof Error ? e.message : t('common.saveFailed');
    }
    if (native()) mirrorSoon();
};

// Native apps: restore from the native copy if the web view lost its data,
// and flush pending writes when the app goes to the background.
export const hydrateFromNative = async () => {
    if (!native()) return;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && mirrorTimer !== undefined) mirrorNow();
    });
    try {
        const saved = parse((await Preferences.get({ key: STORAGE_KEY })).value);
        const local = parse(localStorage.getItem(STORAGE_KEY));
        if (saved && !local) {
            state = saved;
            setLang(state.lang ?? detectLang());
            applyTheme(state.theme ?? 'system');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            listeners.forEach(l => l());
        } else if (local) {
            mirrorNow();
        }
    } catch {
        // Native storage unavailable: keep working from localStorage.
    }
};

const set = (updater: (s: AppState) => AppState) => {
    const before = state.theme;
    state = updater(state);
    if (state.lang) setLang(state.lang);
    if (state.theme !== before) applyTheme(state.theme ?? 'system');
    persist();
    listeners.forEach(l => l());
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
export const subscribeStore = subscribe;

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
    window.addEventListener('storage', e => {
        if (e.key !== STORAGE_KEY) return;
        state = load();
        setLang(state.lang ?? detectLang());
        applyTheme(state.theme ?? 'system');
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

const MAX_CHAT = 40;
const roundMacros = (m: Macros): Macros => ({
    kcal: Math.max(0, Math.round(m.kcal)),
    protein: Math.max(0, Math.round(m.protein)),
    carbs: Math.max(0, Math.round(m.carbs)),
    fat: Math.max(0, Math.round(m.fat)),
});

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
    // `weightKg`: the weight given at sign-up, saved as the first weigh-in.
    completeOnboarding(profile: Omit<Profile, 'createdAt'>, weightKg?: number) {
        const { plan, routines } = buildPlan(profile);
        const now = new Date();
        set(s => ({
            ...s,
            profile: { ...profile, createdAt: now.toISOString() },
            plan,
            routines: [...s.routines.filter(r => r.source === 'custom'), ...routines],
            bodyWeights: weightKg
                ? [{ id: uid(), date: now.toISOString(), weightKg }, ...s.bodyWeights.filter(b => new Date(b.date).toDateString() !== now.toDateString())]
                : s.bodyWeights,
        }));
    },

    setTheme(theme: Theme) {
        set(s => ({ ...s, theme }));
    },

    setLanguage(lang: Lang) {
        set(s => ({ ...s, lang }));
    },

    updateProfile(patch: Partial<Profile>) {
        set(s => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s));
    },

    // Switch to a program from the list (null: let the app pick again).
    chooseProgram(programId: string | null) {
        const profile = state.profile;
        if (!profile) return;
        const next = { ...profile, programId };
        const { plan, routines } = buildPlan(next);
        set(s => ({ ...s, profile: next, plan, routines: [...s.routines.filter(r => r.source === 'custom'), ...routines] }));
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
        set(s => ({ ...s, active: createActiveWorkout(routine, s.sessions, new Date(), unitOf(s)) }));
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
            exercises: [...a.exercises, activeExerciseFrom(state.sessions, { exerciseId, sets: 3, repMin: 8, repMax: 12, restSec: 90 }, unitOf(state))],
        }));
    },

    // Swap keeps the prescription (sets, reps, rest) but re-plans the load.
    swapExercise(exIndex: number, exerciseId: string) {
        updateActive(a => ({
            ...a,
            exercises: a.exercises.map((ex, i) => i !== exIndex ? ex : activeExerciseFrom(state.sessions, {
                exerciseId, sets: ex.sets.length || 3, repMin: ex.repMin, repMax: ex.repMax, restSec: ex.restSec,
            }, unitOf(state))),
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
            const name = routine.name.trim() || (existing ? routineName(existing) : 'Rutina');
            // A plan day keeps its translatable name only if it was not renamed.
            const dayKey = existing?.dayKey && name === routineName(existing) ? existing.dayKey : undefined;
            const next: Routine = { id, name, dayKey, exercises: routine.exercises, source: existing?.source ?? 'custom' };
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

    setSessionNotes(id: string, notes: string) {
        set(s => ({ ...s, sessions: s.sessions.map(x => (x.id === id ? { ...x, notes: notes.trim() || undefined } : x)) }));
    },

    // One entry per day: logging again the same day replaces it.
    logBodyWeight(weightKg: number, date = new Date()) {
        const day = date.toDateString();
        set(s => ({
            ...s,
            bodyWeights: [
                { id: uid(), date: date.toISOString(), weightKg: Math.round(weightKg * 100) / 100 },
                ...s.bodyWeights.filter(b => new Date(b.date).toDateString() !== day),
            ].sort((a, b) => b.date.localeCompare(a.date)),
        }));
    },

    deleteBodyWeight(id: string) {
        set(s => ({ ...s, bodyWeights: s.bodyWeights.filter(b => b.id !== id) }));
    },

    addMeal(meal: Omit<Meal, 'id'>) {
        const clean = { ...meal, name: meal.name.trim(), ...roundMacros(meal) };
        set(s => ({ ...s, meals: [{ ...clean, id: uid() }, ...s.meals].sort((a, b) => b.date.localeCompare(a.date)) }));
    },

    deleteMeal(id: string) {
        set(s => ({ ...s, meals: s.meals.filter(m => m.id !== id) }));
    },

    setNutritionTargets(targets: Macros | null) {
        set(s => ({ ...s, nutritionTargets: targets && roundMacros(targets) }));
    },

    addChatMessage(role: ChatMessage['role'], text: string) {
        const message: ChatMessage = { id: uid(), role, text, at: new Date().toISOString() };
        // Keep the conversation short: it travels with every question.
        set(s => ({ ...s, coachChat: [...s.coachChat, message].slice(-MAX_CHAT) }));
    },

    setAiUsage(aiUsage: AiUsage | null) {
        set(s => ({ ...s, aiUsage }));
    },

    setPremium(premium: PremiumStatus | null) {
        set(s => ({ ...s, premium }));
    },

    clearChat() {
        set(s => ({ ...s, coachChat: [] }));
    },

    markAchievementsSeen(ids: string[]) {
        if (ids.every(id => state.seenAchievements.includes(id))) return;
        set(s => ({ ...s, seenAchievements: [...new Set([...s.seenAchievements, ...ids])] }));
    },

    setAccount(account: Account | null) {
        set(s => ({ ...s, account, ...(account ? { authPrompted: true } : { cloudSyncedAt: null }) }));
    },

    setAuthPrompted() {
        if (!state.authPrompted) set(s => ({ ...s, authPrompted: true }));
    },

    blockUser(userId: string) {
        set(s => ({ ...s, blockedUsers: [...new Set([...(s.blockedUsers ?? []), userId])] }));
    },

    acceptCommunityRules() {
        set(s => ({ ...s, communityRulesAccepted: true }));
    },

    setCloudSyncedAt(at: string) {
        set(s => ({ ...s, cloudSyncedAt: at }));
    },

    // Replaces the training data with the account's copy; keeps this device's settings.
    restoreSnapshot(data: Partial<AppState>, syncedAt: string) {
        set(s => ({
            ...EMPTY, ...data, version: 1, active: s.active,
            lang: s.lang, theme: s.theme, account: s.account, authPrompted: true, cloudSyncedAt: syncedAt,
            aiUsage: s.aiUsage, premium: s.premium,
        }));
    },

    exportData(): string {
        return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
    },

    // Replaces everything with a backup. Throws on an invalid file.
    importData(json: string) {
        const data = JSON.parse(json);
        if (data?.version !== 1 || !Array.isArray(data.sessions) || !Array.isArray(data.routines)) {
            throw new Error(t('backup.invalid'));
        }
        const { exportedAt: _ignored, ...rest } = data as AppState & { exportedAt?: string };
        set(s => ({ ...EMPTY, ...rest, active: null, account: s.account, authPrompted: s.authPrompted, cloudSyncedAt: s.cloudSyncedAt }));
    },

    resetAll() {
        set(s => ({ ...EMPTY, lang: s.lang, theme: s.theme, account: s.account, authPrompted: s.authPrompted, cloudSyncedAt: s.cloudSyncedAt }));
    },
};

