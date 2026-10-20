import { getExercise } from '../data/exercises';
import type { ActiveExercise, ActiveWorkout, Goal, Routine, RoutineExercise, Session, Unit, WorkingSet } from '../store/types';
import { uid } from './id';
import { stepForUnit, suggestNext, type Suggestion } from './progression';
import { routineName } from './names';
import { lastPerformance } from './stats';

export interface ExercisePlan {
    suggestion: Suggestion | null;
    previous: { weightKg: number; reps: number }[];
}

// What to aim for in an exercise today, from the last time it was done.
export const planExercise = (
    sessions: Session[],
    target: Pick<RoutineExercise, 'exerciseId' | 'repMin' | 'repMax'>,
    unit: Unit = 'kg',
): ExercisePlan => {
    const last = lastPerformance(sessions, target.exerciseId).filter(s => !s.warmup);
    const stepKg = stepForUnit(getExercise(target.exerciseId)?.stepKg ?? 2.5, unit);
    return {
        suggestion: suggestNext(target, last, stepKg),
        previous: last.map(s => ({ weightKg: s.weightKg, reps: s.reps })),
    };
};

const prefilledSets = (sessions: Session[], target: RoutineExercise, unit: Unit): WorkingSet[] => {
    const { suggestion, previous } = planExercise(sessions, target, unit);
    const weightKg = suggestion?.weightKg ?? previous[0]?.weightKg ?? 0;
    const reps = suggestion?.reps ?? target.repMin;
    return Array.from({ length: target.sets }, () => ({ id: uid(), weightKg, reps, done: false }));
};

export const activeExerciseFrom = (sessions: Session[], target: RoutineExercise, unit: Unit = 'kg'): ActiveExercise => ({
    exerciseId: target.exerciseId,
    repMin: target.repMin,
    repMax: target.repMax,
    restSec: target.restSec,
    sets: prefilledSets(sessions, target, unit),
});

export const createActiveWorkout = (routine: Routine | null, sessions: Session[], now = new Date(), unit: Unit = 'kg'): ActiveWorkout => ({
    id: uid(),
    routineId: routine?.id ?? null,
    routineName: routine ? routineName(routine) : 'Entreno libre',
    dayKey: routine ? routine.dayKey : 'free',
    startedAt: now.toISOString(),
    exercises: (routine?.exercises ?? []).map(target => activeExerciseFrom(sessions, target, unit)),
    restEndsAt: null,
    restTotalSec: 0,
});

// The rest in progress, in ms so far (up to its end).
const restSoFar = (a: Pick<ActiveWorkout, 'restEndsAt' | 'restTotalSec'>, now: number) => {
    if (!a.restEndsAt) return 0;
    const start = a.restEndsAt - a.restTotalSec * 1000;
    return Math.max(0, Math.min(now, a.restEndsAt) - start);
};

// Closes the rest in progress: its time joins the rested total.
export const endRest = (a: ActiveWorkout, now = Date.now()): ActiveWorkout =>
    a.restEndsAt ? { ...a, restEndsAt: null, restedMs: (a.restedMs ?? 0) + restSoFar(a, now) } : a;

// Seconds of work: the whole session minus the rests.
export const activeSeconds = (a: ActiveWorkout, now = Date.now()) =>
    Math.max(0, Math.floor((now - Date.parse(a.startedAt) - (a.restedMs ?? 0) - restSoFar(a, now)) / 1000));

// Seconds spent resting: the rests that ended plus the one in progress.
export const restSeconds = (a: ActiveWorkout, now = Date.now()) =>
    Math.floor(((a.restedMs ?? 0) + restSoFar(a, now)) / 1000);

// Programs made to burn fat (their days are "programId:index").
const BURN_PROGRAMS = ['premium-home-burn', 'women-home-lose', 'women-db-lose', 'women-gym-lose'];

// Cardio and fat-burning workouts show the active clock all the time.
export const isBurnWorkout = (a: ActiveWorkout, goal?: Goal) =>
    goal === 'grasa'
    || BURN_PROGRAMS.includes(a.dayKey?.split(':')[0] ?? '')
    || a.exercises.some(e => getExercise(e.exerciseId)?.kind === 'cardio');

// Only completed sets are kept. A workout with none is discarded (null).
const STALE_MS = 60 * 60_000;

export const finishWorkout = (active: ActiveWorkout, now = new Date()): Session | null => {
    const sets = active.exercises.flatMap(ex =>
        ex.sets
            .filter(s => s.done)
            .map((s, i) => ({
                id: s.id,
                exerciseId: ex.exerciseId,
                setIndex: i + 1,
                weightKg: s.weightKg,
                reps: s.reps,
                completedAt: s.completedAt ?? now.toISOString(),
            })),
    );
    if (sets.length === 0) return null;
    // Left open long after the last set (finished the next day): it ends a few
    // minutes after that set, not hours later.
    const last = Math.max(...sets.map(s => Date.parse(s.completedAt)).filter(Number.isFinite));
    const end = Number.isFinite(last) && now.getTime() - last > STALE_MS ? new Date(last + 5 * 60_000) : now;
    return {
        id: active.id,
        routineId: active.routineId,
        routineName: active.routineName,
        dayKey: active.dayKey,
        startedAt: active.startedAt,
        endedAt: end.toISOString(),
        sets,
        activeSec: activeSeconds(active, end.getTime()),
        restSec: restSeconds(active, end.getTime()),
    };
};
