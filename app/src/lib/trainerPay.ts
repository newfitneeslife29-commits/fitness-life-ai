import { Capacitor } from '@capacitor/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getLang } from '../i18n';
import { publicUrl } from './community';
import { isNative } from './native';
import { notifyChat } from './push';
import { getSupabase } from './supabase';

// Hiring trainers in the app. Payments and payouts go through Stripe (the
// trainer-pay function); after paying, client and trainer talk in a private
// chat (trainer_messages, live through Supabase Realtime).

export type PayErrorCode =
    | 'stripe_not_configured' | 'connect_disabled' | 'country_unsupported' | 'not_trainer' | 'trainer_unavailable'
    | 'already_hired' | 'own_trainer' | 'not_connected' | 'network' | 'failed';

export class PayError extends Error {
    constructor(public code: PayErrorCode) {
        super(code);
    }
}

const KNOWN: PayErrorCode[] = ['stripe_not_configured', 'connect_disabled', 'country_unsupported', 'not_trainer', 'trainer_unavailable', 'already_hired', 'own_trainer', 'not_connected'];

const call = async <T>(body: Record<string, unknown>): Promise<T> => {
    const supabase = await getSupabase().catch(() => { throw new PayError('network'); });
    const { data, error } = await supabase.functions.invoke('trainer-pay', { body: { ...body, platform: isNative() ? 'native' : 'web' } });
    if (!error) return data as T;
    const context = (error as { context?: unknown }).context;
    const response = typeof Response !== 'undefined' && context instanceof Response ? context : undefined;
    if (!response || error.name === 'FunctionsFetchError') throw new PayError('network');
    // A function that isn't deployed yet answers 404 without a code.
    const code = await response.clone().json().then(b => b?.error as string).catch(() => '');
    throw new PayError(KNOWN.includes(code as PayErrorCode) ? code as PayErrorCode : response.status === 404 ? 'stripe_not_configured' : 'failed');
};

// ---------- Coming back from Stripe ----------

// 'hired' | 'canceled' | 'connected' | 'refresh' from stripe-return.html, or
// 'closed' when the in-app browser is closed by hand.
export const STRIPE_RETURN_EVENT = 'fitness-life:stripe-return';
const RETURN_URL = 'com.fitnesslife.app://stripe-return';
let listening: Promise<void> | null = null;

const listenNative = () => {
    listening ??= (async () => {
        const [{ App }, { Browser }] = await Promise.all([import('@capacitor/app'), import('@capacitor/browser')]);
        await App.addListener('appUrlOpen', async ({ url }) => {
            if (!url.startsWith(RETURN_URL)) return;
            // Android closes the browser tab itself when the app comes back.
            if (Capacitor.getPlatform() === 'ios') await Browser.close().catch(() => {});
            const to = new URL(url).searchParams.get('to') ?? 'closed';
            window.dispatchEvent(new CustomEvent(STRIPE_RETURN_EVENT, { detail: to }));
        });
        await Browser.addListener('browserFinished', () => {
            window.dispatchEvent(new CustomEvent(STRIPE_RETURN_EVENT, { detail: 'closed' }));
        });
    })().catch(e => {
        listening = null;
        throw e;
    });
    return listening;
};

// Stripe's pages: in the app's browser on phones, in the same tab on the web
// (stripe-return.html brings people back to #/entrenadores?stripe=...).
const openStripe = async (url: string) => {
    if (!/^https:\/\/([a-z0-9-]+\.)*stripe\.com\//.test(url)) throw new PayError('failed');
    if (!isNative()) {
        window.location.assign(url);
        return;
    }
    await listenNative();
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
};

// ---------- Trainers: payouts ----------

export interface PayoutStatus {
    connected: boolean;
    ready: boolean;
    detailsSubmitted: boolean;
}

export const payoutStatus = () => call<PayoutStatus>({ action: 'status' });

export const connectPayouts = async (country: string) => {
    const { url } = await call<{ url: string }>({ action: 'connect', country });
    await openStripe(url);
};

export const openPayoutDashboard = async () => {
    const { url } = await call<{ url: string }>({ action: 'dashboard' });
    await openStripe(url);
};

// Countries where trainers can receive their share (Stripe Connect, with
// cross-border payouts for those outside the Fitness Life account's country).
export const PAYOUT_COUNTRIES = [
    'US', 'MX', 'ES', 'AR', 'BO', 'BR', 'CA', 'CL', 'CO', 'CR', 'DO', 'EC', 'GT', 'HN', 'JM', 'PA', 'PE', 'PY', 'SV', 'TT', 'UY',
    'GB', 'IE', 'FR', 'DE', 'IT', 'PT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL',
    'AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'IN', 'ID', 'PH', 'TH', 'MY', 'IL', 'TR', 'AE', 'ZA',
] as const;

// The phone's country (es-MX → MX) when it's on the list.
export const guessCountry = () => {
    const region = (typeof navigator !== 'undefined' ? navigator.language : '').split('-')[1]?.toUpperCase() ?? '';
    return (PAYOUT_COUNTRIES as readonly string[]).includes(region) ? region : 'US';
};

// ---------- Clients: hiring ----------

export const hireTrainer = async (trainerId: string, name: string) => {
    const { url } = await call<{ url: string }>({ action: 'checkout', trainerId, name, lang: getLang() });
    await openStripe(url);
};

// Saves a finished checkout and refreshes the hires; the new hire's id.
export const syncHires = async () => (await call<{ hired: string | null }>({ action: 'sync' })).hired;

export const cancelHire = (linkId: string) => call<{ ok: true }>({ action: 'cancel', linkId });

// ---------- Hires and chat ----------

export interface Hire {
    id: string;
    role: 'client' | 'trainer';
    status: string;
    trainerId: string | null;
    trainerName: string;
    trainerAvatar: string | null;
    clientName: string;
    clientAvatar: string | null;
    amountCents: number;
    currency: string;
    feePercent: number;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    open: boolean;
    unread: number;
    createdAt: string;
}

type HireRow = {
    id: string; role: Hire['role']; status: string; trainer_id: string | null; trainer_name: string; trainer_avatar: string | null; trainer_avatar_updated: string | null;
    client_name: string; client_avatar: string | null; client_avatar_updated: string | null; amount_cents: number; currency: string; fee_percent: number;
    current_period_end: string | null; cancel_at_period_end: boolean; open: boolean; unread: number; created_at: string;
};

export const fetchHires = async (): Promise<Hire[]> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('trainer_links');
    if (error) {
        if (error.code === 'PGRST202') return []; // the database update isn't deployed yet
        throw error;
    }
    return ((data ?? []) as HireRow[]).map(r => ({
        id: r.id, role: r.role, status: r.status, trainerId: r.trainer_id, trainerName: r.trainer_name,
        trainerAvatar: publicUrl(r.trainer_avatar, r.trainer_avatar_updated ?? undefined),
        clientName: r.client_name, clientAvatar: publicUrl(r.client_avatar, r.client_avatar_updated ?? undefined),
        amountCents: r.amount_cents, currency: r.currency, feePercent: r.fee_percent, periodEnd: r.current_period_end,
        cancelAtPeriodEnd: r.cancel_at_period_end, open: r.open, unread: r.unread, createdAt: r.created_at,
    }));
};

// Paid, payment failing (Stripe retries) or over.
export const hireState = (h: Pick<Hire, 'status'>) =>
    h.status === 'active' || h.status === 'trialing' ? 'active' : h.status === 'past_due' || h.status === 'unpaid' ? 'pastDue' : 'ended';

// The other person's name and photo in a hire.
export const otherSide = (h: Hire) => h.role === 'client'
    ? { name: h.trainerName, avatar: h.trainerAvatar }
    : { name: h.clientName, avatar: h.clientAvatar };

export interface ChatMessage {
    id: number;
    mine: boolean;
    body: string;
    createdAt: string;
}

type MessageRow = { id: number; sender_id: string; body: string; created_at: string };

const myId = async () => (await (await getSupabase()).auth.getSession()).data.session?.user.id ?? '';

const toMessage = (me: string) => (r: MessageRow): ChatMessage => ({ id: r.id, mine: r.sender_id === me, body: r.body, createdAt: r.created_at });

// The latest messages, oldest first.
export const fetchMessages = async (linkId: string, limit = 100): Promise<ChatMessage[]> => {
    const supabase = await getSupabase();
    const me = await myId();
    const { data, error } = await supabase.from('trainer_messages').select('id, sender_id, body, created_at')
        .eq('link_id', linkId).order('id', { ascending: false }).limit(limit);
    if (error) throw error;
    return ((data ?? []) as MessageRow[]).map(toMessage(me)).reverse();
};

export const sendMessage = async (linkId: string, body: string): Promise<ChatMessage> => {
    const supabase = await getSupabase();
    const me = await myId();
    const { data, error } = await supabase.from('trainer_messages').insert({ link_id: linkId, body: body.trim() })
        .select('id, sender_id, body, created_at').single();
    if (error) throw error;
    const message = toMessage(me)(data as MessageRow);
    void notifyChat(message.id).catch(() => {});
    return message;
};

export const markRead = async (linkId: string) => {
    const supabase = await getSupabase();
    await supabase.rpc('trainer_mark_read', { link: linkId });
};

// New messages as they arrive; returns the function that stops listening.
export const watchMessages = (linkId: string, onMessage: (m: ChatMessage) => void) => {
    let channel: RealtimeChannel | null = null;
    let stopped = false;
    void (async () => {
        const supabase = await getSupabase();
        const me = await myId();
        if (stopped) return;
        channel = supabase.channel(`trainer-chat:${linkId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trainer_messages', filter: `link_id=eq.${linkId}` },
                payload => onMessage(toMessage(me)(payload.new as MessageRow)))
            .subscribe();
    })().catch(() => {});
    return () => {
        stopped = true;
        if (channel) void getSupabase().then(s => s.removeChannel(channel!));
    };
};
