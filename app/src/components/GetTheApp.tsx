import { Apple, Play, X } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n';
import { isNative } from '../lib/native';
import { Logo } from './Welcome';

// On the web only: an invitation to install the app from the App Store or
// Google Play. A phone sees its own store; a computer sees both. Closing it
// hides it for a week. A store without a link (not published yet) is left out.

// The App Store id is the number in App Store Connect → App information → Apple ID.
export const APP_STORE_ID = '6822443646';
export const APP_STORE_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : '';
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.fitnesslife.app';

const HIDDEN_KEY = 'fitness-life:get-app-hidden';
const WEEK_MS = 7 * 86_400_000;

type Store = { id: 'ios' | 'android'; url: string; label: string; icon: typeof Apple };

const deviceStores = (): Store[] => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const all: Store[] = [
        { id: 'ios', url: APP_STORE_URL, label: 'App Store', icon: Apple },
        { id: 'android', url: PLAY_URL, label: 'Google Play', icon: Play },
    ];
    return all.filter(s => s.url && (ios ? s.id === 'ios' : android ? s.id === 'android' : true));
};

const hiddenRecently = () => {
    try {
        return Date.now() - Number(localStorage.getItem(HIDDEN_KEY) ?? 0) < WEEK_MS;
    } catch {
        return false;
    }
};

// The thin bar at the very top of the welcome screen, like many websites
// show: the app, where it is, and a button to get it. Web only.
export const GetTheAppBar = () => {
    const [hidden, setHidden] = useState(() => isNative() || hiddenRecently());
    const stores = isNative() ? [] : deviceStores();
    if (hidden || !stores.length) return null;
    const close = () => {
        try { localStorage.setItem(HIDDEN_KEY, String(Date.now())); } catch { /* shown again next visit */ }
        setHidden(true);
    };
    const one = stores.length === 1 ? stores[0] : null;
    return (
        <aside aria-label={t('getApp.title')} className="relative z-20 border-b border-line bg-ink-2/95 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="mx-auto flex max-w-lg items-center gap-2.5 px-3 py-2">
                <button onClick={close} aria-label={t('common.close')} className="rounded-full p-1 text-white/45 hover:text-white"><X size={16} /></button>
                <span className="shrink-0 overflow-hidden rounded-xl"><Logo size={38} /></span>
                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-bold">Fitness Life</p>
                    <p className="truncate text-xs text-white/55">{one ? t('getApp.freeOn', { store: one.label }) : t('getApp.title')}</p>
                </div>
                {one ? (
                    <a href={one.url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-snow active:scale-95">{t('getApp.get')}</a>
                ) : stores.map(({ id, url, label, icon: Icon }) => (
                    <a key={id} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-snow active:scale-95">
                        <Icon size={14} fill={id === 'android' ? 'currentColor' : 'none'} /> {label}
                    </a>
                ))}
            </div>
        </aside>
    );
};
