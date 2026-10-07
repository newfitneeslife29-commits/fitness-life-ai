import { ChevronRight, LineChart as ChartIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, WeekBars } from '../components/Charts';
import { Empty, PageHeader, Section, Stat } from '../components/ui';
import { getExercise, MUSCLE_LABEL, type Muscle } from '../data/exercises';
import { fmtDate, fmtNumber, fmtVolume } from '../lib/format';
import { kgToDisplay, personalRecords, volume } from '../lib/progression';
import { durationMin, exerciseSeries, sessionsThisWeek, setsPerMuscle, weeklySeries } from '../lib/stats';
import { useStore } from '../store/store';

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
    const exerciseId = picked || exerciseIds[0] || '';
    const bodyweight = getExercise(exerciseId)?.stepKg === 0;
    const series = useMemo(
        () => exerciseSeries(sessions, exerciseId).map(p => ({ ...p, value: bodyweight ? p.value : kgToDisplay(p.value, unit) })),
        [sessions, exerciseId, bodyweight, unit],
    );

    const weeks = weeklySeries(sessions, 8);
    const thisWeek = sessionsThisWeek(sessions);
    const muscles = Object.entries(setsPerMuscle(thisWeek)).sort((a, b) => b[1] - a[1]) as [Muscle, number][];

    if (sessions.length === 0) {
        return (
            <>
                <PageHeader title="Progreso" />
                <Section>
                    <Empty icon={<ChartIcon size={32} />} title="Aún no hay entrenos">
                        Termina tu primer entreno y aquí verás tu constancia, tus récords y cómo sube tu fuerza.
                    </Empty>
                </Section>
            </>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Progreso" subtitle={`${sessions.length} entrenos registrados`} />

            <Section title="Constancia">
                <div className="card p-4"><WeekBars weeks={weeks} target={profile.daysPerWeek} /></div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <Stat value={thisWeek.length} label="entrenos esta semana" />
                    <Stat value={fmtVolume(weeks[weeks.length - 1].volumeKg, unit)} label="volumen esta semana" />
                </div>
            </Section>

            <Section title={bodyweight ? 'Mejores repeticiones' : `1RM estimado (${unit})`}>
                <div className="card p-4">
                    <select value={exerciseId} onChange={e => setPicked(e.target.value)} aria-label="Ejercicio"
                        className="mb-3 w-full rounded-xl border border-line bg-ink-3 px-3 py-2.5 text-sm outline-none focus:border-brand">
                        {exerciseIds.map(id => <option key={id} value={id}>{getExercise(id)?.name ?? id}</option>)}
                    </select>
                    <LineChart points={series} unit={bodyweight ? 'reps' : unit} emptyText="Haz este ejercicio en dos entrenos para ver la tendencia." />
                </div>
            </Section>

            {muscles.length > 0 && (
                <Section title="Series por músculo esta semana">
                    <div className="card space-y-2 p-4">
                        {muscles.map(([m, n]) => (
                            <div key={m} className="flex items-center gap-3 text-sm">
                                <span className="w-28 shrink-0 text-white/75">{MUSCLE_LABEL[m]}</span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-4">
                                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (n / 20) * 100)}%` }} />
                                </div>
                                <span className="w-6 text-right tabular-nums text-white/60">{n}</span>
                            </div>
                        ))}
                        <p className="pt-1 text-xs text-white/40">Referencia: 10 a 20 series semanales por músculo para ganar masa.</p>
                    </div>
                </Section>
            )}

            <Section title="Récords">
                <div className="card divide-y divide-line">
                    {[...records].sort((a, b) => b.bestE1rm - a.bestE1rm || b.bestReps - a.bestReps).slice(0, 10).map(r => (
                        <Link key={r.exerciseId} to={`/ejercicios/${r.exerciseId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-3">
                            <span className="truncate">{getExercise(r.exerciseId)?.name ?? r.exerciseId}</span>
                            <span className="shrink-0 text-sm tabular-nums text-white/60">
                                {r.bestWeightKg > 0
                                    ? <>{fmtNumber(kgToDisplay(r.bestWeightKg, unit))} × {r.repsAtBestWeight} · <b className="text-white">{fmtNumber(kgToDisplay(r.bestE1rm, unit))}</b> 1RM</>
                                    : <><b className="text-white">{r.bestReps}</b> {getExercise(r.exerciseId)?.timed ? 's' : 'reps'}</>}
                            </span>
                        </Link>
                    ))}
                </div>
            </Section>

            <Section title="Historial">
                <div className="card divide-y divide-line">
                    {sessions.slice(0, 30).map(s => (
                        <Link key={s.id} to={`/sesion/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-3">
                            <div className="min-w-0">
                                <p className="truncate font-medium">{s.routineName}</p>
                                <p className="text-xs text-white/50">{fmtDate(s.startedAt)} · {durationMin(s)} min · {s.sets.length} series</p>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-white/60">
                                {fmtVolume(volume(s.sets), unit)} <ChevronRight size={16} />
                            </span>
                        </Link>
                    ))}
                </div>
            </Section>
        </div>
    );
}
