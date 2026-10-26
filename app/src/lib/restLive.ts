import { registerPlugin } from '@capacitor/core';
import { exerciseName } from '../data/exercises';
import { t } from '../i18n';
import { getState } from '../store/store';
import { isNative } from './native';

// The rest countdown outside the app: a Live Activity on the iPhone's lock
// screen and Dynamic Island (RestLivePlugin + FitnessWidget's RestLiveActivity),
// an ongoing notification with a countdown on Android (RestLivePlugin.java).
// Builds without the native plugin just reject, and nothing shows.

interface RestLivePlugin {
    start(options: { endsAt: number; title: string; subtitle: string; channel: string }): Promise<void>;
    end(): Promise<void>;
}
const RestLive = registerPlugin<RestLivePlugin>('RestLive');

// "Next: Barbell squat · set 2", from the workout in progress.
const nextUp = () => {
    const active = getState().active;
    const ex = active?.exercises.find(e => e.sets.some(s => !s.done));
    if (!ex) return '';
    return t('rest.liveNext', { name: exerciseName(ex.exerciseId), set: ex.sets.findIndex(s => !s.done) + 1 });
};

export const showRestLive = async (endsAt: number) => {
    if (!isNative() || endsAt <= Date.now()) return;
    await RestLive.start({ endsAt, title: t('rest.liveTitle'), subtitle: nextUp(), channel: t('rest.liveChannel') }).catch(() => {});
};

export const endRestLive = async () => {
    if (!isNative()) return;
    await RestLive.end().catch(() => {});
};
