import { ChevronLeft } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LineChart } from '../components/Charts';
import { Section, Stat } from '../components/ui';
import { getExercise, MUSCLE_LABEL } from '../data/exercises';
import { fmtDate, fmtNumber, fmtWeight } from '../lib/format';
import { kgToDisplay, personalRecords } from '../lib/progression';
import { exerciseSeries } from '../lib/stats';
import { useStore } from '../store/store';

export default function ExerciseDetail() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const sessions = useStore(s => s.sessions);
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const ex = getExercise(id);

    const history = useMemo(() => sessions
        .map(s => ({ session: s, sets: s.sets.filter(x => x.exerciseId === id) }))
        .filter(h => h.sets.length > 0), [sessions, id]);
    const record = useMemo(() => personalRecords(history.flatMap(h => h.sets)).get(id), [history, id]);
    const bodyweight = ex?.stepKg === 0;
    const series = useMemo(() => exerciseSeries(sessions, id).map(p => ({ ...p, value: bodyweight ? p.value : kgToDisplay(p.value, unit) })), [sessions, id, bodyweight, unit]);

    if (!ex) return <p className="p-6 text-center text-white/60">Ejercicio no encontrado.</p>;

    return (
        <div className="space-y-5 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label="Volver" className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold">{ex.name}</h1>
                    <p className="text-sm text-white/50">
                        {MUSCLE_LABEL[ex.muscle]}{ex.secondary?.length ? ` · también ${ex.secondary.map(m => MUSCLE_LABEL[m].toLowerCase()).join(', ')}` : ''} · {ex.equipment}
                    </p>
                </div>
            </header>

            <Section title="Técnica">
                <p className="card p-4 text-white/80">{ex.tip}</p>
                <p className="mt-2 text-xs text-white/40">
                    {ex.stepKg > 0
                        ? `Cuando completes todas las series en lo más alto del rango, la app te sugerirá +${fmtWeight(ex.stepKg, unit)}.`
                        : 'Ejercicio con tu peso: la app te sugerirá una repetición más cada vez.'}
                </p>
            </Section>

            {record ? (
                <>
                    <Section>
                        <div className="grid grid-cols-3 gap-2">
                            {bodyweight ? <Stat value={record.bestReps} label={ex.timed ? 'mejor tiempo (s)' : 'más reps'} /> : (
                                <>
                                    <Stat value={fmtNumber(kgToDisplay(record.bestE1rm, unit))} label={`1RM est. (${unit})`} />
                                    <Stat value={`${fmtNumber(kgToDisplay(record.bestWeightKg, unit))}×${record.repsAtBestWeight}`} label="serie más pesada" />
                                </>
                            )}
                            <Stat value={history.length} label="entrenos" />
                        </div>
                    </Section>
                    <Section title={bodyweight ? 'Mejores repeticiones' : `1RM estimado (${unit})`}>
                        <div className="card p-4">
                            <LineChart points={series} unit={bodyweight ? 'reps' : unit} emptyText="Necesitas dos entrenos con este ejercicio para ver la tendencia." />
                        </div>
                    </Section>
                    <Section title="Historial">
                        <div className="card divide-y divide-line">
                            {history.slice(0, 12).map(({ session, sets }) => (
                                <Link key={session.id} to={`/sesion/${session.id}`} className="block px-4 py-3 hover:bg-ink-3">
                                    <p className="text-sm font-medium">{fmtDate(session.startedAt)}</p>
                                    <p className="text-sm tabular-nums text-white/55">
                                        {sets.map(s => s.weightKg > 0 ? `${fmtNumber(kgToDisplay(s.weightKg, unit))}×${s.reps}` : `${s.reps}`).join(' · ')}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </Section>
                </>
            ) : (
                <Section><p className="card p-4 text-sm text-white/55">Todavía no has hecho este ejercicio.</p></Section>
            )}
        </div>
    );
}
