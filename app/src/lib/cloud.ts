import { confirm } from '../components/feedback';
import { t } from '../i18n';
import { actions, getState, subscribeStore } from '../store/store';
import type { Account, AppState } from '../store/types';
import { getSupabase } from './supabase';

// With an account, a copy of the training data lives in Supabase (table
// user_data, one row per user, readable only by its owner). Every change is
// sent a few seconds later; signing in on another phone brings it back.
// Last write wins: the app is used on one phone at a time.

const TABLE = 'user_data';
const PUSH_DELAY_MS = 2500;

// What goes to the cloud: the training data, not this device's session state.
export const snapshot = (s: AppState) => {
    const { account: _a, authPrompted: _p, cloudSyncedAt: _c, active: _w, aiUsage: _u, premium: _m, lang: _l, theme: _t, ...data } = s;
    return data;
};

const hasData = (s: Partial<AppState>) => Boolean(s.profile) && ((s.sessions?.length ?? 0) > 0 || (s.meals?.length ?? 0) > 0);

let lastPushed = '';

// Offline (a gym in a basement): everything keeps working on the phone and
// is saved there; what could not be sent is sent when the signal is back.
export type CloudStatus = 'synced' | 'pending' | 'offline';
let status: CloudStatus = 'synced';
const statusListeners = new Set<() => void>();
const setStatus = (next: CloudStatus) => {
    if (next === status) return;
    status = next;
    statusListeners.forEach(l => l());
};
export const getCloudStatus = () => status;
export const subscribeCloudStatus = (l: () => void) => {
    statusListeners.add(l);
    return () => { statusListeners.delete(l); };
};
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

const pull = async (userId: string) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.from(TABLE).select('data, updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data as { data: Partial<AppState>; updated_at: string } | null;
};

export const push = async (userId: string) => {
    const body = JSON.stringify(snapshot(getState()));
    if (body === lastPushed) return;
    const supabase = await getSupabase();
    const at = new Date().toISOString();
    const { error } = await supabase.from(TABLE).upsert({ user_id: userId, data: JSON.parse(body), updated_at: at });
    if (error) throw error;
    lastPushed = body;
    actions.setCloudSyncedAt(at);
};

const restore = (row: { data: Partial<AppState>; updated_at: string }) => {
    actions.restoreSnapshot(row.data, row.updated_at);
    lastPushed = JSON.stringify(snapshot(getState()));
};

// Right after signing in: bring the account's data, or upload this phone's.
// If both have workouts, the user picks.
const reconcile = async (account: Account, fresh: boolean) => {
    const row = await pull(account.id);
    const local = getState();
    if (!row?.data?.profile) {
        if (!local.profile) return;
        // A brand-new account while this phone already has a plan: keep it in
        // the account, or start over with the questions. Closing the dialog keeps it.
        const startOver = fresh && await confirm({
            title: t('account.newTitle'),
            message: t('account.newMessage'),
            confirmLabel: t('account.startFresh'),
            cancelLabel: t('account.keepData'),
        });
        if (startOver) actions.resetAll();
        else await push(account.id);
        return;
    }
    const same = JSON.stringify(snapshot({ ...local, ...row.data } as AppState)) === JSON.stringify(snapshot(local));
    if (same) {
        lastPushed = JSON.stringify(snapshot(local));
        actions.setCloudSyncedAt(row.updated_at);
        return;
    }
    // Opening the app again: take the account's copy if it is newer than this phone's last sync.
    if (!fresh) {
        if (!local.cloudSyncedAt || row.updated_at > local.cloudSyncedAt) restore(row);
        else await push(account.id);
        return;
    }
    if (!hasData(local)) {
        restore(row);
        return;
    }
    const useAccount = await confirm({
        title: t('account.conflictTitle'),
        message: t('account.conflictMessage', { cloud: row.data.sessions?.length ?? 0, local: local.sessions.length }),
        confirmLabel: t('account.useCloud'),
        cancelLabel: t('account.keepLocal'),
    });
    if (useAccount) restore(row);
    else await push(account.id);
};

let current: Promise<void> = Promise.resolve();
// The account's copy could not be checked when signing in (no signal).
let reconcilePending: Account | null = null;

// Resolves once the data of the account that just signed in is in place.
export const waitForSync = () => current;

export const syncAccount = (account: Account, fresh: boolean) => {
    current = reconcile(account, fresh).then(() => {
        reconcilePending = null;
        setStatus('synced');
    }).catch(e => {
        console.warn('cloud sync failed', e);
        reconcilePending = account;
        setStatus(isOffline() ? 'offline' : 'pending');
    });
    return current;
};

let timer: number | undefined;
let retryTimer: number | undefined;
let started = false;
const RETRY_MS = 30_000;

const send = (userId: string) => current.then(() => push(userId)).then(() => {
    window.clearTimeout(retryTimer);
    setStatus('synced');
}).catch(e => {
    console.warn('cloud push failed', e);
    setStatus(isOffline() ? 'offline' : 'pending');
    // Try again later, and right away when the phone is back online.
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(retry, RETRY_MS);
});

// Back online (or a retry is due): first the sign-in check that failed, then the changes.
const retry = () => {
    const account = getState().account;
    if (!account) return;
    if (reconcilePending?.id === account.id) void syncAccount(account, false).then(() => send(account.id));
    else if (status !== 'synced') void send(account.id);
};

// Sends changes while signed in.
export const startCloudSync = () => {
    if (started) return;
    started = true;
    subscribeStore(() => {
        const account = getState().account;
        if (!account) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void send(account.id), PUSH_DELAY_MS);
    });
    window.addEventListener('online', retry);
    window.addEventListener('offline', () => { if (status !== 'synced') setStatus('offline'); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') retry(); });
};

// Sends anything not sent yet (before signing out).
export const flushCloud = async (userId: string) => {
    window.clearTimeout(timer);
    await current.catch(() => {});
    await push(userId);
};

export const forgetCloudState = () => {
    lastPushed = '';
    reconcilePending = null;
    window.clearTimeout(timer);
    window.clearTimeout(retryTimer);
    setStatus('synced');
};
