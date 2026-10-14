import type { SupabaseClient } from '@supabase/supabase-js';
import { blobToBase64 } from './image';
import { backendAvailable, getSessionClient } from './supabase';
import type { Lang } from '../i18n';
import { actions } from '../store/store';
import type { Activity, AiUsage, ChatMessage, Goal, Level, Limitation, Macros, MealPlan, Setup, Sex } from '../store/types';

// The nutrition coach runs in a Supabase Edge Function
// (supabase/functions/nutrition-coach) that holds the Anthropic key. The
// session (the user's account, or an anonymous one) identifies who asks; that
// id is also the RevenueCat user id, so the function knows who has Premium.

export const aiAvailable = backendAvailable;

// upgrade: the free uses of this month are spent → offer Premium.
// quota: even Premium has a monthly ceiling.
export type AiErrorCode = 'unavailable' | 'upgrade' | 'quota' | 'refused' | 'network' | 'failed';
export class AiError extends Error {
    constructor(public code: AiErrorCode) {
        super(code);
    }
}

export interface CoachContext {
    goal: Goal;
    weightKg: number | null;
    targets: Macros | null;
    today: Macros;
    trainedToday: boolean;
    // From the profile, when the user gave them.
    sex?: Sex;
    age?: number;
    heightCm?: number;
    activity?: Activity;
    targetWeightKg?: number;
}

export interface MealItem extends Macros {
    name: string;
    grams: number;
}

export interface MealEstimate {
    name: string;
    items: MealItem[];
    note: string;
}

const getClient = getSessionClient;

const call = async <T>(body: Record<string, unknown>): Promise<T> => {
    if (!aiAvailable()) throw new AiError('unavailable');
    let supabase: SupabaseClient;
    try {
        supabase = await getClient();
    } catch {
        throw new AiError('network');
    }
    const { data, error } = await supabase.functions.invoke('nutrition-coach', { body });
    if (!error) {
        if (data?.usage) actions.setAiUsage(data.usage as AiUsage);
        return data as T;
    }
    const response = (error as { context?: Response }).context;
    const status = response?.status;
    const usage = await response?.clone().json().then(b => b?.usage as AiUsage | undefined).catch(() => undefined);
    if (usage) actions.setAiUsage(usage);
    if (status === 402) throw new AiError('upgrade');
    if (status === 429) throw new AiError('quota');
    if (status === 422) throw new AiError('refused');
    if (status === undefined || error.name === 'FunctionsFetchError') throw new AiError('network');
    throw new AiError('failed');
};

export const askCoach = async (lang: Lang, context: CoachContext, history: ChatMessage[]) => {
    const messages = history.map(m => ({ role: m.role, text: m.text }));
    const { text } = await call<{ text: string }>({ action: 'chat', lang, context, messages });
    return text;
};

// ---------- Personal trainer (Premium) ----------

export interface TrainerContext {
    goal: Goal;
    level: Level;
    daysPerWeek: number;
    setup: Setup;
    limitations: Limitation[];
    sex?: Sex;
    age?: number;
    heightCm?: number;
    weightKg: number | null;
    targetWeightKg?: number;
    plan: string; // the current plan, summarised
    history: string; // recent workouts, newest first
}

export interface CatalogExercise {
    id: string;
    name: string;
    muscle: string;
    equipment: string;
    timed: boolean;
}

export interface AiRoutine {
    name: string;
    note: string;
    exercises: { exerciseId: string; sets: number; repMin: number; repMax: number; restSec: number }[];
}

export const askTrainer = async (lang: Lang, context: TrainerContext, history: ChatMessage[]) => {
    const messages = history.map(m => ({ role: m.role, text: m.text }));
    const { text } = await call<{ text: string }>({ action: 'trainer', lang, context, messages });
    return text;
};

export const designRoutine = (lang: Lang, context: TrainerContext, request: string, exercises: CatalogExercise[]) =>
    call<AiRoutine>({ action: 'routine', lang, context, text: request, exercises });

// ---------- Meal plan (Premium) ----------

export type AiMealPlan = Pick<MealPlan, 'name' | 'note' | 'days'>;

// A week of meals for the user's targets; `request` holds their preferences.
export const designMealPlan = (lang: Lang, context: CoachContext, request: string, mealsPerDay: number) =>
    call<AiMealPlan>({ action: 'mealplan', lang, context, text: request, mealsPerDay });

export const estimateMeal = (lang: Lang, description: string) =>
    call<MealEstimate>({ action: 'estimate', lang, text: description });

// A photo of the plate (already shrunk to a JPEG), plus an optional note.
export const estimateMealPhoto = async (lang: Lang, photo: Blob, note: string) =>
    call<MealEstimate>({ action: 'photo', lang, image: await blobToBase64(photo), mediaType: 'image/jpeg', text: note });

// Remaining uses and Premium status, without spending a use.
export const refreshUsage = () => call<{ usage: AiUsage }>({ action: 'status' }).then(r => r.usage);

// The anonymous account id, shared with RevenueCat so purchases and AI uses
// belong to the same user.
export const getUserId = async () => {
    const supabase = await getClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new AiError('network');
    return data.session.user.id;
};

// ---------- Reports ----------
// Anyone can flag an AI answer or meal estimate (Google Play asks AI apps for
// this); the report keeps the answer and the question so it can be reviewed.

export type AiReportReason = 'offensive' | 'harmful' | 'wrong' | 'other';
export const AI_REPORT_REASONS: AiReportReason[] = ['offensive', 'harmful', 'wrong', 'other'];

export interface AiReport {
    kind: 'coach' | 'meal' | 'trainer' | 'routine' | 'mealplan';
    content: string;
    question?: string;
}

export const reportAiAnswer = async (report: AiReport, reason: AiReportReason, note: string) => {
    if (!aiAvailable()) throw new AiError('unavailable');
    const supabase = await getClient();
    const { error } = await supabase.from('ai_reports').insert({
        kind: report.kind,
        reason,
        content: report.content.slice(0, 4000),
        question: (report.question ?? '').slice(0, 1000),
        note: note.trim().slice(0, 500),
    });
    if (error) throw new AiError('failed');
};
