import { isNative } from './native';

// "Do you like Fitness Life?": the App Store's or Google Play's own rating
// window, without leaving the app. Asked after a finished workout, from the
// third one on (from the second if it beat a record: a happy moment), at most
// three times and four months apart; the stores also decide themselves
// whether to show it (they limit it per year).

const KEY = 'fitness-life:review';
const GAP_MS = 120 * 24 * 60 * 60 * 1000;
const MAX_ASKS = 3;
const MIN_WORKOUTS = 3;

interface Asked {
    at: number;
    count: number;
}

export const shouldAskReview = (workouts: number, asked: Asked | null, now = Date.now(), record = false) =>
    (workouts >= MIN_WORKOUTS || (record && workouts >= 2)) && (!asked || (asked.count < MAX_ASKS && now - asked.at >= GAP_MS));

const read = (): Asked | null => {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        return v && typeof v.at === 'number' && typeof v.count === 'number' ? v : null;
    } catch {
        return null;
    }
};

export const maybeAskReview = async (workouts: number, record = false) => {
    if (!isNative()) return;
    const asked = read();
    if (!shouldAskReview(workouts, asked, Date.now(), record)) return;
    try {
        localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), count: (asked?.count ?? 0) + 1 }));
        const { AppReview } = await import('@capawesome/capacitor-app-review');
        await AppReview.requestReview();
    } catch { /* not installed from a store, or no window this time */ }
};
