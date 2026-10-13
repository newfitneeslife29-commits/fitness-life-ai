import { Capacitor, registerPlugin } from '@capacitor/core';
import { appIcon, appIconUrl, DEFAULT_ICON, isAppIconId, type AppIconId } from './appIcons';

// The phone keeps which icon is in use (Android launcher alias, iOS alternate
// icon); the web keeps it in this browser and shows it as the tab icon.
interface LauncherIconPlugin {
    get(): Promise<{ name: string | null }>;
    set(options: { name: string }): Promise<void>;
}
const LauncherIcon = registerPlugin<LauncherIconPlugin>('LauncherIcon');

const KEY = 'fitness-life:icon';
const platform = Capacitor.getPlatform();

// When the new icon shows up: Android swaps it when the app goes to the
// background, iOS straight away (with a system notice), the web in the tab.
export const appIconTiming = platform === 'android' ? 'background' : platform === 'ios' ? 'now' : 'tab';

const readWeb = (): AppIconId => {
    try {
        const id = localStorage.getItem(KEY);
        return isAppIconId(id) ? id : DEFAULT_ICON;
    } catch {
        return DEFAULT_ICON;
    }
};

const showInTab = (id: AppIconId) => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = id === DEFAULT_ICON ? './icon.svg' : appIconUrl(appIcon(id));
};

export const getAppIcon = async (): Promise<AppIconId> => {
    if (platform === 'web') return readWeb();
    const { name } = await LauncherIcon.get().catch(() => ({ name: null }));
    return isAppIconId(name) ? name : DEFAULT_ICON;
};

export const setAppIcon = async (id: AppIconId) => {
    if (platform !== 'web') return LauncherIcon.set({ name: id });
    try {
        localStorage.setItem(KEY, id);
    } catch {
        // Private mode: the tab icon still changes for this visit.
    }
    showInTab(id);
};

// The web tab shows the chosen icon from the first paint.
export const restoreTabIcon = () => {
    if (platform === 'web' && typeof document !== 'undefined') showInTab(readWeb());
};
