import { getExercise } from '../data/exercises';
import type { ActiveExercise, ActiveWorkout, Routine, RoutineExercise, Session, Unit, WorkingSet } from '../store/types';
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

// Only completed sets are kept. A workout with none is discarded (null).
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
    return {
        id: active.id,
        routineId: active.routineId,
        routineName: active.routineName,
        dayKey: active.dayKey,
        startedAt: active.startedAt,
        endedAt: now.toISOString(),
        sets,
    };
};
