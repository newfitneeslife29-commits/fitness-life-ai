import { ChevronLeft, Trash2, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Section, Stat } from '../components/ui';
import { getExercise } from '../data/exercises';
import { fmtDate, fmtNumber, fmtVolume, fmtWeight } from '../lib/format';
import { kgToDisplay, newRecords, volume } from '../lib/progression';
import { durationMin } from '../lib/stats';
import { actions, useStore } from '../store/store';

const KIND_LABEL = { e1rm: 'mejor 1RM estimado', peso: 'peso más alto', reps: 'más repeticiones' } as const;

export default function SessionDetail() {
    const { id } = useParams();
    const [params] = useSearchParams();
    const isNew = params.get('nuevo') === '1';
    const sessions = useStore(s => s.sessions);
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const navigate = useNavigate();
    const index = sessions.findIndex(s => s.id === id);
    const session = sessions[index];

    const records = useMemo(() => {
        if (!session) return [];
        const before = sessions.slice(index + 1).flatMap(s => s.sets);
        return newRecords(before, session.sets);
    }, [sessions, session, index]);

    if (!session) {
        return (
            <div className="p-6 text-center text-white/60">
                Este entreno no existe. <Link to="/progreso" className="text-brand underline">Ver historial</Link>
            </div>
        );
    }

    const byExercise = new Map<string, typeof session.sets>();
    for (const set of session.sets) byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);

    const remove = () => {
        if (!window.confirm('¿Borrar este entreno del historial?')) return;
        actions.deleteSession(session.id);
        navigate('/progreso', { replace: true });
    };

    return (
        <div className="space-y-5 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => (isNew ? navigate('/') : navigate(-1))} aria-label="Volver" className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white">
                    <ChevronLeft size={22} />
                </button>
                <div className="min-w-0 flex-1">
                    {isNew && <p className="label text-good">Entreno guardado</p>}
                    <h1 className="truncate text-xl font-bold">{session.routineName}</h1>
                    <p className="text-sm text-white/50">{fmtDate(session.startedAt)}</p>
                </div>
            </header>

            <Section>
                <div className="grid grid-cols-3 gap-2">
                    <Stat value={`${durationMin(session)} min`} label="Duración" />
                    <Stat value={fmtVolume(volume(session.sets), unit)} label="Volumen" />
                    <Stat value={session.sets.length} label="Series" />
                </div>
            </Section>

            {records.length > 0 && (
                <Section title="Récords">
                    <ul className="space-y-2">
                        {records.map(r => (
                            <li key={r.exerciseId} className="card flex items-center gap-3 border-yellow-400/30 bg-yellow-400/5 p-3">
                                <Trophy className="shrink-0 text-yellow-300" size={20} />
                                <span className="text-sm"><b>{getExercise(r.exerciseId)?.name}</b>: {KIND_LABEL[r.kind]}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Section title="Ejercicios">
                <div className="space-y-2">
                    {[...byExercise].map(([exerciseId, sets]) => (
                        <div key={exerciseId} className="card p-4">
                            <Link to={`/ejercicios/${exerciseId}`} className="font-semibold hover:text-brand-strong">{getExercise(exerciseId)?.name ?? exerciseId}</Link>
                            <ol className="mt-2 flex flex-wrap gap-2 text-sm tabular-nums text-white/75">
                                {sets.map(s => (
                                    <li key={s.id} className="rounded-lg bg-ink-3 px-2.5 py-1">
                                        {s.weightKg > 0 ? `${fmtNumber(kgToDisplay(s.weightKg, unit))} × ${s.reps}` : `${s.reps}${getExercise(exerciseId)?.timed ? ' s' : ' reps'}`}
                                    </li>
                                ))}
                            </ol>
                            {sets.some(s => s.weightKg > 0) && (
                                <p className="mt-2 text-xs text-white/45">Mejor serie: {fmtWeight(Math.max(...sets.map(s => s.weightKg)), unit)}</p>
                            )}
                        </div>
                    ))}
                </div>
            </Section>

            <Section>
                {isNew ? (
                    <Link to="/" className="btn-primary w-full">Listo</Link>
                ) : (
                    <button onClick={remove} className="btn-danger w-full"><Trash2 size={16} /> Borrar entreno</button>
                )}
            </Section>
        </div>
    );
}
