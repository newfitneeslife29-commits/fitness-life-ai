import { Bike, ChevronRight, Columns2, Footprints, LineChart as ChartIcon, Moon, Play, Scale, Share2, Trash2, Trophy } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, TrainingCalendar, WeekBars } from '../components/Charts';
import { toast } from '../components/feedback';
import { HeroStat, PageHeader, Section } from '../components/ui';
import { exerciseName, getExercise, muscleLabel, type Muscle } from '../data/exercises';
import { t, tp } from '../i18n';
import { sessionName } from '../lib/names';
import { fmtDate, fmtNumber, fmtShortDate, fmtVolume, parseDecimal } from '../lib/format';
import { displayToKg, kgToDisplay, personalRecords, volume } from '../lib/progression';
import { durationMin, exerciseSeries, sessionsThisWeek, setsPerMuscle, streakWeeks, trainingCalendar, weekStart, weeklySeries } from '../lib/stats';
import { localDay } from '../lib/activity';
import { distUnit, toDist } from '../lib/cardio';
import { cardioTotals, stepsOn } from '../lib/movement';
import { actions, useStore } from '../store/store';
import type { Unit } from '../store/types';

const BodyWeightCard = ({ unit }: { unit: Unit }) => {
    const entries = useStore(s => s.bodyWeights);
    const [value, setValue] = useState('');
    const latest = entries[0];
    const monthAgo = entries.find(e => Date.parse(e.date) <= Date.now() - 28 * 86_400_000);
    const change = latest && monthAgo ? kgToDisplay(latest.weightKg, unit) - kgToDisplay(monthAgo.weightKg, unit) : null;
    const points = entries.slice(0, 60).map(e => ({ date: e.date, value: kgToDisplay(e.weightKg, unit) })).reverse();

    const save = () => {
        const n = parseDecimal(value);
        if (!Number.isFinite(n) || n < 20 || n > 400) {
            toast(t('bw.invalid'));
            return;
        }
        actions.logBodyWeight(displayToKg(n, unit));
        setValue('');
        toast(t('bw.saved'));
    };

    return (
        <div className="card space-y-3 p-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <p className="text-2xl font-bold tabular-nums">{latest ? `${fmtNumber(kgToDisplay(latest.weightKg, unit))} ${unit}` : '—'}</p>
                    <p className="text-xs text-white/50">
                        {latest ? t('bw.last', { date: fmtShortDate(latest.date) }) : t('bw.none')}
                        {change !== null && ` · ${t('bw.change', { change: `${change > 0 ? '+' : ''}${fmtNumber(change)} ${unit}` })}`}
                    </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-snow shadow-md shadow-sky-500/30"><Scale size={22} /></span>
            </div>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); save(); }}>
                <input value={value} onChange={e => setValue(e.target.value)} inputMode="decimal" placeholder={t('bw.placeholder', { unit })} aria-label={t('bw.label')}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                <button className="btn-primary px-4 py-2" disabled={!value.trim()}>{t('common.save')}</button>
            </form>
            {points.length >= 2 && <LineChart points={points} unit={unit} emptyText="" />}
            {entries.length > 0 && (
                <ul className="divide-y divide-line text-sm">
                    {entries.slice(0, 4).map(e => (
                        <li key={e.id} className="flex items-center justify-between py-2">
                            <span className="text-white/60">{fmtDate(e.date)}</span>
                            <span className="flex items-center gap-2 tabular-nums">
                                {fmtNumber(kgToDisplay(e.weightKg, unit))} {unit}
                                <button onClick={() => actions.deleteBodyWeight(e.id)} aria-label={t('bw.delete', { date: fmtDate(e.date) })} className="rounded p-1 text-white/35 hover:text-red-400"><Trash2 size={14} /></button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// Steps, kilometres and sleep of the last 7 days, opening Movement.
const MovementWeek = ({ unit }: { unit: Unit }) => {
    const state = useStore(s => s);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return localDay(d); });
    const steps = days.reduce((n, d) => n + stepsOn(state, d), 0);
    const km = cardioTotals(state.cardio ?? [], weekStart(new Date())).distanceM;
    const nights = (state.sleep ?? []).filter(e => days.includes(e.day));
    const sleep = nights.length ? nights.reduce((n, e) => n + e.minutes, 0) / nights.length / 60 : 0;
    const tile = (icon: ReactNode, value: string, label: string, color: string) => (
        <div className="card p-3">
            <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-snow ${color}`}>{icon}</span>
            <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
            <p className="text-[11px] text-white/50">{label}</p>
        </div>
    );
    return (
        <Link to="/movimiento" className="grid grid-cols-3 gap-2">
            {tile(<Footprints size={16} />, fmtNumber(Math.round(steps / 7)), t('progress.stepsAvg'), 'from-emerald-500 to-teal-500')}
            {tile(<Bike size={16} />, `${fmtNumber(Math.round(toDist(km, unit) * 10) / 10)} ${distUnit(unit)}`, t('progress.cardioWeek'), 'from-sky-500 to-indigo-500')}
            {tile(<Moon size={16} />, sleep ? `${fmtNumber(Math.round(sleep * 10) / 10)} h` : '—', t('progress.sleepAvg'), 'from-indigo-500 to-violet-500')}
        </Link>
    );
};

export default function Progress() {
    const sessions = useStore(s => s.sessions);
    const profile = useStore(s => s.profile)!;
    const unit = profile.unit;

    const records = useMemo(() => [...personalRecords(sessions.flatMap(s => s.sets)).values()], [sessions]);
    // Exercises ordered by how often they were trained.
    const exerciseIds = useMemo(() => {
        const count = new Map<string, number>();
        for (const s of sessions) for (const id of new Set(s.sets.map(x => x.exerciseId))) count.set(id, (count.get(id) ?? 0) + 1);
        return [...count].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    }, [sessions]);
    const [picked, setPicked] = useState<string>('');
    const [historyLimit, setHistoryLimit] = useState(10);
    const exerciseId = picked || exerciseIds[0] || '';
    const bodyweight = getExercise(exerciseId)?.stepKg === 0;
    const series = useMemo(
        () => exerciseSeries(sessions, exerciseId).map(p => ({ ...p, value: bodyweight ? p.value : kgToDisplay(p.value, unit) })),
        [sessions, exerciseId, bodyweight, unit],
    );

    const weeks = weeklySeries(sessions, 8);
    const calendar = useMemo(() => trainingCalendar(sessions, 18), [sessions]);
    const thisWeek = sessionsThisWeek(sessions);
    const muscles = Object.entries(setsPerMuscle(thisWeek)).sort((a, b) => b[1] - a[1]) as [Muscle, number][];

    if (sessions.length === 0) {
        return (
            <div className="space-y-6 pb-4">
                <PageHeader tone="sky" title={t('nav.progress')} subtitle={t('progress.heroEmpty')} />
                <Section>
                    <div className="card relative overflow-hidden p-6 text-center">
                        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-sky-500/20 to-transparent" />
                        <span className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-snow shadow-lg shadow-sky-500/30"><ChartIcon size={30} /></span>
                        <p className="relative text-lg font-bold">{t('progress.empty.title')}</p>
                        <p className="relative mt-1 text-sm text-white/60">{t('progress.empty.body')}</p>
                        <Link to="/" className="btn-primary relative mt-4 w-full"><Play size={16} fill="currentColor" /> {t('progress.empty.cta')}</Link>
                    </div>
                </Section>
                <Section title={t('move.title')}><MovementWeek unit={unit} /></Section>
                <Section title={t('bw.title')}><BodyWeightCard unit={unit} /></Section>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-4">
            <PageHeader tone="sky" title={t('nav.progress')} subtitle={tp('progress.count', sessions.length)}>
                <div className="grid grid-cols-3 gap-2">
                    <HeroStat value={sessions.length} label={t('progress.heroTotal')} />
                    <HeroStat value={streakWeeks(sessions)} label={t('progress.heroStreak')} />
                    <HeroStat value={records.length} label={t('progress.heroRecords')} />
                </div>
            </PageHeader>

            <Section title={t('progress.consistency')}>
                <div className="card space-y-4 p-4">
                    <WeekBars weeks={weeks} target={profile.daysPerWeek} />
                    <TrainingCalendar weeks={calendar} />
                </div>
                <Link to="/actividad" className="mt-2 flex items-center justify-between rounded-xl px-1 py-1 text-sm font-semibold text-brand">
                    {t('activity.title')} <ChevronRight size={16} />
                </Link>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 p-3.5 text-snow shadow-md shadow-sky-500/25">
                        <p className="text-2xl font-extrabold tabular-nums">{thisWeek.length}</p>
                        <p className="text-xs text-snow/85">{t('progress.thisWeek')}</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-brand to-amber-500 p-3.5 text-snow shadow-md shadow-brand/25">
                        <p className="text-2xl font-extrabold tabular-nums">{fmtVolume(weeks[weeks.length - 1].volumeKg, unit)}</p>
                        <p className="text-xs text-snow/85">{t('progress.volumeWeek')}</p>
                    </div>
                </div>
            </Section>

            <Section title={t('move.title')}><MovementWeek unit={unit} /></Section>

            <Section title={t('share.section')}>
                <div className="grid grid-cols-2 gap-2">
                    <Link to="/wrapped" className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-fuchsia-500 p-3.5 font-semibold text-snow shadow-md shadow-brand/25"><Share2 size={18} /> {t('wrapped.title')}</Link>
                    <Link to="/antes-despues" className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 p-3.5 font-semibold text-snow shadow-md shadow-sky-500/25"><Columns2 size={18} /> {t('compare.title')}</Link>
                </div>
            </Section>

            <Section title={bodyweight ? t('progress.bestReps') : t('progress.e1rm', { unit })}>
                <div className="card p-4">
                    <select value={exerciseId} onChange={e => setPicked(e.target.value)} aria-label={t('progress.exercise')}
                        className="mb-3 w-full rounded-xl border border-line bg-ink-3 px-3 py-2.5 text-sm outline-none focus:border-brand">
                        {exerciseIds.map(id => <option key={id} value={id}>{exerciseName(id)}</option>)}
                    </select>
                    <LineChart points={series} unit={bodyweight ? t('unit.reps') : unit} emptyText={t('progress.trendEmpty')} />
                </div>
            </Section>

            {muscles.length > 0 && (
                <Section title={t('progress.setsPerMuscle')}>
                    <div className="card space-y-2 p-4">
                        {muscles.map(([m, n]) => (
                            <div key={m} className="flex items-center gap-3 text-sm">
                                <span className="w-28 shrink-0 text-white/75">{muscleLabel(m)}</span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-4">
                                    <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" style={{ width: `${Math.min(100, (n / 20) * 100)}%` }} />
                                </div>
                                <span className="w-6 text-right tabular-nums text-white/60">{n}</span>
                            </div>
                        ))}
                        <p className="pt-1 text-xs text-white/40">{t('progress.setsReference')}</p>
                    </div>
                </Section>
            )}

            <Section title={t('bw.title')}><BodyWeightCard unit={unit} /></Section>

            <Section title={t('section.records')}>
                <div className="card divide-y divide-line">
                    {[...records].sort((a, b) => b.bestE1rm - a.bestE1rm || b.bestReps - a.bestReps).slice(0, 10).map(r => (
                        <Link key={r.exerciseId} to={`/ejercicios/${r.exerciseId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-3">
                            <span className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-snow"><Trophy size={15} /></span>
                                <span className="truncate">{exerciseName(r.exerciseId)}</span>
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-white/60">
                                {r.bestWeightKg > 0
                                    ? <>{fmtNumber(kgToDisplay(r.bestWeightKg, unit))} × {r.repsAtBestWeight} · <b className="text-white">{fmtNumber(kgToDisplay(r.bestE1rm, unit))}</b> 1RM</>
                                    : <><b className="text-white">{r.bestReps}</b> {getExercise(r.exerciseId)?.timed ? 's' : t('unit.reps')}</>}
                            </span>
                        </Link>
                    ))}
                </div>
            </Section>

            <Section title={t('section.history')}>
                <div className="card divide-y divide-line">
                    {sessions.slice(0, historyLimit).map(s => (
                        <Link key={s.id} to={`/sesion/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-3">
                            <div className="min-w-0">
                                <p className="truncate font-medium">{sessionName(s)}</p>
                                <p className="text-xs text-white/50">{fmtDate(s.startedAt)} · {durationMin(s)} min · {tp('common.sets', s.sets.length)}</p>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-white/60">
                                {fmtVolume(volume(s.sets), unit)} <ChevronRight size={16} />
                            </span>
                        </Link>
                    ))}
                </div>
                {sessions.length > historyLimit && (
                    <button onClick={() => setHistoryLimit(n => n + 20)} className="btn-ghost mt-2 w-full">
                        {t('common.showMore', { n: sessions.length - historyLimit })}
                    </button>
                )}
            </Section>
        </div>
    );
}
