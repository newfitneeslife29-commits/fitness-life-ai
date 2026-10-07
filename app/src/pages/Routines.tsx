import { ChevronRight, Play, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Empty, PageHeader, Section } from '../components/ui';
import { getExercise } from '../data/exercises';
import { actions, useStore } from '../store/store';
import type { Routine } from '../store/types';

const RoutineRow = ({ routine, badge, onStart }: { routine: Routine; badge?: string; onStart: () => void }) => (
    <div className="card flex items-stretch overflow-hidden">
        <Link to={`/rutinas/${routine.id}`} className="min-w-0 flex-1 p-4 hover:bg-ink-3">
            <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{routine.name}</p>
                {badge && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-strong">{badge}</span>}
            </div>
            <p className="truncate text-sm text-white/50">
                {routine.exercises.length} ejercicios · {routine.exercises.map(e => getExercise(e.exerciseId)?.name).slice(0, 3).join(', ')}
            </p>
        </Link>
        <button onClick={onStart} aria-label={`Empezar ${routine.name}`} className="flex w-14 items-center justify-center border-l border-line text-brand hover:bg-ink-3">
            <Play size={20} fill="currentColor" />
        </button>
    </div>
);

export default function Routines() {
    const { plan, routines, active } = useStore();
    const navigate = useNavigate();
    const planRoutines = plan ? plan.routineIds.map(id => routines.find(r => r.id === id)).filter((r): r is Routine => !!r) : [];
    const custom = routines.filter(r => r.source === 'custom');

    const start = (id: string) => {
        if (active && !window.confirm('Ya tienes un entreno en curso. ¿Descartarlo y empezar este?')) return navigate('/entreno');
        actions.startWorkout(id);
        navigate('/entreno');
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Rutinas" action={
                <Link to="/rutinas/nueva" className="btn-primary px-3 py-2"><Plus size={18} /> Nueva</Link>
            } />

            {plan && (
                <Section title={`Tu plan · ${plan.programName}`}>
                    <div className="space-y-2">
                        {planRoutines.map((r, i) => (
                            <RoutineRow key={r.id} routine={r} badge={i === plan.nextIndex ? 'Siguiente' : undefined} onStart={() => start(r.id)} />
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-white/40">Toca una rutina para cambiar ejercicios, series o descansos.</p>
                </Section>
            )}

            <Section title="Mis rutinas">
                {custom.length ? (
                    <div className="space-y-2">
                        {custom.map(r => <RoutineRow key={r.id} routine={r} onStart={() => start(r.id)} />)}
                    </div>
                ) : (
                    <Empty icon={<Plus size={28} />} title="Crea tu propia rutina">
                        <Link to="/rutinas/nueva" className="inline-flex items-center gap-1 text-brand">Empezar <ChevronRight size={14} /></Link>
                    </Empty>
                )}
            </Section>
        </div>
    );
}
