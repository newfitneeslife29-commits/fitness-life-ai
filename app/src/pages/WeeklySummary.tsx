import { CalendarRange, Clock3, Droplets, Dumbbell, Flame, Footprints, Lightbulb, Target } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BackHeader, Section } from '../components/ui';
import { locale, t, tp } from '../i18n';
import { fmtNumber, fmtVolume } from '../lib/format';
import { currentPause } from '../lib/pause';
import { useStreak } from '../lib/streak';
import { useWeekSummary, weeklyTip, type WeekSummary } from '../lib/weeklySummary';
import { useStore } from '../store/store';

const range = (w: WeekSummary) => {
    const end = new Date(w.start.getFullYear(), w.start.getMonth(), w.start.getDate() + 6);
    const f = (d: Date) => d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
    return `${f(w.start)} – ${f(end)}`;
};

const Delta = ({ now, before }: { now: number; before: number }) => {
    const d = now - before;
    if (d === 0) return null;
    return <span className={`text-xs font-bold ${d > 0 ? 'text-good' : 'text-white/45'}`}>{d > 0 ? '▲' : '▼'} {fmtNumber(Math.abs(d))}</span>;
};

const Tile = ({ icon, label, value, delta }: { icon: ReactNode; label: string; value: string; delta?: ReactNode }) => (
    <div className="card p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/55"><span className="text-brand">{icon}</span>{label}</p>
        <p className="mt-1 flex items-baseline gap-2 text-2xl font-extrabold tabular-nums">{value}{delta}</p>
    </div>
);

// The week in numbers, opened from Sunday's notification or from Progress.
export default function WeeklySummaryPage() {
    const [offset, setOffset] = useState(0);
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const paused = useStore(s => !!currentPause(s.profile));
    const w = useWeekSummary(offset);
    const prev = useWeekSummary(offset - 1);
    const { activeStreak } = useStreak();
    const compare = offset === 0 ? null : prev; // this week is still running: no arrows
    const d = (now: number, before: number) => (compare ? <Delta now={now} before={before} /> : undefined);

    return (
        <div className="space-y-5 pb-6">
            <BackHeader title={t('weekly.title')} subtitle={range(w)} icon={<CalendarRange size={20} />} />
            <Section>
                <div className="flex gap-2" role="radiogroup" aria-label={t('weekly.title')}>
                    {[0, -1].map(o => (
                        <button key={o} role="radio" aria-checked={offset === o} onClick={() => setOffset(o)}
                            className={`chip ${offset === o ? 'chip-on' : 'hover:text-white'}`}>{t(o === 0 ? 'weekly.thisWeek' : 'weekly.lastWeek')}</button>
                    ))}
                </div>
            </Section>
            <Section>
                <div className="grid grid-cols-2 gap-2">
                    <Tile icon={<Dumbbell size={14} />} label={t('weekly.workouts')} value={`${w.workouts}/${w.target}`} delta={d(w.workouts, prev.workouts)} />
                    <Tile icon={<Clock3 size={14} />} label={t('weekly.minutes')} value={fmtNumber(w.minutes)} delta={d(w.minutes, prev.minutes)} />
                    <Tile icon={<Target size={14} />} label={t('workout.volume')} value={fmtVolume(w.volumeKg, unit)} />
                    <Tile icon={<Footprints size={14} />} label={t('weekly.steps')} value={fmtNumber(w.steps)} delta={d(w.steps, prev.steps)} />
                    <Tile icon={<Footprints size={14} />} label={t('weekly.stepDays')} value={`${w.stepDays}/${w.days}`} />
                    <Tile icon={<Droplets size={14} />} label={t('weekly.waterDays')} value={`${w.waterDays}/${w.days}`} />
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-white/65">
                    <Flame size={16} className="text-amber-300" /> {t('activity.streak')}: {tp('activity.days', activeStreak)}
                </p>
            </Section>
            <Section title={t('weekly.tipTitle')}>
                <div className="card flex items-start gap-3 border-amber-300/30 bg-amber-300/10 p-4">
                    <Lightbulb size={22} className="mt-0.5 shrink-0 text-amber-300" />
                    <p className="text-sm leading-relaxed text-white/85">{t(weeklyTip(w, paused))}</p>
                </div>
                <p className="mt-3 text-xs text-white/45">{t('weekly.every')}</p>
            </Section>
        </div>
    );
}
