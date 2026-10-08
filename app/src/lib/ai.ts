import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lang } from '../i18n';
import { actions } from '../store/store';
import type { AiUsage, ChatMessage, Goal, Macros } from '../store/types';

// The nutrition coach runs in a Supabase Edge Function
// (supabase/functions/nutrition-coach) that holds the Anthropic key. The app
// signs in anonymously so the function can count uses per device; that id is
// also the RevenueCat user id, so the function knows who has Premium. No
// personal data is stored on the server.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const aiAvailable = () => Boolean(SUPABASE_URL && ANON_KEY);

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

let client: Promise<SupabaseClient> | null = null;

// Loaded on first use so the rest of the app does not pay for it.
const getClient = () => {
    client ??= import('@supabase/supabase-js').then(async ({ createClient }) => {
        const supabase = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { storageKey: 'fitness-life:auth' } });
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
            const { error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
        }
        return supabase;
    });
    return client.catch(e => {
        client = null; // retry on the next call
        throw e;
    });
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
