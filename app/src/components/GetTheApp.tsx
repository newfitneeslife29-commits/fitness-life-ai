import { Apple, Play, X } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n';
import { isNative } from '../lib/native';
import { Logo } from './Welcome';

// On the web only: an invitation to install the app from the App Store or
// Google Play. A phone sees its own store; a computer sees both. Closing it
// hides it for a week. A store without a link (not published yet) is left out.

// The App Store id is the number in App Store Connect → App information → Apple ID.
export const APP_STORE_ID = '';
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

export const StoreButtons = ({ stores, className = '' }: { stores: Store[]; className?: string }) => (
    <div className={`flex gap-2 ${className}`}>
        {stores.map(({ id, url, label, icon: Icon }) => (
            <a key={id} href={url} target="_blank" rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-snow px-3 py-2.5 text-sm font-semibold text-neutral-900 shadow active:scale-[0.98]">
                <Icon size={18} fill={id === 'android' ? 'currentColor' : 'none'} /> {label}
            </a>
        ))}
    </div>
);

// A card on the web app's home screen.
export const GetTheAppBanner = () => {
    const [hidden, setHidden] = useState(() => isNative() || hiddenRecently());
    const stores = isNative() ? [] : deviceStores();
    if (hidden || !stores.length) return null;
    const close = () => {
        try { localStorage.setItem(HIDDEN_KEY, String(Date.now())); } catch { /* shown again next visit */ }
        setHidden(true);
    };
    return (
        <aside aria-label={t('getApp.title')} className="rounded-2xl bg-gradient-to-r from-brand to-amber-600 p-3 text-snow shadow-lg shadow-brand/25">
            <div className="flex items-center gap-3">
                <span className="shrink-0 rounded-xl bg-snow/15 p-1"><Logo size={36} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight">{t('getApp.title')}</p>
                    <p className="text-xs text-snow/90">{t('getApp.text')}</p>
                </div>
                <button onClick={close} aria-label={t('common.close')} className="self-start rounded-full p-1 text-snow/80 hover:bg-snow/15"><X size={18} /></button>
            </div>
            <StoreButtons stores={stores} className="mt-2.5" />
        </aside>
    );
};

// The same buttons on the welcome screen.
export const GetTheAppRow = () => {
    const stores = isNative() ? [] : deviceStores();
    if (!stores.length) return null;
    return (
        <div className="mt-4">
            <p className="mb-2 text-center text-xs font-medium text-white/55">{t('getApp.welcome')}</p>
            <StoreButtons stores={stores} />
        </div>
    );
};
