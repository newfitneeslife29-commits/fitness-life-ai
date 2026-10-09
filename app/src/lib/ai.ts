import type { SupabaseClient } from '@supabase/supabase-js';
import { blobToBase64 } from './image';
import { backendAvailable, getSupabase } from './supabase';
import type { Lang } from '../i18n';
import { actions } from '../store/store';
import type { AiUsage, ChatMessage, Goal, Macros } from '../store/types';

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

// Without an account the app signs in anonymously, so the coach can count
// uses per device. One sign-in at a time.
let anonymous: Promise<void> | null = null;
const getClient = async (): Promise<SupabaseClient> => {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
        anonymous ??= supabase.auth.signInAnonymously().then(({ error }) => {
            if (error) throw error;
        }).finally(() => { anonymous = null; });
        await anonymous;
    }
    return supabase;
};

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
