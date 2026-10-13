// The app icon colors people can choose in Settings. The native icons are
// generated from this table (Android vectors, iOS alternate icon sets), so
// it has no imports and keeps the same ids as the native resources.

// The brand mark: a W over a V with a notched diamond between them,
// 120 wide (x -60..60) and 108 tall (y -3..105).
export const MARK_PATH =
    'M-60 -3L-15 42L0 27L15 42L60 -3L60 17L15 62L0 47L-15 62L-60 17Z' +
    'M-60 25L0 85L60 25L60 45L0 105L-60 45Z' +
    'M-11 66L-3 58L0 61L3 58L11 66L0 77Z';

export interface AppIcon {
    id: string;
    top: string; // mark gradient, top to bottom
    bottom: string;
    bg: string;
    glow: string; // soft light behind the mark
}

export const APP_ICONS = [
    { id: 'naranja', top: '#ff8b3d', bottom: '#e8550f', bg: '#0b0d10', glow: '#f26b1d' },
    { id: 'rojo', top: '#ff6b6b', bottom: '#d91e36', bg: '#0b0d10', glow: '#e5323f' },
    { id: 'rosa', top: '#ff8fc4', bottom: '#e5488e', bg: '#0b0d10', glow: '#ec5f9e' },
    { id: 'morado', top: '#b794ff', bottom: '#7c3aed', bg: '#0b0d10', glow: '#8b5cf6' },
    { id: 'azul', top: '#62b6ff', bottom: '#1f6fe5', bg: '#0b0d10', glow: '#3b82f6' },
    { id: 'verde', top: '#5ce59f', bottom: '#12a45c', bg: '#0b0d10', glow: '#22c55e' },
    { id: 'dorado', top: '#ffd56b', bottom: '#e09c0c', bg: '#0b0d10', glow: '#f2b01d' },
    { id: 'blanco', top: '#ffffff', bottom: '#d9dde3', bg: '#0b0d10', glow: '#9ca3af' },
    { id: 'claro', top: '#ff8b3d', bottom: '#e8550f', bg: '#ffffff', glow: '#f26b1d' },
] as const satisfies readonly AppIcon[];

export type AppIconId = (typeof APP_ICONS)[number]['id'];
export const DEFAULT_ICON: AppIconId = 'naranja';

export const isAppIconId = (id: unknown): id is AppIconId => APP_ICONS.some(i => i.id === id);
export const appIcon = (id: AppIconId): AppIcon => APP_ICONS.find(i => i.id === id) ?? APP_ICONS[0];

// The icon as an SVG: the mark 300 of 512 wide, a little below the middle so
// it looks centred. rx rounds the corners (0 for the stores, which round it).
export const appIconSvg = (icon: AppIcon, rx = 112) => {
    const k = `i-${icon.id}`;
    const corner = rx ? ` rx="${rx}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
        `<defs><linearGradient id="${k}-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${icon.top}"/><stop offset="1" stop-color="${icon.bottom}"/></linearGradient>` +
        `<radialGradient id="${k}-g" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="${icon.glow}" stop-opacity="${icon.bg === '#ffffff' ? '.12' : '.22'}"/><stop offset="1" stop-color="${icon.glow}" stop-opacity="0"/></radialGradient></defs>` +
        `<rect width="512" height="512"${corner} fill="${icon.bg}"/><rect width="512" height="512"${corner} fill="url(#${k}-g)"/>` +
        `<path fill="url(#${k}-m)" transform="translate(256 262) scale(2.5) translate(0 -51)" d="${MARK_PATH}"/></svg>`;
};

export const appIconUrl = (icon: AppIcon, rx = 112) => `data:image/svg+xml,${encodeURIComponent(appIconSvg(icon, rx))}`;
