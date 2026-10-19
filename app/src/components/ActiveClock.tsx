import { Flame, Pause } from 'lucide-react';
import { t } from '../i18n';
import { fmtClock } from '../lib/format';
import { useNow } from '../lib/useNow';
import { activeSeconds } from '../lib/workout';
import type { ActiveWorkout } from '../store/types';

// The clock of cardio and fat-burning workouts: it runs the whole session
// and only stops during the rests the workout sets.
export const ActiveClock = ({ active, tone = 'card' }: { active: ActiveWorkout; tone?: 'card' | 'light' }) => {
    const now = useNow(true, 500);
    const resting = active.restEndsAt !== null && now < active.restEndsAt;
    const value = fmtClock(activeSeconds(active, now));
    const label = resting ? t('workout.activePaused') : t('workout.activeTime');
    if (tone === 'light') {
        return (
            <div role="timer" aria-label={`${label}: ${value}`} className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3.5 py-1.5 text-snow backdrop-blur">
                {resting ? <Pause size={15} fill="currentColor" /> : <Flame size={16} className="text-amber-300" />}
                <span className="text-[11px] font-bold uppercase tracking-wider text-snow/80">{label}</span>
                <span className="text-lg font-black tabular-nums">{value}</span>
            </div>
        );
    }
    return (
        <div role="timer" aria-label={`${label}: ${value}`}
            className={`flex items-center justify-between rounded-2xl px-4 py-2.5 transition-colors ${resting ? 'bg-ink-3 text-white/70' : 'bg-gradient-to-r from-brand to-amber-500 text-ink shadow-lg shadow-brand/25'}`}>
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
                {resting ? <Pause size={16} fill="currentColor" /> : <Flame size={18} className="animate-pulse" />}
                {label}
            </span>
            <span className="text-3xl font-black tabular-nums">{value}</span>
        </div>
    );
};
