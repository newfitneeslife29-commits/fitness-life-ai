import type { Unit } from '../store/types';
import { kgToDisplay } from './progression';

// Two decimals so 1,25 kg plates and 0,5 lb steps are shown exactly.
const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export const fmtNumber = (n: number) => number.format(n);

export const fmtWeight = (kg: number, unit: Unit) => `${fmtNumber(kgToDisplay(kg, unit))} ${unit}`;

// Big totals (volume) rounded to whole units.
export const fmtVolume = (kg: number, unit: Unit) =>
    `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(kgToDisplay(kg, unit))} ${unit}`;

export const fmtDate = (iso: string | Date) =>
    new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtShortDate = (iso: string | Date) =>
    new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export const fmtClock = (totalSec: number) => {
    const s = Math.max(0, Math.round(totalSec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

export const fmtRest = (sec: number) => (sec % 60 === 0 ? `${sec / 60} min` : fmtClock(sec));

export const fmtRange = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);

export const greeting = (date = new Date()) => {
    const h = date.getHours();
    return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
};
