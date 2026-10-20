import type { Lang } from '../i18n';
import type { Theme } from '../lib/theme';

export type Goal = 'fuerza' | 'musculo' | 'grasa' | 'salud';
export type Level = 'principiante' | 'intermedio' | 'avanzado';
export type Setup = 'gimnasio' | 'mancuernas' | 'casa';
// Cardio machines someone has at home (added to their home plan).
export type HomeGear = 'bici' | 'cinta' | 'eliptica';
export type Unit = 'kg' | 'lbs';
export type Sex = 'hombre' | 'mujer';
// Daily activity outside training, for the calorie estimate.
export type Activity = 'sedentario' | 'ligero' | 'moderado' | 'alto';
// Joints that hurt or were injured: plans avoid what loads them most.
export type Limitation = 'rodillas' | 'espalda' | 'hombros' | 'munecas';

// "Lose 6 kg" / "gain 4 kg": where the user started and where they want to be.
export interface WeightGoal {
    startKg: number;
    targetKg: number;
    startedAt: string; // ISO
}

export interface Profile {
    name: string;
    goal: Goal;
    level: Level;
    daysPerWeek: number; // 2..6
    setup: Setup;
    homeGear?: HomeGear[];
    unit: Unit;
    createdAt: string;
    avatar?: string; // profile picture, a small JPEG data URL
    // About the person, asked at sign-up (missing for people who signed up
    // before these questions existed: the app asks them later).
    sex?: Sex;
    birthYear?: number;
    heightCm?: number;
    activity?: Activity;
    limitations?: Limitation[];
    weightGoal?: WeightGoal | null;
    // A program picked from the list; without one the app picks it.
    programId?: string | null;
    // The timer reads the seconds out loud in timed exercises (on by default).
    voice?: boolean;
    // Beeps when the rest is almost over and ends (on by default).
    restSound?: boolean;
    // Reminders when trained muscles have rested (on by default).
    recoveryAlerts?: boolean;
    // "Don't lose your streak" at 8 pm on days the app wasn't opened (on by default).
    streakReminder?: boolean;
    // A notification at the time of each meal of the meal plan (on by default).
    mealReminders?: boolean;
    stepGoal?: number; // daily steps (default 8000; a walking plan sets its own)
    // "Time to train" on the chosen days (0 = Monday … 6 = Sunday); off when null.
    trainingReminder?: { time: string; days: number[] } | null;
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
    // A plan day the user changed by hand: the weekly update leaves it alone.
    edited?: boolean;
}

// What changed when a completed week moved the plan on (shown once).
export interface PlanUpdate {
    week: number;
    swaps: { from: string; to: string }[]; // exercise ids
    seen: boolean;
}

export interface Plan {
    programId: string;
    programName: string;
    routineIds: string[];
    nextIndex: number;
    // Week of the plan (1 when it is made). It moves on each time the user
    // completes the days of a week; the routines change with it.
    week?: number;
    advancedFor?: string; // local day of the Monday of the week that moved it on
    update?: PlanUpdate | null;
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
    // Seconds working and resting (sessions saved since the active clock).
    activeSec?: number;
    restSec?: number;
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
    // Time spent in rests that already ended (ms): the active clock leaves it out.
    restedMs?: number;
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
    planKey?: string; // logged from the meal plan: "planId:day:meal"
}

// A recipe the user saved; macros are per serving.
export interface Recipe extends Macros {
    id: string;
    name: string;
    servings: number;
    ingredients: string[];
    steps: string;
    createdAt: string;
}

// ---------- Movement: steps, sleep, walks and rides ----------

export type CardioKind = 'walk' | 'run' | 'bike';

export interface CardioSession {
    id: string;
    kind: CardioKind;
    startedAt: string;
    endedAt: string;
    durationSec: number; // moving time, pauses left out
    distanceM: number;
    steps?: number; // walks and runs
    kcal: number;
    source: 'gps' | 'manual';
    walkPlan?: string; // "planId:week:walk" when it was a walk of the plan
}

// The walk or ride being recorded (kept so it survives leaving the screen).
export interface ActiveCardio {
    kind: CardioKind;
    startedAt: string;
    pausedAt: number | null; // epoch ms
    pausedMs: number;
    distanceM: number;
    last: { lat: number; lon: number; at: number } | null;
    gps: 'waiting' | 'ok' | 'denied' | 'off';
    targetMin?: number;
    walkPlan?: string;
}

export interface SleepEntry {
    id: string;
    day: string; // local day of waking up, "YYYY-MM-DD"
    bedAt: string; // ISO
    wakeAt: string; // ISO
    minutes: number; // asleep
    source: 'manual' | 'health';
}

export interface WalkPlanState {
    id: string;
    startedAt: string; // ISO; week 1 starts that day
    done: string[]; // "week:walk" of walks completed
}

// ---------- Meal plan (made by the AI) ----------

export type MealSlot = 'desayuno' | 'media-manana' | 'almuerzo' | 'merienda' | 'cena' | 'snack';

export interface PlannedMeal extends Macros {
    slot: MealSlot;
    time: string; // "HH:MM"
    name: string;
    foods: string[]; // with amounts, e.g. "80 g de avena"
}

export interface MealPlan {
    id: string;
    name: string;
    note: string;
    request: string; // what the user asked for
    createdAt: string; // ISO
    days: { meals: PlannedMeal[] }[]; // 7 days, Monday first
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    at: string; // ISO
}

export interface AiUsage {
    used: number; // AI uses this month
    limit: number;
    premium: boolean;
}

// Last known subscription state, for the UI. The server checks it again
// on every AI request.
export interface PremiumStatus {
    active: boolean;
    expiresAt: string | null; // null: no expiry known (or lifetime)
    willRenew: boolean;
    manageUrl: string | null;
    checkedAt: string;
}

// Intermittent fasting: the chosen plan (hours fasting), the fast in
// progress and the latest ones.
export interface Fasting {
    hours: number;
    startedAt: string | null;
    history: { start: string; end: string; hours: number }[]; // newest first
}

// A signed-in account (the anonymous session used without one is not stored).
export interface Account {
    id: string;
    email: string | null;
    provider: string; // email, google, apple
}

export interface AppState {
    version: 1;
    lang?: Lang;
    theme?: Theme; // default: follow the phone
    account?: Account | null;
    authPrompted?: boolean; // the sign-in screen was offered once
    cloudSyncedAt?: string | null; // last copy to or from the account
    blockedUsers?: string[]; // community: people whose posts are hidden
    communityRulesAccepted?: boolean;
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
    trainerChat: ChatMessage[]; // the personal trainer's, oldest first
    mealPlan?: MealPlan | null;
    water?: Record<string, number>; // ml drunk by local day "YYYY-MM-DD"
    fasting?: Fasting;
    recipes?: Recipe[]; // the user's own, newest first
    steps?: Record<string, number>; // steps by local day
    sleep?: SleepEntry[]; // newest first
    cardio?: CardioSession[]; // newest first
    cardioActive?: ActiveCardio | null;
    walkPlan?: WalkPlanState | null;
    activeDays?: string[]; // local "YYYY-MM-DD" days the app was opened, oldest first
    aiUsage: AiUsage | null;
    premium: PremiumStatus | null;
}
