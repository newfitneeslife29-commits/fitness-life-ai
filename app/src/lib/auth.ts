import { Capacitor } from '@capacitor/core';
import type { AuthError, User } from '@supabase/supabase-js';
import { actions, getState } from '../store/store';
import type { Account } from '../store/types';
import { forgetCloudState, startCloudSync, syncAccount } from './cloud';
import { switchPremiumUser } from './premium';
import { AUTH_STORAGE_KEY, backendAvailable, getSupabase, SITE_URL } from './supabase';

// Accounts with Supabase Auth: e-mail and password, Google and Apple.
// Without an account the app keeps working with an anonymous session.
//
// OAuth on the web redirects back to the page (?code=...). Inside the
// iOS/Android apps it opens the system browser and comes back through the
// com.fitnesslife.app://auth-callback link (declared in AndroidManifest.xml
// and Info.plist).

export const authAvailable = backendAvailable;

export type OAuthProvider = 'google' | 'apple';
const NATIVE_CALLBACK = 'com.fitnesslife.app://auth-callback';
const native = Capacitor.isNativePlatform();

// Where e-mail links and web OAuth come back to.
const webRedirect = () => (native ? SITE_URL : `${location.origin}${location.pathname}`);

export type AuthErrorCode = 'invalid' | 'exists' | 'weak' | 'email' | 'confirm' | 'network' | 'rate' | 'failed';
export class AuthFailure extends Error {
    constructor(public code: AuthErrorCode) {
        super(code);
    }
}

const failure = (e: AuthError | Error): AuthFailure => {
    const { code, status } = e as AuthError;
    const msg = e.message.toLowerCase();
    if (code === 'invalid_credentials' || msg.includes('invalid login')) return new AuthFailure('invalid');
    if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return new AuthFailure('exists');
    if (code === 'weak_password' || msg.includes('password should')) return new AuthFailure('weak');
    if (code === 'email_address_invalid' || code === 'validation_failed' || msg.includes('invalid email')) return new AuthFailure('email');
    if (code === 'email_not_confirmed') return new AuthFailure('confirm');
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429) return new AuthFailure('rate');
    if (e.name === 'AuthRetryableFetchError' || status === 0 || msg.includes('fetch')) return new AuthFailure('network');
    return new AuthFailure('failed');
};

const toAccount = (user: User | null | undefined): Account | null =>
    !user || user.is_anonymous ? null : { id: user.id, email: user.email ?? null, provider: String(user.app_metadata?.provider ?? 'email') };

// Fired when an e-mail "reset password" link is opened: the app asks for a new one.
export const PASSWORD_RECOVERY_EVENT = 'fitness-life:password-recovery';

const onAccount = (account: Account | null) => {
    const before = getState().account;
    if (account?.id === before?.id) return;
    actions.setAccount(account);
    actions.setAiUsage(null);
    actions.setPremium(null);
    void switchPremiumUser();
    if (account) void syncAccount(account, true);
    else forgetCloudState();
};

let listening: Promise<void> | null = null;

// Starts watching the session. Called at launch when there may be one
// (stored session or an OAuth callback) and before any sign-in.
export const startAuth = () => {
    listening ??= (async () => {
        const supabase = await getSupabase();
        startCloudSync();
        supabase.auth.onAuthStateChange((event, session) => {
            // Supabase asks not to await other auth calls inside this callback.
            window.setTimeout(() => {
                if (event === 'PASSWORD_RECOVERY') window.dispatchEvent(new Event(PASSWORD_RECOVERY_EVENT));
                if (event === 'INITIAL_SESSION') {
                    const account = toAccount(session?.user);
                    if (account && account.id === getState().account?.id) void syncAccount(account, false);
                    else onAccount(account);
                } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                    onAccount(toAccount(session?.user));
                }
            }, 0);
        });
        if (/[?&]code=/.test(location.search)) {
            // Web OAuth: Supabase exchanges the code on load; then clean the address.
            await supabase.auth.getSession();
            history.replaceState(null, '', `${location.pathname}${location.hash}`);
        }
        if (native) {
            const [{ App }, { Browser }] = await Promise.all([import('@capacitor/app'), import('@capacitor/browser')]);
            await App.addListener('appUrlOpen', async ({ url }) => {
                if (!url.startsWith(NATIVE_CALLBACK)) return;
                await Browser.close().catch(() => {});
                const code = new URL(url).searchParams.get('code');
                if (code) await supabase.auth.exchangeCodeForSession(code);
            });
        }
    })().catch(e => {
        listening = null;
        throw e;
    });
    return listening;
};

// At launch, only load Supabase when there may be a session to restore.
export const initAuth = () => {
    if (!authAvailable()) return;
    const stored = (() => {
        try {
            return localStorage.getItem(AUTH_STORAGE_KEY) !== null;
        } catch {
            return false;
        }
    })();
    if (stored || getState().account || /[?&]code=/.test(location.search)) void startAuth().catch(() => {});
};

const ready = async () => {
    try {
        await startAuth();
        return await getSupabase();
    } catch (e) {
        throw failure(e as Error);
    }
};

// 'signedIn', or 'confirm' when the project asks to confirm the e-mail first.
export const signUpWithEmail = async (email: string, password: string): Promise<'signedIn' | 'confirm'> => {
    const supabase = await ready();
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: webRedirect() } });
    if (error) throw failure(error);
    // An e-mail already in use comes back without identities (and without an error).
    if (data.user && data.user.identities?.length === 0) throw new AuthFailure('exists');
    return data.session ? 'signedIn' : 'confirm';
};

export const signInWithEmail = async (email: string, password: string) => {
    const supabase = await ready();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw failure(error);
};

export const signInWithProvider = async (provider: OAuthProvider) => {
    const supabase = await ready();
    if (!native) {
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: webRedirect() } });
        if (error) throw failure(error);
        return; // the page leaves for the provider
    }
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: NATIVE_CALLBACK, skipBrowserRedirect: true } });
    if (error || !data.url) throw failure(error ?? new Error('no url'));
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
};

export const sendPasswordReset = async (email: string) => {
    const supabase = await ready();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: webRedirect() });
    if (error) throw failure(error);
};

export const updatePassword = async (password: string) => {
    const supabase = await ready();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw failure(error);
};

export const signOut = async () => {
    const supabase = await ready();
    await supabase.auth.signOut({ scope: 'local' });
    onAccount(null);
};

// Deletes the account, its cloud copy and its AI usage records (server side).
export const deleteAccount = async () => {
    const supabase = await ready();
    const { error } = await supabase.functions.invoke('account', { body: { action: 'delete' } });
    if (error) throw new AuthFailure('failed');
    await supabase.auth.signOut({ scope: 'local' });
    onAccount(null);
};

export interface Providers {
    google: boolean;
    apple: boolean;
}

let providers: Promise<Providers> | null = null;

// Which sign-in buttons to show: what the Supabase project has turned on.
export const enabledProviders = () => {
    providers ??= fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' } })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((s: { external?: Record<string, boolean> }) => ({ google: Boolean(s.external?.google), apple: Boolean(s.external?.apple) }))
        .catch(() => {
            providers = null; // try again next time
            return { google: false, apple: false };
        });
    return providers;
};
