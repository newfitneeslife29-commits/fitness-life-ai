import { Bike, Flag, Footprints, MapPinOff, Pause, Play, Satellite, X, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { t } from '../i18n';
import { cardioKcal, distUnit, movingSec, pace, speed, stepsFor, toDist } from '../lib/cardio';
import { fmtClock, fmtNumber } from '../lib/format';
import { haptic } from '../lib/native';
import { openLocationSettings, startTracking, stopTracking } from '../lib/tracker';
import { useNow } from '../lib/useNow';
import { actions, getState, useStore } from '../store/store';

// The walk, run or ride being recorded: distance from the GPS (it keeps
// counting with the screen locked), moving time, pace or speed, steps and
// calories. Pause leaves the time and the distance out.

const THEME = {
    walk: { from: 'from-emerald-600', to: 'to-teal-700', icon: <Footprints size={22} /> },
    run: { from: 'from-orange-600', to: 'to-rose-700', icon: <Zap size={22} /> },
    bike: { from: 'from-sky-600', to: 'to-indigo-700', icon: <Bike size={22} /> },
} as const;

export default function Cardio() {
    const active = useStore(s => s.cardioActive ?? null);
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const heightCm = useStore(s => s.profile?.heightCm);
    const weightKg = useStore(s => s.bodyWeights[0]?.weightKg ?? null);
    const navigate = useNavigate();
    const now = useNow(!!active, 1000);

    // Starts (or picks up again, after the app was closed) the GPS.
    useEffect(() => {
        if (active) void startTracking();
        // Only when a recording begins or comes back.
    }, [!!active]);

    if (!active) return <Navigate to="/movimiento" replace />;

    const theme = THEME[active.kind];
    const seconds = movingSec(active, now);
    const paused = active.pausedAt !== null;
    const steps = active.kind === 'bike' ? null : stepsFor(active.distanceM, heightCm);
    const kcal = cardioKcal(active.kind, active.distanceM, seconds, weightKg);
    const p = pace(active.distanceM, seconds, unit);
    const target = active.targetMin ? active.targetMin * 60 : 0;

    const finish = async () => {
        const save = active.distanceM > 20 || seconds > 60;
        if (save && !(await confirm({ title: t('cardio.finishTitle'), message: t('cardio.finishMessage'), confirmLabel: t('cardio.finish') }))) return;
        await stopTracking();
        const a = getState().cardioActive!;
        const durationSec = movingSec(a);
        actions.finishCardio(save ? {
            kind: a.kind, startedAt: a.startedAt, endedAt: new Date().toISOString(), durationSec, distanceM: Math.round(a.distanceM),
            steps: a.kind === 'bike' ? undefined : stepsFor(a.distanceM, heightCm), kcal: cardioKcal(a.kind, a.distanceM, durationSec, weightKg),
            source: 'gps', walkPlan: a.walkPlan,
        } : null);
        haptic('success');
        if (save) toast(t('cardio.saved'));
        navigate('/movimiento', { replace: true });
    };

    const discard = async () => {
        if (!(await confirm({ title: t('cardio.discardTitle'), message: t('cardio.discardMessage'), confirmLabel: t('cardio.discard'), danger: true }))) return;
        await stopTracking();
        actions.finishCardio(null);
        navigate('/movimiento', { replace: true });
    };

    const stat = (value: string, label: string) => (
        <div className="rounded-2xl bg-black/20 p-3 text-center backdrop-blur">
            <p className="text-2xl font-extrabold tabular-nums">{value}</p>
            <p className="text-[11px] uppercase tracking-wide text-snow/70">{label}</p>
        </div>
    );

    return (
        <div className={`flex min-h-dvh flex-col bg-gradient-to-b ${theme.from} ${theme.to} px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-snow`}>
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-lg font-bold">{theme.icon} {t(`cardio.kind.${active.kind}`)}</span>
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${active.gps === 'ok' ? 'bg-white/20' : 'bg-black/30'}`} role="status">
                    {active.gps === 'denied' || active.gps === 'off' ? <MapPinOff size={14} /> : <Satellite size={14} className={active.gps === 'waiting' ? 'animate-pulse' : ''} />}
                    {t(`cardio.gps.${active.gps}`)}
                </span>
            </div>

            {(active.gps === 'denied' || active.gps === 'off') && (
                <div className="mt-3 rounded-2xl bg-black/25 p-3 text-sm">
                    <p>{t(active.gps === 'denied' ? 'cardio.gpsDenied' : 'cardio.gpsOff')}</p>
                    {active.gps === 'denied' && <button onClick={() => void openLocationSettings()} className="mt-2 font-semibold underline">{t('cardio.openSettings')}</button>}
                </div>
            )}

            <div className="flex flex-1 flex-col items-center justify-center py-8">
                <p className="text-[5.5rem] font-black leading-none tabular-nums" aria-label={t('cardio.distanceLabel', { d: toDist(active.distanceM, unit).toFixed(2), unit: distUnit(unit) })}>
                    {toDist(active.distanceM, unit).toFixed(2)}
                </p>
                <p className="text-lg font-semibold uppercase tracking-widest text-snow/80">{distUnit(unit)}</p>
                <p className="mt-6 text-5xl font-extrabold tabular-nums" role="timer">{fmtClock(seconds)}</p>
                {target > 0 && (
                    <div className="mt-4 w-full max-w-xs">
                        <div className="h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (seconds / target) * 100)}%` }} /></div>
                        <p className="mt-1 text-center text-sm text-snow/80">{seconds >= target ? t('cardio.targetDone') : t('cardio.target', { min: active.targetMin! })}</p>
                    </div>
                )}
                {paused && <p className="mt-4 rounded-full bg-black/30 px-4 py-1 text-sm font-semibold">{t('cardio.paused')}</p>}
            </div>

            <div className="grid grid-cols-3 gap-2">
                {active.kind === 'bike'
                    ? stat(speed(active.distanceM, seconds, unit).toFixed(1), `${distUnit(unit)}/h`)
                    : stat(p ? fmtClock(p) : '–', t('cardio.pace', { unit: distUnit(unit) }))}
                {steps !== null ? stat(fmtNumber(steps), t('cardio.stepsLabel')) : stat(fmtClock(seconds), t('cardio.time'))}
                {stat(fmtNumber(kcal), 'kcal')}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4">
                <button onClick={discard} aria-label={t('cardio.discard')} className="flex h-14 w-14 items-center justify-center rounded-full bg-black/25"><X size={22} /></button>
                <button onClick={() => { haptic('tap'); actions.pauseCardio(!paused); }} aria-label={paused ? t('cardio.resume') : t('cardio.pause')}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-ink shadow-2xl active:scale-95">
                    {paused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
                </button>
                <button onClick={finish} aria-label={t('cardio.finish')} className="flex h-14 w-14 items-center justify-center rounded-full bg-black/25"><Flag size={22} /></button>
            </div>
        </div>
    );
}
