import { isNative } from './native';

// Music for the workout: opens the person's music app (or their saved
// playlist); the workout keeps running meanwhile.

export interface MusicApp { id: 'spotify' | 'apple' | 'youtube'; name: string; app: string; web: string }

export const MUSIC_APPS: MusicApp[] = [
    { id: 'spotify', name: 'Spotify', app: 'spotify:', web: 'https://open.spotify.com/' },
    { id: 'apple', name: 'Apple Music', app: 'music://', web: 'https://music.apple.com/' },
    { id: 'youtube', name: 'YouTube Music', app: 'youtubemusic://', web: 'https://music.youtube.com/' },
];

const HOSTS = /^(open\.spotify\.com|spotify\.link|music\.apple\.com|music\.youtube\.com|(www\.|m\.)?youtube\.com|youtu\.be)$/;

// A playlist link the app accepts (https, from those services); null if not.
export const cleanPlaylist = (text: string): string | null => {
    const raw = text.trim().match(/https?:\/\/\S+/)?.[0] ?? '';
    try {
        const url = new URL(raw);
        return url.protocol === 'https:' && HOSTS.test(url.hostname) ? url.toString() : null;
    } catch {
        return null;
    }
};

const openOut = async (url: string) => {
    if (!isNative()) {
        window.open(url, '_blank', 'noopener');
        return true;
    }
    const { AppLauncher } = await import('@capacitor/app-launcher');
    return (await AppLauncher.openUrl({ url }).catch(() => ({ completed: false }))).completed;
};

// The app if it's installed; otherwise its website (which offers the app).
export const openMusicApp = async (m: MusicApp) => {
    if (isNative() && (await openOut(m.app))) return;
    await openOut(m.web);
};

// Links of these services open in their app when it's installed.
export const openPlaylist = (url: string) => openOut(url);
