import { ChevronLeft, ChevronRight, Dumbbell, Flame, ShieldCheck, Smartphone, Trophy } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Section } from '../components/ui';
import { locale, t, tp } from '../i18n';
import { monthGrid } from '../lib/activity';
import { useStreak } from '../lib/streak';
import { useStore } from '../store/store';


// A fixed empty list: a new [] on every read would re-render forever.
const NO_DAYS: string[] = [];
const Tile = ({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) => (
    <div className="card flex items-center gap-3 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">{icon}</span>
        <div className="min-w-0">
            <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
            <p className="text-xs text-white/55">{label}</p>
        </div>
    </div>
);

// Days the app was used and days trained: a month calendar and the streaks.
export default function Activity() {
    const activeDays = useStore(s => s.activeDays ?? NO_DAYS);
    const sessions = useStore(s => s.sessions);
    const now = new Date();
    const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
    const summary = useStreak();
    const grid = useMemo(() => monthGrid(month.year, month.month, activeDays, sessions), [month, activeDays, sessions]);
    const isCurrent = month.year === now.getFullYear() && month.month === now.getMonth();
    const shift = (n: number) => setMonth(m => {
        const d = new Date(m.year, m.month + n, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
    const monthDays = grid.flat().filter(d => d.inMonth);
    const trainedInMonth = monthDays.filter(d => d.trained).length;
    const openedInMonth = monthDays.filter(d => d.opened).length;

    return (
        <div className="space-y-6">
            <PageHeader tone="rose" title={t('activity.title')} subtitle={t('activity.subtitle')} />

            <Section>
                <div className="grid grid-cols-2 gap-2">
                    <Tile icon={<Smartphone size={20} />} value={summary.activeThisMonth} label={t('activity.activeMonth')} />
                    <Tile icon={<Dumbbell size={20} />} value={summary.trainedThisMonth} label={t('activity.trainedMonth')} />
                    <Tile icon={<Flame size={20} />} value={tp('activity.days', summary.activeStreak)} label={t('activity.streak')} />
                    <Tile icon={<Trophy size={20} />} value={tp('activity.days', summary.bestStreak)} label={t('activity.best')} />
                </div>
                <div className="card mt-2 flex items-start gap-3 p-3">
                    <ShieldCheck size={22} className={`mt-0.5 shrink-0 ${summary.protectorLeft ? 'text-emerald-400' : 'text-amber-300'}`} aria-hidden />
                    <div>
                        <p className="text-sm font-semibold">{t('streak.protectTitle')}</p>
                        <p className="text-xs text-white/55">{summary.protectorLeft ? t('streak.protectReady') : t('streak.protectUsed')}</p>
                    </div>
                </div>
            </Section>

            <Section>
                <div className="card p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <button onClick={() => shift(-1)} aria-label={t('activity.prevMonth')} className="rounded-full p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={20} /></button>
                        <p className="font-semibold first-letter:uppercase">{new Date(month.year, month.month, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}</p>
                        <button onClick={() => shift(1)} disabled={isCurrent} aria-label={t('activity.nextMonth')} className="rounded-full p-2 text-white/60 hover:bg-ink-3 hover:text-white disabled:opacity-30"><ChevronRight size={20} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={t('activity.calendar')}>
                        {weekdays.map((w, i) => <span key={i} className="text-[11px] font-medium uppercase text-white/40">{w}</span>)}
                        {grid.flat().map(d => (
                            <span key={d.date.toISOString()} role="gridcell"
                                aria-label={`${d.date.toLocaleDateString(locale(), { day: 'numeric', month: 'long' })}${d.trained ? ` · ${t('activity.legendTrained')}` : d.opened ? ` · ${t('activity.legendOpened')}` : ''}`}
                                className={`flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums ${!d.inMonth ? 'opacity-25' : ''} ${
                                    d.trained ? 'bg-brand font-bold text-ink' : d.opened ? 'bg-brand/20 text-white' : d.future ? 'text-white/25' : 'bg-ink-3 text-white/50'}`}>
                                {d.date.getDate()}
                            </span>
                        ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand" /> {t('activity.legendTrained')}</span>
                        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand/20" /> {t('activity.legendOpened')}</span>
                    </div>
                    <p className="mt-3 text-sm text-white/70">{t('activity.monthLine', { trained: tp('activity.days', trainedInMonth), opened: tp('activity.days', openedInMonth) })}</p>
                </div>
            </Section>

            <Section>
                <div className="grid grid-cols-2 gap-2">
                    <Tile icon={<Dumbbell size={20} />} value={summary.trainedTotal} label={t('activity.trainedTotal')} />
                    <Tile icon={<Smartphone size={20} />} value={summary.activeTotal} label={t('activity.activeTotal')} />
                </div>
                <Link to="/progreso" className="btn-ghost mt-3 w-full">{t('activity.seeProgress')}</Link>
            </Section>
        </div>
    );
}
