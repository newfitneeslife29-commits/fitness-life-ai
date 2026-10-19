import { Flame, Pause, Timer } from 'lucide-react';
import { t } from '../i18n';
import { fmtClock } from '../lib/format';
import { useNow } from '../lib/useNow';
import { activeSeconds, restSeconds } from '../lib/workout';
import type { ActiveWorkout } from '../store/types';

// The clock of cardio and fat-burning workouts: it runs the whole session
// and only stops during the rests the workout sets. Next to it, the time
// spent resting, which runs while the active time is paused.
export const ActiveClock = ({ active, tone = 'card' }: { active: ActiveWorkout; tone?: 'card' | 'light' }) => {
    const now = useNow(true, 500);
    const resting = active.restEndsAt !== null && now < active.restEndsAt;
    const value = fmtClock(activeSeconds(active, now));
    const rest = fmtClock(restSeconds(active, now));
    const label = resting ? t('workout.activePaused') : t('workout.activeTime');
    const restLabel = t('workout.restTime');
    if (tone === 'light') {
        return (
            <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3.5 py-1.5 text-snow backdrop-blur">
                <span role="timer" aria-label={`${label}: ${value}`} className="flex items-center gap-2">
                    {resting ? <Pause size={15} fill="currentColor" /> : <Flame size={16} className="text-amber-300" />}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-snow/80">{label}</span>
                    <span className="text-lg font-black tabular-nums">{value}</span>
                </span>
                <span aria-hidden className="h-4 w-px bg-snow/30" />
                <span role="timer" aria-label={`${restLabel}: ${rest}`} className={`flex items-center gap-1 text-sm font-bold tabular-nums ${resting ? 'text-snow' : 'text-snow/75'}`}>
                    <Timer size={14} /> {rest}
                </span>
            </div>
        );
    }
    return (
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-colors ${resting ? 'bg-ink-3 text-white/70' : 'bg-gradient-to-r from-brand to-amber-500 text-ink shadow-lg shadow-brand/25'}`}>
            <span role="timer" aria-label={`${label}: ${value}`} className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
                    {resting ? <Pause size={16} fill="currentColor" /> : <Flame size={18} className="animate-pulse" />}
                    {label}
                </span>
                <span className="text-3xl font-black tabular-nums">{value}</span>
            </span>
            <span role="timer" aria-label={`${restLabel}: ${rest}`}
                className={`flex shrink-0 flex-col items-end border-l pl-3 ${resting ? 'border-white/15 text-brand' : 'border-ink/20'}`}>
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider"><Timer size={12} /> {restLabel}</span>
                <span className="text-lg font-black tabular-nums">{rest}</span>
            </span>
        </div>
    );
};
