import type { ActiveCardio, CardioKind, Unit } from '../store/types';

// Walks, runs and rides: distance from GPS points, moving time, pace, steps
// and calories. Pure functions; the GPS itself is in lib/tracker.ts.

const EARTH_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

export const distanceM = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_M * Math.asin(Math.sqrt(h));
};

// Faster than this between two fixes is a GPS jump, not movement (m/s).
const MAX_SPEED: Record<CardioKind, number> = { walk: 4, run: 8, bike: 25 };
const MAX_ACCURACY_M = 35;
const MIN_STEP_M = 3; // GPS jitter while standing still

export interface GpsPoint { lat: number; lon: number; accuracy: number; at: number }

// Adds a GPS fix to the activity: counts the distance unless it is paused,
// inaccurate, jitter or an impossible jump.
export const addPoint = (a: ActiveCardio, p: GpsPoint): ActiveCardio => {
    if (p.accuracy > MAX_ACCURACY_M) return a.gps === 'ok' ? a : { ...a, gps: 'waiting' };
    const here = { lat: p.lat, lon: p.lon, at: p.at };
    if (!a.last || a.pausedAt !== null) return { ...a, last: here, gps: 'ok' };
    const d = distanceM(a.last, here);
    const seconds = Math.max(1, (p.at - a.last.at) / 1000);
    if (d < MIN_STEP_M) return a.gps === 'ok' ? a : { ...a, gps: 'ok' };
    if (d / seconds > MAX_SPEED[a.kind]) return { ...a, last: here, gps: 'ok' };
    return { ...a, distanceM: a.distanceM + d, last: here, gps: 'ok' };
};

// Seconds moving, pauses left out.
export const movingSec = (a: ActiveCardio, now = Date.now()) => {
    const end = a.pausedAt ?? now;
    return Math.max(0, Math.floor((end - new Date(a.startedAt).getTime() - a.pausedMs) / 1000));
};

// Step length from height (about 41.5 % of it), or 0.75 m.
export const strideM = (heightCm?: number) => (heightCm ? (heightCm * 0.415) / 100 : 0.75);
export const stepsFor = (meters: number, heightCm?: number) => Math.round(meters / strideM(heightCm));

// Calories: MET of the activity at that speed × body weight × hours.
const met = (kind: CardioKind, kmh: number) => {
    if (kind === 'walk') return kmh < 4.8 ? 3 : kmh < 6.4 ? 4.3 : 5;
    if (kind === 'run') return kmh < 9.7 ? 9 : 11;
    return kmh < 16 ? 4 : kmh < 20 ? 6.8 : 8;
};
export const cardioKcal = (kind: CardioKind, meters: number, seconds: number, weightKg: number | null) => {
    if (seconds <= 0) return 0;
    const kmh = (meters / 1000) / (seconds / 3600);
    return Math.round(met(kind, kmh) * (weightKg ?? 70) * (seconds / 3600));
};

// Distances follow the unit of weights: kg → km, lb → miles.
export const MILE_M = 1609.344;
export const distUnit = (unit: Unit) => (unit === 'lbs' ? 'mi' : 'km');
export const toDist = (meters: number, unit: Unit) => meters / (unit === 'lbs' ? MILE_M : 1000);
export const fromDist = (value: number, unit: Unit) => value * (unit === 'lbs' ? MILE_M : 1000);

// Walks and runs show pace (minutes per km or mile); rides show speed.
export const pace = (meters: number, seconds: number, unit: Unit) => {
    const d = toDist(meters, unit);
    return d > 0.01 ? seconds / d : null; // seconds per km or mile
};
export const speed = (meters: number, seconds: number, unit: Unit) => (seconds > 0 ? toDist(meters, unit) / (seconds / 3600) : 0);
