import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { alternativesFor, EXERCISES, MUSCLE_LABEL, type Muscle } from '../data/exercises';
import { Sheet } from './ui';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Search and filter the library. With `swapFor`, alternatives for that
// exercise are listed first.
export const ExercisePicker = ({ open, onClose, onPick, swapFor, title = 'Añadir ejercicio' }: {
    open: boolean;
    onClose: () => void;
    onPick: (exerciseId: string) => void;
    swapFor?: string;
    title?: string;
}) => {
    const [query, setQuery] = useState('');
    const [muscle, setMuscle] = useState<Muscle | 'todos'>('todos');

    const list = useMemo(() => {
        const base = swapFor ? [...alternativesFor(swapFor), ...EXERCISES.filter(e => !alternativesFor(swapFor).includes(e) && e.id !== swapFor)] : EXERCISES;
        const q = normalize(query.trim());
        return base.filter(e => (muscle === 'todos' || e.muscle === muscle) && (!q || normalize(e.name).includes(q)));
    }, [query, muscle, swapFor]);

    const pick = (id: string) => {
        onPick(id);
        setQuery('');
        onClose();
    };

    return (
        <Sheet open={open} onClose={onClose} title={title}>
            <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2.5">
                <Search size={18} className="text-white/40" />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ejercicio"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" aria-label="Buscar ejercicio" />
            </label>
            <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
                {(['todos', ...Object.keys(MUSCLE_LABEL)] as (Muscle | 'todos')[]).map(m => (
                    <button key={m} onClick={() => setMuscle(m)} className={`chip shrink-0 ${muscle === m ? 'chip-on' : ''}`}>
                        {m === 'todos' ? 'Todos' : MUSCLE_LABEL[m]}
                    </button>
                ))}
            </div>
            <ul className="divide-y divide-line">
                {list.map(e => (
                    <li key={e.id}>
                        <button onClick={() => pick(e.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-brand-strong">
                            <span className="font-medium">{e.name}</span>
                            <span className="shrink-0 text-xs text-white/45">{MUSCLE_LABEL[e.muscle]} · {e.equipment}</span>
                        </button>
                    </li>
                ))}
                {list.length === 0 && <li className="py-6 text-center text-sm text-white/50">Sin resultados</li>}
            </ul>
        </Sheet>
    );
};
