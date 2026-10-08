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
        if (local.profile) await push(account.id);
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

// Resolves once the data of the account that just signed in is in place.
export const waitForSync = () => current;

export const syncAccount = (account: Account, fresh: boolean) => {
    current = reconcile(account, fresh).catch(e => console.warn('cloud sync failed', e));
    return current;
};

let timer: number | undefined;
let started = false;

// Sends changes while signed in.
export const startCloudSync = () => {
    if (started) return;
    started = true;
    subscribeStore(() => {
        const account = getState().account;
        if (!account) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            void current.then(() => push(account.id)).catch(e => console.warn('cloud push failed', e));
        }, PUSH_DELAY_MS);
    });
};

export const forgetCloudState = () => {
    lastPushed = '';
    window.clearTimeout(timer);
};
