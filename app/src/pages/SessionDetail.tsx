import { ChevronLeft, Share2, Trash2, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { Medal } from '../components/Medal';
import { Section, Stat } from '../components/ui';
import { getExercise } from '../data/exercises';
import { ACHIEVEMENTS, unlockedAchievements } from '../lib/achievements';
import { fmtDate, fmtNumber, fmtVolume, fmtWeight } from '../lib/format';
import { shareText } from '../lib/native';
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
    const days = useStore(s => s.profile?.daysPerWeek ?? 3);
    const navigate = useNavigate();
    const index = sessions.findIndex(s => s.id === id);
    const session = sessions[index];
    const [notes, setNotes] = useState(session?.notes ?? '');

    // Medals earned with this very session.
    const medals = useMemo(() => {
        if (!session) return [];
        const unlocked = unlockedAchievements(sessions, days);
        return ACHIEVEMENTS.filter(a => unlocked.get(a.id)?.sessionId === session.id);
    }, [sessions, session, days]);

    useEffect(() => {
        if (isNew && medals.length) actions.markAchievementsSeen(medals.map(m => m.id));
    }, [isNew, medals]);

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

    const share = async () => {
        const lines = [
            `${session.routineName} · ${fmtDate(session.startedAt)}`,
            `${durationMin(session)} min · ${fmtVolume(volume(session.sets), unit)} · ${session.sets.length} series`,
            ...records.map(r => `Récord: ${getExercise(r.exerciseId)?.name} (${KIND_LABEL[r.kind]})`),
            'Registrado con Fitness Life',
        ];
        const result = await shareText('Mi entreno', lines.join('\n'));
        if (result === 'copied') toast('Resumen copiado');
        if (result === 'failed') toast('No se pudo compartir');
    };

    const remove = async () => {
        if (!(await confirm({ title: '¿Borrar este entreno?', message: 'Se quitará del historial y de tus récords.', confirmLabel: 'Borrar', danger: true }))) return;
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

            {medals.length > 0 && (
                <Section title={medals.length === 1 ? 'Logro nuevo' : 'Logros nuevos'}>
                    <ul className="space-y-2">
                        {medals.map(m => (
                            <li key={m.id} className="card flex animate-rise items-center gap-3 p-3">
                                <Medal achievement={m} unlocked />
                                <div>
                                    <p className="font-semibold">{m.title}</p>
                                    <p className="text-sm text-white/55">{m.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

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

            <Section title="Notas">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => actions.setSessionNotes(session.id, notes)}
                    rows={3} placeholder="Cómo te has sentido, molestias, qué cambiar la próxima vez…" aria-label="Notas del entreno"
                    className="w-full resize-none rounded-2xl border border-line bg-ink-2 p-4 text-sm outline-none placeholder:text-white/35 focus:border-brand" />
            </Section>

            <Section>
                <div className="space-y-2">
                    <button onClick={share} className="btn-ghost w-full"><Share2 size={16} /> Compartir</button>
                    {isNew ? (
                        <Link to="/" className="btn-primary w-full">Listo</Link>
                    ) : (
                        <button onClick={remove} className="btn-danger w-full"><Trash2 size={16} /> Borrar entreno</button>
                    )}
                </div>
            </Section>
        </div>
    );
}
