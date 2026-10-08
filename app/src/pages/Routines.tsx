import { ChevronRight, Dumbbell, Play, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm } from '../components/feedback';
import { Empty, PageHeader, Section } from '../components/ui';
import { exerciseName } from '../data/exercises';
import { t, tp } from '../i18n';
import { planName, routineName } from '../lib/names';
import { actions, useStore } from '../store/store';
import type { Routine } from '../store/types';

const RoutineRow = ({ routine, badge, onStart }: { routine: Routine; badge?: string; onStart: () => void }) => {
    const name = routineName(routine);
    return (
        <div className="card flex items-stretch overflow-hidden">
            <Link to={`/rutinas/${routine.id}`} className="min-w-0 flex-1 p-4 hover:bg-ink-3">
                <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{name}</p>
                    {badge && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">{badge}</span>}
                </div>
                <p className="truncate text-sm text-white/50">
                    {tp('common.exercises', routine.exercises.length)} · {routine.exercises.map(e => exerciseName(e.exerciseId)).slice(0, 3).join(', ')}
                </p>
            </Link>
            <button onClick={onStart} aria-label={t('routines.start', { name })} className="flex w-14 items-center justify-center border-l border-line text-brand hover:bg-ink-3">
                <Play size={20} fill="currentColor" />
            </button>
        </div>
    );
};

export default function Routines() {
    const { plan, routines, active } = useStore();
    const navigate = useNavigate();
    const planRoutines = plan ? plan.routineIds.map(id => routines.find(r => r.id === id)).filter((r): r is Routine => !!r) : [];
    const custom = routines.filter(r => r.source === 'custom');

    const start = async (id: string) => {
        if (active && (active.routineId === id || !(await confirm({ title: t('active.confirm.title'), message: t('active.confirm.message'), confirmLabel: t('active.confirm.start'), danger: true })))) {
            navigate('/entreno');
            return;
        }
        actions.startWorkout(id);
        navigate('/entreno');
    };

    return (
        <div className="space-y-6">
            <PageHeader title={t('nav.routines')} action={
                <Link to="/rutinas/nueva" className="btn-primary px-3 py-2"><Plus size={18} /> {t('routines.new')}</Link>
            } />

            {plan && (
                <Section title={t('routines.yourPlan', { name: planName(plan) })}>
                    <div className="space-y-2">
                        {planRoutines.map((r, i) => (
                            <RoutineRow key={r.id} routine={r} badge={i === plan.nextIndex ? t('routines.next') : undefined} onStart={() => start(r.id)} />
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-white/40">{t('routines.tapToEdit')}</p>
                </Section>
            )}

            <Section title={t('routines.mine')}>
                {custom.length ? (
                    <div className="space-y-2">
                        {custom.map(r => <RoutineRow key={r.id} routine={r} onStart={() => start(r.id)} />)}
                    </div>
                ) : (
                    <Empty icon={<Plus size={28} />} title={t('routines.createOwn')}>
                        <Link to="/rutinas/nueva" className="inline-flex items-center gap-1 text-brand">{t('common.start')} <ChevronRight size={14} /></Link>
                    </Empty>
                )}
            </Section>

            <Section title={t('nav.exercises')}>
                <Link to="/ejercicios" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                    <Dumbbell className="shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">{t('routines.library')}</p>
                        <p className="text-sm text-white/50">{t('routines.libraryHint')}</p>
                    </div>
                    <ChevronRight className="shrink-0 text-white/40" />
                </Link>
            </Section>
        </div>
    );
}
