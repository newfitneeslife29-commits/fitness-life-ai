import { Bot, CalendarSync, ChevronRight, Dumbbell, Footprints, GraduationCap, Layers, Play, Plus, Sparkles, Baby, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm } from '../components/feedback';
import { HeroStat, PageHeader, Photo, Section } from '../components/ui';
import { namedCover, routineCovers, type Cover } from '../data/covers';
import { kindPhoto } from '../data/photos';
import { exerciseName } from '../data/exercises';
import { t, tp } from '../i18n';
import { planName, routineName } from '../lib/names';
import { weekPhase } from '../lib/plan';
import { actions, useStore } from '../store/store';
import type { Routine } from '../store/types';

const DAY_COLORS = ['from-brand to-amber-500', 'from-violet-500 to-fuchsia-500', 'from-sky-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500', 'from-amber-500 to-orange-600'];

const RoutineRow = ({ routine, cover, badge, index, onStart }: { routine: Routine; cover: Cover; badge?: string; index: number; onStart: () => void }) => {
    const name = routineName(routine);
    return (
        <div className={`card flex items-stretch overflow-hidden ${badge ? 'ring-2 ring-brand/60' : ''}`}>
            <Link to={`/rutinas/${routine.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-3 hover:bg-ink-3">
                <span className={`relative flex h-16 w-14 shrink-0 items-end justify-start overflow-hidden rounded-2xl bg-gradient-to-br text-lg font-extrabold text-snow shadow-md ${DAY_COLORS[index % DAY_COLORS.length]}`}>
                    <img src={cover.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: cover.position }} />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <span className="relative px-1.5 pb-0.5 drop-shadow">{index + 1}</span>
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">{name}</span>
                        {badge && <span className="shrink-0 rounded-full bg-gradient-to-r from-brand to-amber-500 px-2 py-0.5 text-[11px] font-bold text-snow">{badge}</span>}
                    </span>
                    <span className="block truncate text-sm text-white/50">
                        {tp('common.exercises', routine.exercises.length)} · {routine.exercises.map(e => exerciseName(e.exerciseId)).slice(0, 3).join(', ')}
                    </span>
                </span>
            </Link>
            <button onClick={onStart} aria-label={t('routines.start', { name })} className="flex w-16 items-center justify-center border-l border-line hover:bg-ink-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-amber-500 text-snow shadow-md shadow-brand/30"><Play size={18} fill="currentColor" /></span>
            </button>
        </div>
    );
};

// A photo tile: the icon keeps its colour, the text sits on a dark fade.
const Explore = ({ to, icon, title, hint, color, photo }: { to: string; icon: ReactNode; title: string; hint: string; color: string; photo: Cover }) => (
    <Link to={to} className="relative flex min-h-[10.5rem] flex-col justify-end gap-1 overflow-hidden rounded-2xl bg-black p-3.5 text-snow shadow-md active:scale-[0.98]">
        <Photo photo={photo} />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/5" />
        <span className={`absolute left-3.5 top-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-snow shadow-md ${color}`}>{icon}</span>
        <span className="relative font-semibold leading-tight">{title}</span>
        <span className="relative line-clamp-2 text-xs text-snow/75">{hint}</span>
    </Link>
);

export default function Routines() {
    const { plan, routines, active } = useStore();
    const navigate = useNavigate();
    const planRoutines = plan ? plan.routineIds.map(id => routines.find(r => r.id === id)).filter((r): r is Routine => !!r) : [];
    const custom = routines.filter(r => r.source === 'custom');
    const planCovers = routineCovers(planRoutines);
    const customCovers = routineCovers(custom);

    const start = async (id: string) => {
        if (active && (active.routineId === id || !(await confirm({ title: t('active.confirm.title'), message: t('active.confirm.message'), confirmLabel: t('active.confirm.start'), danger: true })))) {
            navigate('/entreno');
            return;
        }
        actions.startWorkout(id);
        navigate('/entreno');
    };

    return (
        <div className="space-y-6 pb-4">
            <PageHeader tone="violet" title={t('nav.routines')} subtitle={plan ? planName(plan) : undefined} action={
                <Link to="/rutinas/nueva" className="flex items-center gap-1 rounded-full bg-snow px-3.5 py-2 text-sm font-bold text-violet-700 shadow-lg"><Plus size={18} /> {t('routines.new')}</Link>
            }>
                <div className="grid grid-cols-3 gap-2">
                    <HeroStat value={planRoutines.length} label={t('routines.statDays')} />
                    <HeroStat value={plan?.week ?? 1} label={t('routines.statWeek')} />
                    <HeroStat value={custom.length} label={t('routines.statMine')} />
                </div>
            </PageHeader>

            {plan && (
                <Section title={t('routines.yourPlan', { name: planName(plan) })}>
                    <div className="space-y-2">
                        {planRoutines.map((r, i) => (
                            <RoutineRow key={r.id} routine={r} cover={planCovers[i]} index={i} badge={i === plan.nextIndex ? t('routines.next') : undefined} onStart={() => start(r.id)} />
                        ))}
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-white/55"><CalendarSync size={14} className="mt-px shrink-0 text-violet-400" /> {t('plan.weekLine', { week: plan.week ?? 1, phase: t(`plan.phase.${weekPhase(plan.week ?? 1)}`) })}</p>
                    <p className="mt-1 text-xs text-white/40">{t('routines.tapToEdit')}</p>
                </Section>
            )}

            <Section title={t('routines.mine')}>
                {custom.length ? (
                    <div className="space-y-2">
                        {custom.map((r, i) => <RoutineRow key={r.id} routine={r} cover={customCovers[i]} index={i + planRoutines.length} onStart={() => start(r.id)} />)}
                    </div>
                ) : (
                    <Link to="/rutinas/nueva" className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-violet-400/40 bg-violet-500/5 p-4 hover:bg-violet-500/10">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-snow"><Plus size={24} /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{t('routines.createOwn')}</span>
                            <span className="block text-sm text-white/55">{t('routines.createOwnHint')}</span>
                        </span>
                        <ChevronRight className="shrink-0 text-violet-400" />
                    </Link>
                )}
            </Section>

            <Section title={t('learn.title')}>
                <div className="grid grid-cols-2 gap-2">
                    <Explore to="/entrenador" icon={<Bot size={20} />} title={t('trainer.title')} hint={t('trainer.routinesHint')} color="from-violet-500 to-indigo-600 shadow-violet-500/30" photo={namedCover('espalda-5')} />
                    <Explore to="/mujeres" icon={<Sparkles size={20} />} title={t('women.card')} hint={t('women.cardHint')} color="from-pink-500 to-rose-500 shadow-pink-500/30" photo={namedCover('gluteos-1')} />
                    <Explore to="/mama" icon={<Baby size={20} />} title={t('mom.card')} hint={t('mom.cardHint')} color="from-rose-400 to-violet-500 shadow-rose-400/30" photo={namedCover('core-1')} />
                    <Explore to="/entrenadores" icon={<Users size={20} />} title={t('trainers.card')} hint={t('trainers.cardHint')} color="from-sky-500 to-indigo-600 shadow-sky-500/30" photo={namedCover('hombros-1')} />
                    <Explore to="/programas" icon={<Layers size={20} />} title={t('programs.title')} hint={t('programs.hint')} color="from-brand to-amber-500 shadow-brand/30" photo={namedCover('pecho-2')} />
                    <Explore to="/aprende" icon={<GraduationCap size={20} />} title={t('learn.cardTitle')} hint={t('learn.cardHint')} color="from-sky-500 to-blue-600 shadow-sky-500/30" photo={namedCover('isquios-1')} />
                    <Explore to="/ejercicios" icon={<Dumbbell size={20} />} title={t('routines.library')} hint={t('routines.libraryHint')} color="from-emerald-500 to-teal-600 shadow-emerald-500/30" photo={namedCover('gemelos-1')} />
                    <Explore to="/movimiento" icon={<Footprints size={20} />} title={t('move.title')} hint={t('move.card')} color="from-teal-500 to-cyan-600 shadow-teal-500/30" photo={kindPhoto('run')} />
                </div>
            </Section>
        </div>
    );
}
