import { Hourglass, Play, Square } from 'lucide-react';
import { locale, t } from '../i18n';
import { fmtClock } from '../lib/format';
import { FAST_PLANS, fastProgress, fmtHoursMin } from '../lib/fasting';
import { haptic } from '../lib/native';
import { useNow } from '../lib/useNow';
import { actions, useStore } from '../store/store';
import { toast } from './feedback';

// Intermittent fasting: pick the plan, start, and see the time go by until
// the goal; the app notifies when it's reached (lib/fasting.ts).
export const FastingCard = () => {
    const fasting = useStore(s => s.fasting);
    const hours = fasting?.hours ?? 16;
    const startedAt = fasting?.startedAt ?? null;
    const now = useNow(startedAt !== null, 1000);
    const last = fasting?.history[0];

    const start = () => {
        haptic('tap');
        actions.startFast();
    };
    const end = () => {
        const { elapsedMs } = fastProgress(startedAt!, hours);
        haptic('success');
        actions.endFast();
        if (elapsedMs >= 10 * 60_000) toast(t('fasting.saved', { time: fmtHoursMin(elapsedMs) }), 3500);
    };

    if (startedAt) {
        const p = fastProgress(startedAt, hours, now);
        const goal = new Date(p.goalAt).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
        return (
            <div className={`card overflow-hidden p-4 ${p.reached ? 'border-good/50' : ''}`}>
                <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${p.reached ? 'bg-good/20 text-good' : 'bg-violet-500/20 text-violet-300'}`}><Hourglass size={22} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{t('fasting.elapsed')}</p>
                        <p role="timer" className="text-3xl font-black tabular-nums">{fmtClock(Math.floor(p.elapsedMs / 1000))}</p>
                    </div>
                    <span className="rounded-full bg-ink-3 px-2.5 py-1 text-xs font-bold tabular-nums">{hours}:{24 - hours}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-4" role="progressbar" aria-valuenow={Math.round(p.pct)} aria-valuemin={0} aria-valuemax={100} aria-label={t('fasting.title')}>
                    <div className={`h-full rounded-full transition-[width] duration-1000 ${p.reached ? 'bg-good' : 'bg-gradient-to-r from-violet-500 to-fuchsia-400'}`} style={{ width: `${p.pct}%` }} />
                </div>
                <p className="mt-2 text-sm text-white/65">
                    {p.reached ? t('fasting.reached') : `${t('fasting.left', { time: fmtHoursMin(p.leftMs, true) })} · ${t('fasting.endsAt', { time: goal })}`}
                </p>
                <button onClick={end} className={`${p.reached ? 'btn-primary' : 'btn-ghost'} mt-3 w-full`}><Square size={14} fill="currentColor" /> {t('fasting.end')}</button>
            </div>
        );
    }

    return (
        <div className="card p-4">
            <p className="text-sm text-white/65">{t('fasting.hint')}</p>
            <div role="radiogroup" aria-label={t('fasting.plan')} className="mt-3 flex flex-wrap gap-2">
                {FAST_PLANS.map(h => (
                    <button key={h} role="radio" aria-checked={h === hours} aria-label={t('fasting.planOption', { fast: h, eat: 24 - h })}
                        onClick={() => actions.setFastingPlan(h)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums ${h === hours ? 'border-violet-400 bg-violet-500/20 text-violet-200' : 'border-line text-white/60'}`}>
                        {h}:{24 - h}
                    </button>
                ))}
            </div>
            <button onClick={start} className="btn-primary mt-3 w-full"><Play size={16} fill="currentColor" /> {t('fasting.start')}</button>
            {last && <p className="mt-2 text-xs text-white/50">{t('fasting.last', { time: fmtHoursMin(new Date(last.end).getTime() - new Date(last.start).getTime()) })}</p>}
            <p className="mt-2 text-[11px] text-white/40">{t('fasting.caution')}</p>
        </div>
    );
};
