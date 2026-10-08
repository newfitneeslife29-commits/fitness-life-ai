import type { Lang } from '../i18n';

export type Goal = 'fuerza' | 'musculo' | 'salud';
export type Level = 'principiante' | 'intermedio' | 'avanzado';
export type Setup = 'gimnasio' | 'mancuernas' | 'casa';
export type Unit = 'kg' | 'lbs';

export interface Profile {
    name: string;
    goal: Goal;
    level: Level;
    daysPerWeek: number; // 2..6
    setup: Setup;
    unit: Unit;
    createdAt: string;
}

export interface RoutineExercise {
    exerciseId: string;
    sets: number;
    repMin: number;
    repMax: number;
    restSec: number;
}

export interface Routine {
    id: string;
    name: string;
    exercises: RoutineExercise[];
    // Routines generated for the plan vs. created by the user.
    source: 'plan' | 'custom';
    // "programId:index" for untouched plan days: the name follows the language.
    dayKey?: string;
}

export interface Plan {
    programId: string;
    programName: string;
    routineIds: string[];
    nextIndex: number;
}

export interface LoggedSet {
    id: string;
    exerciseId: string;
    setIndex: number;
    weightKg: number;
    reps: number;
    warmup?: boolean;
    completedAt: string;
}

export interface Session {
    id: string;
    routineId: string | null;
    routineName: string;
    startedAt: string;
    endedAt: string;
    sets: LoggedSet[];
    notes?: string;
    dayKey?: string; // see Routine.dayKey; 'free' for a free workout
}

export interface BodyWeight {
    id: string;
    date: string; // ISO
    weightKg: number;
}

export interface WorkingSet {
    id: string;
    weightKg: number;
    reps: number;
    done: boolean;
    completedAt?: string;
}

export interface ActiveExercise {
    exerciseId: string;
    repMin: number;
    repMax: number;
    restSec: number;
    sets: WorkingSet[];
}

export interface ActiveWorkout {
    id: string;
    routineId: string | null;
    routineName: string;
    dayKey?: string;
    startedAt: string;
    exercises: ActiveExercise[];
    // Epoch ms when the current rest ends; null when not resting.
    restEndsAt: number | null;
    restTotalSec: number;
}

export interface Macros {
    kcal: number;
    protein: number; // grams
    carbs: number;
    fat: number;
}

export interface Meal extends Macros {
    id: string;
    date: string; // ISO
    name: string;
    source: 'manual' | 'ai';
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    at: string; // ISO
}

export interface AppState {
    version: 1;
    lang?: Lang;
    profile: Profile | null;
    routines: Routine[];
    plan: Plan | null;
    sessions: Session[]; // newest first
    active: ActiveWorkout | null;
    bodyWeights: BodyWeight[]; // newest first
    // Achievement ids the user has already been shown.
    seenAchievements: string[];
    meals: Meal[]; // newest first
    // null: targets are calculated from goal and body weight.
    nutritionTargets: Macros | null;
    coachChat: ChatMessage[]; // oldest first
}
