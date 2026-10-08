import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { alternativesFor, equipmentLabel, EXERCISES, exerciseName, MUSCLE_ORDER, muscleLabel, type Muscle } from '../data/exercises';
import { t } from '../i18n';
import { ExerciseDemo } from './ExerciseDemo';
import { Sheet } from './ui';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Search and filter the library. With `swapFor`, alternatives for that
// exercise are listed first.
export const ExercisePicker = ({ open, onClose, onPick, swapFor, title }: {
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
        return base.filter(e => (muscle === 'todos' || e.muscle === muscle) && (!q || normalize(exerciseName(e.id)).includes(q)));
    }, [query, muscle, swapFor]);

    const pick = (id: string) => {
        onPick(id);
        setQuery('');
        onClose();
    };

    return (
        <Sheet open={open} onClose={onClose} title={title ?? t('picker.add')}>
            <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2.5">
                <Search size={18} className="text-white/40" />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={t('picker.search')}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" aria-label={t('picker.search')} />
            </label>
            <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
                {(['todos', ...MUSCLE_ORDER] as (Muscle | 'todos')[]).map(m => (
                    <button key={m} onClick={() => setMuscle(m)} className={`chip shrink-0 ${muscle === m ? 'chip-on' : ''}`}>
                        {m === 'todos' ? t('common.all') : muscleLabel(m)}
                    </button>
                ))}
            </div>
            <ul className="divide-y divide-line">
                {list.map(e => (
                    <li key={e.id}>
                        <button onClick={() => pick(e.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:text-brand-strong">
                            <ExerciseDemo id={e.id} name={exerciseName(e.id)} variant="thumb" />
                            <span className="min-w-0 flex-1 font-medium">{exerciseName(e.id)}</span>
                            <span className="shrink-0 text-xs text-white/45">{muscleLabel(e.muscle)} · {equipmentLabel(e.equipment)}</span>
                        </button>
                    </li>
                ))}
                {list.length === 0 && <li className="py-6 text-center text-sm text-white/50">{t('common.noResults')}</li>}
            </ul>
        </Sheet>
    );
};
