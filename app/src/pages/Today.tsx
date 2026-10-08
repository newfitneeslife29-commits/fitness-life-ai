import { ChevronRight, Flame, Play, Plus, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm } from '../components/feedback';
import { Medal } from '../components/Medal';
import { Empty, Section, Stat } from '../components/ui';
import { getExercise } from '../data/exercises';
import { ACHIEVEMENTS, unlockedAchievements } from '../lib/achievements';
import { fmtDate, fmtRange, fmtVolume, greeting } from '../lib/format';
import { volume } from '../lib/progression';
import { durationMin, sessionsThisWeek, streakWeeks } from '../lib/stats';
import { actions, useStore } from '../store/store';

// Weekly goal as a segmented ring: one segment per planned day.
const WeekRing = ({ done, target }: { done: number; target: number }) => {
    const r = 34, c = 2 * Math.PI * r, gap = target > 1 ? 6 : 0;
    const seg = c / target - gap;
    return (
        <svg viewBox="0 0 84 84" className="h-24 w-24 shrink-0 -rotate-90" role="img" aria-label={`${done} de ${target} entrenos esta semana`}>
            {Array.from({ length: target }, (_, i) => (
                <circle key={i} cx={42} cy={42} r={r} fill="none" strokeWidth={9} strokeLinecap="round"
                    stroke={i < done ? '#f26b1d' : '#252a33'}
                    strokeDasharray={`${Math.max(seg, 0.1)} ${c}`} strokeDashoffset={-i * (seg + gap)} />
            ))}
            <text x={42} y={-36} transform="rotate(90)" textAnchor="middle" fontSize={20} fontWeight={700} fill="#fff">
                {Math.min(done, target)}/{target}
            </text>
        </svg>
    );
};

export default function Today() {
    const { profile, plan, routines, sessions, active, seenAchievements } = useStore();
    const navigate = useNavigate();
    const unlocked = useMemo(() => unlockedAchievements(sessions, profile?.daysPerWeek ?? 3), [sessions, profile?.daysPerWeek]);
    if (!profile) return null;

    const next = plan ? routines.find(r => r.id === plan.routineIds[plan.nextIndex]) : undefined;
    const thisWeek = sessionsThisWeek(sessions).length;
    const streak = streakWeeks(sessions);
    const lastSession = sessions[0];
    const latestMedal = [...unlocked.values()].sort((a, b) => b.date.localeCompare(a.date))[0];
    const unseen = [...unlocked.keys()].filter(id => !seenAchievements.includes(id)).length;

    const start = async (routineId: string | null) => {
        if (active && (active.routineId === routineId || !(await confirm({ title: 'Ya tienes un entreno en curso', message: '¿Descartarlo y empezar otro?', confirmLabel: 'Empezar otro', danger: true })))) {
            navigate('/entreno');
            return;
        }
        actions.startWorkout(routineId);
        navigate('/entreno');
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4 px-4 pt-6">
                <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/55">{greeting()}{profile.name ? `, ${profile.name}` : ''}</p>
                    <h1 className="text-2xl font-bold leading-tight tracking-tight">
                        {thisWeek >= profile.daysPerWeek ? 'Semana completada' : `${thisWeek} de ${profile.daysPerWeek} entrenos esta semana`}
                    </h1>
                    <p className="mt-1 text-sm text-white/50">
                        {thisWeek >= profile.daysPerWeek ? 'Objetivo cumplido. Descansa o suma un extra.' : `Te ${profile.daysPerWeek - thisWeek === 1 ? 'queda 1 entreno' : `quedan ${profile.daysPerWeek - thisWeek} entrenos`} para tu objetivo.`}
                    </p>
                </div>
                <WeekRing done={thisWeek} target={profile.daysPerWeek} />
            </header>

            <Section title="Siguiente entreno">
                {next ? (
                    <div className="card overflow-hidden bg-gradient-to-br from-ink-3 to-ink-2">
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
                        <button onClick={() => start(next.id)} className="flex w-full items-center justify-center gap-2 bg-brand py-4 font-semibold text-ink transition hover:bg-brand-strong active:scale-[0.99]">
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

            <Section title="Logros">
                <Link to="/logros" className="card flex items-center gap-3 p-3 hover:bg-ink-3">
                    {latestMedal
                        ? <Medal achievement={ACHIEVEMENTS.find(a => a.id === latestMedal.id)!} unlocked />
                        : <Medal achievement={ACHIEVEMENTS[0]} unlocked={false} />}
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                            {latestMedal ? ACHIEVEMENTS.find(a => a.id === latestMedal.id)?.title : 'Tu primer logro te espera'}
                        </p>
                        <p className="text-sm text-white/50">{unlocked.size} de {ACHIEVEMENTS.length} conseguidos</p>
                    </div>
                    {unseen > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink">{unseen} nuevo{unseen > 1 ? 's' : ''}</span>}
                    <ChevronRight className="shrink-0 text-white/40" />
                </Link>
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
