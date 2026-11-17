import { equipmentLabel, EXERCISES, exerciseName, getExercise, muscleLabel } from '../data/exercises';
import { ALLOWED } from '../data/programs';
import type { CatalogExercise, TrainerContext } from './ai';
import { planName, routineName, sessionName } from './names';
import { ageOf } from './nutrition';
import { weekPhase } from './plan';
import { lastPerformance, sessionsThisWeek, strengthGains, streakWeeks } from './stats';
import { personalRecords } from './progression';
import type { AppState, LoggedSet, Session, Setup } from '../store/types';

// What the personal trainer knows: the profile, the current plan and the
// last workouts, as short text the model can read. Weights in kg.

const RECENT = 6;
const fmtKg = (kg: number) => String(Math.round(kg * 10) / 10);

const setText = (exerciseId: string, s: LoggedSet) => {
    if (getExercise(exerciseId)?.timed) return `${s.reps} s${s.weightKg > 0 ? ` +${fmtKg(s.weightKg)} kg` : ''}`;
    return s.weightKg > 0 ? `${fmtKg(s.weightKg)} kg×${s.reps}` : `${s.reps} reps`;
};

const sessionText = (s: Session) => {
    const byExercise = new Map<string, LoggedSet[]>();
    for (const set of s.sets.filter(x => !x.warmup)) byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
    const exercises = [...byExercise].map(([id, sets]) => `${exerciseName(id)} ${sets.map(x => setText(id, x)).join(', ')}`);
    return `- ${s.startedAt.slice(0, 10)} · ${sessionName(s)}: ${exercises.join('; ') || 'no sets'}${s.notes ? ` (note: ${s.notes.slice(0, 120)})` : ''}`;
};

export const trainerContext = (state: AppState): TrainerContext => {
    const p = state.profile!;
    const planRoutines = state.plan ? state.plan.routineIds.map(id => state.routines.find(r => r.id === id)).filter(r => !!r) : [];
    const custom = state.routines.filter(r => r.source === 'custom');
    const plan = [
        state.plan ? `Program: ${planName(state.plan)} (week ${state.plan.week ?? 1}, ${weekPhase(state.plan.week ?? 1)} phase; next up: day ${state.plan.nextIndex + 1})` : 'No program',
        ...planRoutines.map((r, i) => `Day ${i + 1} · ${routineName(r)}: ${r.exercises.map(e => `${exerciseName(e.exerciseId)} ${e.sets}×${e.repMin}–${e.repMax}${getExercise(e.exerciseId)?.timed ? ' s' : ''}`).join(', ')}`),
        ...(custom.length ? [`Own routines: ${custom.map(r => routineName(r)).join(', ')}`] : []),
    ].join('\n');
    const sessions = [...state.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    // The next workout with what the user did last time on each exercise, so
    // "what do I lift today" gets real numbers.
    const next = state.plan ? state.routines.find(r => r.id === state.plan!.routineIds[state.plan!.nextIndex]) : undefined;
    const nextText = next ? [
        `Next workout: ${routineName(next)}`,
        ...next.exercises.map(e => {
            const last = lastPerformance(sessions, e.exerciseId).filter(x => !x.warmup);
            return `- ${exerciseName(e.exerciseId)} ${e.sets}×${e.repMin}–${e.repMax}${getExercise(e.exerciseId)?.timed ? ' s' : ''}; last time: ${last.length ? last.map(x => setText(e.exerciseId, x)).join(', ') : 'never done'}`;
        }),
    ].join('\n') : '';
    const records = [...personalRecords(sessions.flatMap(x => x.sets)).values()]
        .filter(r => r.bestWeightKg > 0).sort((a, b) => b.bestE1rm - a.bestE1rm).slice(0, 6)
        .map(r => `${exerciseName(r.exerciseId)} ${fmtKg(r.bestWeightKg)} kg×${r.repsAtBestWeight} (est. 1RM ${fmtKg(r.bestE1rm)} kg)`);
    const gains = strengthGains(sessions).map(g => `${exerciseName(g.exerciseId)} ${g.change >= 0 ? '+' : ''}${Math.round(g.change * 100)}%`);
    const history = [
        ...(nextText ? [nextText] : []),
        ...(records.length ? [`Best lifts: ${records.join('; ')}`] : []),
        ...(gains.length ? [`Strength change since their first sessions: ${gains.join(', ')}`] : []),
        `Workouts logged: ${sessions.length}; this week: ${sessionsThisWeek(sessions).length} of ${p.daysPerWeek}; streak: ${streakWeeks(sessions)} weeks`,
        ...sessions.slice(0, RECENT).map(sessionText),
    ].join('\n');
    return {
        goal: p.goal,
        level: p.level,
        daysPerWeek: p.daysPerWeek,
        setup: p.setup,
        limitations: p.limitations ?? [],
        sex: p.sex,
        age: p.birthYear ? ageOf(p.birthYear) : undefined,
        heightCm: p.heightCm,
        weightKg: state.bodyWeights[0]?.weightKg ?? null,
        targetWeightKg: p.weightGoal?.targetKg,
        plan,
        history,
    };
};

// Exercises the AI may use for a new routine: what the equipment allows
// where the user is training this time (home, dumbbells or gym).
export const routineCatalog = (state: AppState, setup: Setup = state.profile?.setup ?? 'gimnasio'): CatalogExercise[] => {
    const allowed = ALLOWED[setup];
    return EXERCISES.filter(e => allowed.includes(e.equipment)).map(e => ({
        id: e.id, name: exerciseName(e.id), muscle: muscleLabel(e.muscle), equipment: equipmentLabel(e.equipment), timed: Boolean(e.timed),
    }));
};
