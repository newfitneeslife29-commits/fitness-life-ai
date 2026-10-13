import type { SupabaseClient } from '@supabase/supabase-js';

// One Supabase client for the whole app: accounts, cloud copy and the AI coach.
// Loaded on first use so the rest of the app does not pay for it.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// The published web app: where e-mail links (confirm, reset password) land.
export const SITE_URL = 'https://newfitneeslife29-commits.github.io/fitness-life-ai/';

export const backendAvailable = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const AUTH_STORAGE_KEY = 'fitness-life:auth';

let client: Promise<SupabaseClient> | null = null;

export const getSupabase = () => {
    client ??= import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
            // PKCE: OAuth comes back with ?code=..., which leaves the #/route alone.
            auth: { storageKey: AUTH_STORAGE_KEY, flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
        }));
    return client.catch(e => {
        client = null; // retry on the next call
        throw e;
    });
};

// A client with a session: without an account the app signs in anonymously
// (the AI counts uses per device, the community needs a session to read).
// One anonymous sign-in at a time, so two features starting together don't
// create two users.
let anonymous: Promise<void> | null = null;
export const getSessionClient = async (): Promise<SupabaseClient> => {
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
