import { ChevronRight, Flame, Play, Plus, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Empty, Section, Stat } from '../components/ui';
import { getExercise } from '../data/exercises';
import { fmtDate, fmtRange, fmtVolume, greeting } from '../lib/format';
import { volume } from '../lib/progression';
import { durationMin, sessionsThisWeek, streakWeeks } from '../lib/stats';
import { actions, useStore } from '../store/store';

export default function Today() {
    const { profile, plan, routines, sessions, active } = useStore();
    const navigate = useNavigate();
    if (!profile) return null;

    const next = plan ? routines.find(r => r.id === plan.routineIds[plan.nextIndex]) : undefined;
    const thisWeek = sessionsThisWeek(sessions).length;
    const streak = streakWeeks(sessions);
    const lastSession = sessions[0];

    const start = (routineId: string | null) => {
        if (active && (active.routineId === routineId || !window.confirm('Ya tienes un entreno en curso. ¿Descartarlo y empezar otro?'))) {
            navigate('/entreno');
            return;
        }
        actions.startWorkout(routineId);
        navigate('/entreno');
    };

    return (
        <div className="space-y-6">
            <header className="px-4 pt-6">
                <p className="text-sm text-white/55">{greeting()}{profile.name ? `, ${profile.name}` : ''}</p>
                <h1 className="text-2xl font-bold tracking-tight">
                    {thisWeek >= profile.daysPerWeek ? 'Semana completada' : `${thisWeek} de ${profile.daysPerWeek} entrenos esta semana`}
                </h1>
                <div className="mt-3 flex gap-1.5" aria-hidden>
                    {Array.from({ length: profile.daysPerWeek }, (_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-full ${i < thisWeek ? 'bg-brand' : 'bg-ink-4'}`} />
                    ))}
                </div>
            </header>

            <Section title="Siguiente entreno">
                {next ? (
                    <div className="card overflow-hidden">
                        <div className="p-4">
                            <p className="text-xs text-white/50">{plan?.programName} · día {(plan?.nextIndex ?? 0) + 1} de {plan?.routineIds.length}</p>
                            <h2 className="mb-3 text-xl font-bold">{next.name}</h2>
                            <ul className="space-y-1.5 text-sm">
                                {next.exercises.map((e, i) => (
                                    <li key={i} className="flex justify-between gap-3">
                                        <span className="truncate text-white/85">{getExercise(e.exerciseId)?.name ?? e.exerciseId}</span>
                                        <span className="shrink-0 tabular-nums text-white/45">
                                            {e.sets} × {fmtRange(e.repMin, e.repMax)}{getExercise(e.exerciseId)?.timed ? ' s' : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button onClick={() => start(next.id)} className="flex w-full items-center justify-center gap-2 bg-brand py-4 font-semibold text-ink hover:bg-brand-strong">
                            <Play size={18} fill="currentColor" /> {active?.routineId === next.id ? 'Continuar entreno' : 'Empezar entreno'}
                        </button>
                    </div>
                ) : (
                    <Empty icon={<Plus />} title="No tienes plan activo">
                        Crea uno en <Link className="text-brand underline" to="/ajustes">Ajustes</Link> o haz un entreno libre.
                    </Empty>
                )}
                <button onClick={() => start(null)} className="btn-ghost mt-2 w-full">
                    <Plus size={18} /> Entreno libre
                </button>
            </Section>

            <Section>
                <div className="grid grid-cols-2 gap-2">
                    <Stat value={<span className="flex items-center gap-1.5"><Flame size={18} className="text-brand" />{streak}</span>} label={streak === 1 ? 'semana seguida' : 'semanas seguidas'} />
                    <Stat value={<span className="flex items-center gap-1.5"><Trophy size={18} className="text-brand" />{sessions.length}</span>} label="entrenos en total" />
                </div>
            </Section>

            {lastSession && (
                <Section title="Último entreno">
                    <Link to={`/sesion/${lastSession.id}`} className="card flex items-center justify-between gap-3 p-4 hover:bg-ink-3">
                        <div className="min-w-0">
                            <p className="truncate font-semibold">{lastSession.routineName}</p>
                            <p className="text-sm text-white/50">
                                {fmtDate(lastSession.startedAt)} · {durationMin(lastSession)} min · {fmtVolume(volume(lastSession.sets), profile.unit)}
                            </p>
                        </div>
                        <ChevronRight className="shrink-0 text-white/40" />
                    </Link>
                </Section>
            )}
        </div>
    );
}
