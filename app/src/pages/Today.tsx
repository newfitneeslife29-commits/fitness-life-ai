import { ChevronRight, Flame, Play, Plus, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm } from '../components/feedback';
import { Medal } from '../components/Medal';
import { Empty, Section, Stat } from '../components/ui';
import { exerciseName, getExercise } from '../data/exercises';
import { t, tp } from '../i18n';
import { planName, routineName, sessionName } from '../lib/names';
import { ACHIEVEMENTS, achievementTitle, unlockedAchievements } from '../lib/achievements';
import { fmtDate, fmtRange, fmtVolume, greeting } from '../lib/format';
import { volume } from '../lib/progression';
import { durationMin, sessionsThisWeek, streakWeeks } from '../lib/stats';
import { actions, useStore } from '../store/store';

// Weekly goal as a segmented ring: one segment per planned day.
const WeekRing = ({ done, target }: { done: number; target: number }) => {
    const r = 34, c = 2 * Math.PI * r, gap = target > 1 ? 6 : 0;
    const seg = c / target - gap;
    return (
        <svg viewBox="0 0 84 84" className="h-24 w-24 shrink-0 -rotate-90" role="img" aria-label={t('today.title', { done, target })}>
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
        if (active && (active.routineId === routineId || !(await confirm({ title: t('active.confirm.title'), message: t('active.confirm.message'), confirmLabel: t('active.confirm.start'), danger: true })))) {
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
                        {thisWeek >= profile.daysPerWeek ? t('today.weekDone') : t('today.title', { done: thisWeek, target: profile.daysPerWeek })}
                    </h1>
                    <p className="mt-1 text-sm text-white/50">
                        {thisWeek >= profile.daysPerWeek ? t('today.weekDoneHint') : tp('today.left', profile.daysPerWeek - thisWeek)}
                    </p>
                </div>
                <WeekRing done={thisWeek} target={profile.daysPerWeek} />
            </header>

            <Section title={t('today.next')}>
                {next ? (
                    <div className="card overflow-hidden bg-gradient-to-br from-ink-3 to-ink-2">
                        <div className="p-4">
                            <p className="text-xs text-white/50">{plan && planName(plan)} · {t('today.dayOf', { n: (plan?.nextIndex ?? 0) + 1, total: plan?.routineIds.length ?? 0 })}</p>
                            <h2 className="mb-3 text-xl font-bold">{routineName(next)}</h2>
                            <ul className="space-y-1.5 text-sm">
                                {next.exercises.map((e, i) => (
                                    <li key={i} className="flex justify-between gap-3">
                                        <span className="truncate text-white/85">{exerciseName(e.exerciseId)}</span>
                                        <span className="shrink-0 tabular-nums text-white/45">
                                            {e.sets} × {fmtRange(e.repMin, e.repMax)}{getExercise(e.exerciseId)?.timed ? ' s' : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button onClick={() => start(next.id)} className="flex w-full items-center justify-center gap-2 bg-brand py-4 font-semibold text-ink transition hover:bg-brand-strong active:scale-[0.99]">
                            <Play size={18} fill="currentColor" /> {active?.routineId === next.id ? t('today.continue') : t('today.start')}
                        </button>
                    </div>
                ) : (
                    <Empty icon={<Plus />} title={t('today.noPlan')}>
                        {t('today.noPlanHint')} <Link className="text-brand underline" to="/ajustes">{t('nav.settings')}</Link>
                    </Empty>
                )}
                <button onClick={() => start(null)} className="btn-ghost mt-2 w-full">
                    <Plus size={18} /> {t('workout.free')}
                </button>
            </Section>

            <Section>
                <div className="grid grid-cols-2 gap-2">
                    <Stat value={<span className="flex items-center gap-1.5"><Flame size={18} className="text-brand" />{streak}</span>} label={tp('today.streak', streak)} />
                    <Stat value={<span className="flex items-center gap-1.5"><Trophy size={18} className="text-brand" />{sessions.length}</span>} label={t('today.total')} />
                </div>
            </Section>

            <Section title={t('nav.achievements')}>
                <Link to="/logros" className="card flex items-center gap-3 p-3 hover:bg-ink-3">
                    {latestMedal
                        ? <Medal achievement={ACHIEVEMENTS.find(a => a.id === latestMedal.id)!} unlocked />
                        : <Medal achievement={ACHIEVEMENTS[0]} unlocked={false} />}
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                            {latestMedal ? achievementTitle(ACHIEVEMENTS.find(a => a.id === latestMedal.id)!) : t('today.firstMedal')}
                        </p>
                        <p className="text-sm text-white/50">{t('achievements.count', { n: unlocked.size, total: ACHIEVEMENTS.length })}</p>
                    </div>
                    {unseen > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-ink">{tp('today.newMedals', unseen)}</span>}
                    <ChevronRight className="shrink-0 text-white/40" />
                </Link>
            </Section>

            {lastSession && (
                <Section title={t('today.last')}>
                    <Link to={`/sesion/${lastSession.id}`} className="card flex items-center justify-between gap-3 p-4 hover:bg-ink-3">
                        <div className="min-w-0">
                            <p className="truncate font-semibold">{sessionName(lastSession)}</p>
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
