import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { flushPending, getHistory, pendingCount, SessionRecord } from '../services/workoutService';
import { estimate1RM, kgToDisplay, personalRecords, sessionVolume } from '../lib/progression';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const minutesBetween = (start: string, end: string | null) =>
    end ? Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 60000)) : null;

// Best estimated 1RM per session for one exercise, oldest first.
const e1rmSeries = (sessions: SessionRecord[], exercise: string) =>
    sessions
        .map(s => {
            const sets = s.workout_sets.filter(set => set.exercise_name === exercise && !set.is_warmup);
            if (sets.length === 0) return null;
            return { date: s.started_at, value: Math.max(...sets.map(set => estimate1RM(set.weight_kg, set.reps))) };
        })
        .filter((p): p is { date: string; value: number } => p !== null)
        .reverse();

const LineChart: React.FC<{ points: { date: string; value: number }[]; unit: 'kg' | 'lbs' }> = ({ points, unit }) => {
    if (points.length < 2) {
        return <p className="text-sm text-slate-500 py-10 text-center">Log this exercise in two sessions to see your trend.</p>;
    }
    const W = 640, H = 220, padL = 44, padR = 16, padT = 16, padB = 28;
    const values = points.map(p => kgToDisplay(p.value, unit));
    const min = Math.min(...values), max = Math.max(...values);
    // Round the axis to a step that gives at most 5 gridlines.
    const pad = (max - min || 10) * 0.15;
    const step = [1, 2, 5, 10, 20, 25, 50, 100].find(st => (max - min + 2 * pad) / st <= 5) ?? 100;
    const lo = Math.floor((min - pad) / step) * step;
    const hi = Math.ceil((max + pad) / step) * step;
    const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
    const y = (v: number) => padT + (1 - (v - lo) / (hi - lo || 1)) * (H - padT - padB);
    const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
    const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(v)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Estimated one-rep max over time">
            {ticks.map(t => (
                <g key={t}>
                    <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="stroke-slate-200 dark:stroke-white/10" />
                    <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{t}</text>
                </g>
            ))}
            <path d={path} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" />
            {values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={4} className="fill-primary">
                    <title>{`${formatDate(points[i].date)}: ${v} ${unit}`}</title>
                </circle>
            ))}
            <text x={padL} y={H - 8} className="fill-slate-400 text-[11px]">{formatDate(points[0].date)}</text>
            <text x={W - padR} y={H - 8} textAnchor="end" className="fill-slate-400 text-[11px]">{formatDate(points[points.length - 1].date)}</text>
        </svg>
    );
};

const Progress: React.FC = () => {
    const { user } = useUser();
    const location = useLocation();
    const unit = user.weight_unit === 'lbs' ? 'lbs' : 'kg';
    const finishedSessionId = (location.state as { finishedSessionId?: string } | null)?.finishedSessionId;

    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(pendingCount());
    const [selectedExercise, setSelectedExercise] = useState<string>('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await flushPending();
            const history = await getHistory();
            if (cancelled) return;
            setSessions(history);
            setPending(pendingCount());
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const allSets = useMemo(() => sessions.flatMap(s => s.workout_sets), [sessions]);
    const records = useMemo(() => personalRecords(allSets), [allSets]);
    const exerciseNames = useMemo(() => records.map(r => r.exercise_name), [records]);
    const exercise = selectedExercise || exerciseNames[0] || '';
    const series = useMemo(() => e1rmSeries(sessions, exercise), [sessions, exercise]);

    const lastWeek = sessions.filter(s => Date.now() - Date.parse(s.started_at) < 7 * DAY_MS);
    const weekVolume = lastWeek.reduce((total, s) => total + (s.total_volume_kg ?? sessionVolume(s.workout_sets)), 0);

    // Summary of the workout just finished, with records it beat.
    const finished = sessions.find(s => s.id === finishedSessionId);
    const newRecords = useMemo(() => {
        if (!finished) return [];
        const before = personalRecords(sessions.filter(s => s.started_at < finished.started_at).flatMap(s => s.workout_sets));
        const now = personalRecords(finished.workout_sets);
        return now.filter(r => {
            const prev = before.find(b => b.exercise_name === r.exercise_name);
            return prev && r.best_e1rm > prev.best_e1rm;
        });
    }, [finished, sessions]);

    const card = 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-5 md:p-6';

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Progress</h1>
                    <p className="text-slate-500 dark:text-slate-400">Your sessions, records and strength trend.</p>
                </div>
                {pending > 0 && (
                    <span className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-[16px]">cloud_off</span>
                        {pending} change{pending === 1 ? '' : 's'} waiting to sync
                    </span>
                )}
            </header>

            {finished && (
                <section className={`${card} border-primary/40 bg-primary/5`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Workout complete</p>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{finished.routine_name ?? 'Workout'}</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{minutesBetween(finished.started_at, finished.ended_at) ?? '–'} min</p>
                            <p className="text-xs text-slate-500">Duration</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(kgToDisplay(finished.total_volume_kg ?? 0, unit)).toLocaleString()} {unit}</p>
                            <p className="text-xs text-slate-500">Volume</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{finished.workout_sets.length}</p>
                            <p className="text-xs text-slate-500">Sets</p>
                        </div>
                    </div>
                    {newRecords.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {newRecords.map(r => (
                                <span key={r.exercise_name} className="flex items-center gap-1 text-xs font-bold bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 px-3 py-1 rounded-full">
                                    <span className="material-symbols-outlined text-[16px]">emoji_events</span>
                                    New record: {r.exercise_name} ({kgToDisplay(r.best_e1rm, unit)} {unit} e1RM)
                                </span>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {sessions.length === 0 ? (
                <section className={`${card} text-center py-14`}>
                    <span className="material-symbols-outlined text-5xl text-primary mb-3">monitoring</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No workouts logged yet</h2>
                    <p className="text-slate-500 mb-6">Finish your first session and your progress will show up here.</p>
                    <Link to="/training" className="inline-block bg-primary text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/20">Start a workout</Link>
                </section>
            ) : (
                <>
                    <section className="grid grid-cols-3 gap-3 md:gap-4">
                        <div className={card}>
                            <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{lastWeek.length}</p>
                            <p className="text-xs md:text-sm text-slate-500">Sessions, last 7 days</p>
                        </div>
                        <div className={card}>
                            <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{Math.round(kgToDisplay(weekVolume, unit)).toLocaleString()}</p>
                            <p className="text-xs md:text-sm text-slate-500">Volume ({unit}), last 7 days</p>
                        </div>
                        <div className={card}>
                            <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{sessions.length}</p>
                            <p className="text-xs md:text-sm text-slate-500">Sessions logged</p>
                        </div>
                    </section>

                    <section className={card}>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Estimated 1RM ({unit})</h2>
                            <select
                                value={exercise}
                                onChange={e => setSelectedExercise(e.target.value)}
                                className="rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-surface-darker text-sm text-slate-900 dark:text-white"
                            >
                                {exerciseNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <LineChart points={series} unit={unit} />
                    </section>

                    <div className="grid lg:grid-cols-2 gap-6">
                        <section className={card}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Personal records</h2>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                                        <th className="pb-2 font-medium">Exercise</th>
                                        <th className="pb-2 font-medium text-right">Heaviest set</th>
                                        <th className="pb-2 font-medium text-right">e1RM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.slice(0, 12).map(r => (
                                        <tr key={r.exercise_name} className="border-t border-slate-100 dark:border-white/5">
                                            <td className="py-2 font-medium text-slate-900 dark:text-white">{r.exercise_name}</td>
                                            <td className="py-2 text-right text-slate-600 dark:text-slate-300">{kgToDisplay(r.best_weight_kg, unit)} × {r.best_reps_at_weight}</td>
                                            <td className="py-2 text-right font-bold text-slate-900 dark:text-white">{kgToDisplay(r.best_e1rm, unit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className={card}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">History</h2>
                            <ul className="divide-y divide-slate-100 dark:divide-white/5">
                                {sessions.slice(0, 15).map(s => (
                                    <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-900 dark:text-white truncate">{s.routine_name ?? 'Workout'}</p>
                                            <p className="text-xs text-slate-500">
                                                {formatDate(s.started_at)} · {s.workout_sets.length} sets
                                                {minutesBetween(s.started_at, s.ended_at) ? ` · ${minutesBetween(s.started_at, s.ended_at)} min` : ''}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                            {Math.round(kgToDisplay(s.total_volume_kg ?? sessionVolume(s.workout_sets), unit)).toLocaleString()} {unit}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>
                </>
            )}
        </div>
    );
};

export default Progress;
