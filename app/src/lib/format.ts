import { locale, t } from '../i18n';
import type { Unit } from '../store/types';
import { kgToDisplay } from './progression';

// Formatting follows the app language (decimal comma in es/pt, point in en).

// Two decimals so 1,25 kg plates and 0,5 lb steps are shown exactly.
export const fmtNumber = (n: number) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 }).format(n);

export const fmtWeight = (kg: number, unit: Unit) => `${fmtNumber(kgToDisplay(kg, unit))} ${unit}`;

// Big totals (volume) rounded to whole units.
export const fmtVolume = (kg: number, unit: Unit) =>
    `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(kgToDisplay(kg, unit))} ${unit}`;

export const fmtDate = (iso: string | Date) =>
    new Date(iso).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtShortDate = (iso: string | Date) =>
    new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

export const fmtMonth = (d: Date) => d.toLocaleDateString(locale(), { month: 'short' }).replace('.', '');

export const fmtClock = (totalSec: number) => {
    const s = Math.max(0, Math.round(totalSec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

export const fmtRest = (sec: number) => (sec % 60 === 0 ? `${sec / 60} min` : fmtClock(sec));

export const fmtRange = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

// Parses what people type, with a decimal comma or point.
export const parseDecimal = (raw: string) => Number(raw.trim().replace(',', '.'));

// Shows a number the way it is typed in the current language.
export const typedNumber = (n: number) => (locale() === 'en-US' ? String(n) : String(n).replace('.', ','));

export const greeting = (date = new Date()) => {
    const h = date.getHours();
    return h < 6 ? t('greet.night') : h < 13 ? t('greet.morning') : h < 21 ? t('greet.afternoon') : t('greet.night');
};
