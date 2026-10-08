import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type Theme = 'system' | 'light' | 'dark';

// Page background of each theme (--ink in index.css), for the browser and
// native bars around the app.
const BACKGROUND = { dark: '#0b0d10', light: '#f4f5f7' } as const;

const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined;
let preference: Theme = 'system';

export const resolvedTheme = (pref: Theme = preference): 'light' | 'dark' =>
    pref === 'system' ? (media?.matches === false ? 'light' : 'dark') : pref;

const paint = () => {
    const theme = resolvedTheme();
    document.documentElement.classList.toggle('light', theme === 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BACKGROUND[theme]);
    if (Capacitor.isNativePlatform()) {
        // Style.Dark = light text, for the dark theme.
        void StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
        if (Capacitor.getPlatform() === 'android') void StatusBar.setBackgroundColor({ color: BACKGROUND[theme] }).catch(() => {});
    }
};

// Applied before the first render, and again whenever the setting or (in
// "system" mode) the phone's appearance changes.
export const applyTheme = (pref: Theme) => {
    preference = pref;
    if (typeof document !== 'undefined') paint();
};

media?.addEventListener?.('change', () => {
    if (preference === 'system') paint();
});
