import { ArrowDown, ArrowUp, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExercisePicker } from '../components/ExercisePicker';
import { getExercise } from '../data/exercises';
import { actions, useStore } from '../store/store';
import type { RoutineExercise } from '../store/types';

const Num = ({ label, value, onChange, min = 0, max = 999 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) => (
    <label className="flex flex-col gap-1">
        <span className="text-[11px] text-white/45">{label}</span>
        <input inputMode="numeric" value={value} aria-label={label}
            onChange={e => {
                const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
                onChange(Math.min(max, Math.max(min, n)));
            }}
            className="w-full rounded-lg bg-ink-3 px-2 py-2 text-center font-semibold tabular-nums outline-none focus:ring-1 focus:ring-brand" />
    </label>
);

export default function RoutineEditor() {
    const { id } = useParams();
    const isNew = id === 'nueva';
    const routine = useStore(s => s.routines.find(r => r.id === id));
    const navigate = useNavigate();
    const [name, setName] = useState(routine?.name ?? '');
    const [items, setItems] = useState<RoutineExercise[]>(routine?.exercises ?? []);
    const [picking, setPicking] = useState(false);

    if (!isNew && !routine) {
        return <p className="p-6 text-center text-white/60">Esta rutina ya no existe.</p>;
    }

    const update = (i: number, patch: Partial<RoutineExercise>) =>
        setItems(list => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
    const move = (i: number, d: -1 | 1) => setItems(list => {
        const j = i + d;
        if (j < 0 || j >= list.length) return list;
        const copy = [...list];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
    });

    const save = () => {
        // A reversed range (typed max below min) is fixed on save, not while typing.
        const exercises = items.map(it => ({ ...it, repMin: Math.min(it.repMin, it.repMax), repMax: Math.max(it.repMin, it.repMax) }));
        actions.saveRoutine({ id: isNew ? undefined : id, name, exercises });
        navigate('/rutinas');
    };

    const remove = () => {
        if (!window.confirm(routine?.source === 'plan' ? 'Esta rutina es parte de tu plan. ¿Quitarla del plan y borrarla?' : '¿Borrar esta rutina?')) return;
        actions.deleteRoutine(id!);
        navigate('/rutinas', { replace: true });
    };

    return (
        <div className="space-y-4 pb-6">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label="Volver" className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <h1 className="flex-1 text-xl font-bold">{isNew ? 'Nueva rutina' : 'Editar rutina'}</h1>
                <button onClick={save} disabled={!name.trim() || items.length === 0} className="btn-primary px-4 py-2">Guardar</button>
            </header>

            <div className="px-4">
                <label className="label mb-2 block" htmlFor="routine-name">Nombre</label>
                <input id="routine-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej.: Pierna y glúteo"
                    className="w-full rounded-xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-brand" />
            </div>

            <ol className="space-y-2 px-4">
                {items.map((it, i) => {
                    const ex = getExercise(it.exerciseId);
                    return (
                        <li key={`${it.exerciseId}-${i}`} className="card p-3">
                            <div className="mb-2 flex items-center gap-1">
                                <p className="min-w-0 flex-1 truncate font-semibold">{ex?.name ?? it.exerciseId}</p>
                                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="rounded-lg p-1.5 text-white/50 hover:bg-ink-3 disabled:opacity-20"><ArrowUp size={16} /></button>
                                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar" className="rounded-lg p-1.5 text-white/50 hover:bg-ink-3 disabled:opacity-20"><ArrowDown size={16} /></button>
                                <button onClick={() => setItems(list => list.filter((_, j) => j !== i))} aria-label="Quitar" className="rounded-lg p-1.5 text-white/50 hover:bg-ink-3 hover:text-red-400"><Trash2 size={16} /></button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <Num label="Series" value={it.sets} min={1} max={10} onChange={n => update(i, { sets: n })} />
                                <Num label={ex?.timed ? 'Seg mín' : 'Reps mín'} value={it.repMin} min={1} onChange={n => update(i, { repMin: n })} />
                                <Num label={ex?.timed ? 'Seg máx' : 'Reps máx'} value={it.repMax} min={1} onChange={n => update(i, { repMax: n })} />
                                <Num label="Descanso s" value={it.restSec} max={600} onChange={n => update(i, { restSec: n })} />
                            </div>
                        </li>
                    );
                })}
            </ol>

            <div className="space-y-2 px-4">
                <button onClick={() => setPicking(true)} className="btn-ghost w-full"><Plus size={18} /> Añadir ejercicio</button>
                {!isNew && <button onClick={remove} className="btn-danger w-full"><Trash2 size={16} /> Borrar rutina</button>}
            </div>

            <ExercisePicker open={picking} onClose={() => setPicking(false)}
                onPick={exerciseId => {
                    const timed = getExercise(exerciseId)?.timed;
                    setItems(list => [...list, { exerciseId, sets: 3, repMin: timed ? 20 : 8, repMax: timed ? 45 : 12, restSec: 90 }]);
                }} />
        </div>
    );
}
