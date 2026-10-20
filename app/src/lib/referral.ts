import { getSupabase } from './supabase';

// Invite a friend: my code (and how many friends joined with it), and
// entering a friend's code. Both get a week of Premium (the referral function).

export type InviteError = 'invalid_code' | 'own_code' | 'already_redeemed' | 'too_late' | 'needs_account' | 'not_configured' | 'failed';
const KNOWN: InviteError[] = ['invalid_code', 'own_code', 'already_redeemed', 'too_late', 'needs_account', 'not_configured'];

export class InviteFailure extends Error {
    constructor(public code: InviteError) {
        super(code);
    }
}

export const fetchMyCode = async (): Promise<{ code: string; friends: number } | null> => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc('referral_my_code');
    if (error) {
        if (error.code === 'PGRST202') return null; // not deployed yet
        throw error;
    }
    const row = (data as { code: string; friends: number }[] | null)?.[0];
    return row ? { code: row.code, friends: row.friends } : null;
};

export const cleanCode = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export const redeemCode = async (code: string) => {
    const supabase = await getSupabase().catch(() => { throw new InviteFailure('failed'); });
    const { error } = await supabase.functions.invoke('referral', { body: { action: 'redeem', code } });
    if (!error) return;
    const context = (error as { context?: unknown }).context;
    const response = typeof Response !== 'undefined' && context instanceof Response ? context : undefined;
    const reason = response ? await response.clone().json().then(b => b?.error as string).catch(() => '') : '';
    throw new InviteFailure(KNOWN.includes(reason as InviteError) ? reason as InviteError : response?.status === 404 ? 'not_configured' : 'failed');
};
