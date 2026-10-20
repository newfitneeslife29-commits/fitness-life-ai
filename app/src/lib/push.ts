import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import { toast } from '../components/feedback';
import { getLang } from '../i18n';
import { getState, useStore } from '../store/store';
import { isNative } from './native';
import { getSupabase } from './supabase';

// Phone notifications: new messages in the trainer chat, and likes, comments
// and followers in the community. Each phone that allows them saves its token
// in the account (push_register, with the app's language); the chat-push and
// community-push functions notify the other person's phones.

const TOKEN_KEY = 'fitness-life:push-token';
// The screens a notification may open.
const LINK = /^\/(entrenadores\/chat\/[0-9a-f-]{36}|comunidad(\/u\/[0-9a-f-]{36})?)$/;

// Android needs the Firebase settings (google-services.json) in the build:
// the release build adds them when the GOOGLE_SERVICES_JSON secret exists.
const available = () => isNative() && (Capacitor.getPlatform() !== 'android' || import.meta.env.VITE_ANDROID_PUSH === 'on');

const plugin = () => import('@capacitor/push-notifications').then(m => m.PushNotifications);

let listening: Promise<void> | null = null;

const savedToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

const saveToken = async (token: string) => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch { /* kept only for signing out */ }
    const supabase = await getSupabase();
    const platform = Capacitor.getPlatform();
    await supabase.rpc('push_register', { token, platform, lang: getLang() });
};

const listen = () => {
    listening ??= (async () => {
        const push = await plugin();
        await push.addListener('registration', ({ value }) => { void saveToken(value).catch(() => {}); });
        // Tapping a notification opens its screen (also when it started the app).
        await push.addListener('pushNotificationActionPerformed', ({ notification }) => {
            const link = String(notification.data?.link ?? '');
            if (LINK.test(link)) window.location.hash = `#${link}`;
        });
        // With the app open the phone shows nothing: a note, unless that screen is open.
        await push.addListener('pushNotificationReceived', n => {
            const link = String(n.data?.link ?? '');
            if (window.location.hash === `#${link}`) return;
            const text = [n.title, n.body].filter(Boolean).join(': ');
            if (text) toast(text, 4000);
        });
        if (Capacitor.getPlatform() === 'android') {
            await push.createChannel({ id: 'chat', name: 'Chat', importance: 4, visibility: 0, vibration: true }).catch(() => {});
        }
    })().catch(e => {
        listening = null;
        throw e;
    });
    return listening;
};

// Asks to allow notifications (once: the phone remembers the answer) and
// saves this phone's token. Called where notifications matter: the chats
// and the community.
export const enablePush = async () => {
    if (!available() || !getState().account) return;
    try {
        await listen();
        const push = await plugin();
        let { receive } = await push.checkPermissions();
        if (receive === 'prompt' || receive === 'prompt-with-rationale') receive = (await push.requestPermissions()).receive;
        if (receive === 'granted') await push.register();
    } catch { /* notifications are a bonus: the chat works without them */ }
};

// At start and when the account or the language changes: taps on
// notifications open their screen, and a phone that already allows them
// refreshes its token.
export const usePush = () => {
    const accountId = useStore(s => s.account?.id ?? null);
    const lang = useStore(s => s.lang);
    useEffect(() => {
        if (!available()) return;
        void listen().catch(() => {});
        if (!accountId) return;
        void (async () => {
            const push = await plugin();
            if ((await push.checkPermissions()).receive === 'granted') await push.register();
        })().catch(() => {});
    }, [accountId, lang]);
};

// Signing out: this phone stops getting the account's messages.
export const forgetPushToken = async () => {
    const token = savedToken();
    if (!token) return;
    try {
        const supabase = await getSupabase();
        await supabase.rpc('push_unregister', { token });
        localStorage.removeItem(TOKEN_KEY);
    } catch { /* the next account that signs in on this phone takes the token over */ }
};

// Right after sending: the other person gets a notification.
export const notifyChat = async (messageId: number) => {
    const supabase = await getSupabase();
    await supabase.functions.invoke('chat-push', { body: { messageId } });
};

// Right after a like, a comment or a follow: the other person hears about it.
export const notifyCommunity = async (body: { kind: 'like'; postId: string } | { kind: 'comment'; commentId: string } | { kind: 'follow'; userId: string }) => {
    const supabase = await getSupabase();
    await supabase.functions.invoke('community-push', { body });
};
