import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExerciseDemo } from '../components/ExerciseDemo';
import { Section } from '../components/ui';
import { equipmentLabel, EXERCISES, exerciseName, MUSCLE_ORDER, muscleLabel, type Muscle } from '../data/exercises';
import { t, tp } from '../i18n';
import { useStore } from '../store/store';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Exercises() {
    const sessions = useStore(s => s.sessions);
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const done = useMemo(() => new Set(sessions.flatMap(s => s.sets.map(x => x.exerciseId))), [sessions]);

    const groups = useMemo(() => {
        const q = normalize(query.trim());
        const map = new Map<Muscle, typeof EXERCISES>();
        for (const e of EXERCISES) {
            if (q && !normalize(exerciseName(e.id)).includes(q)) continue;
            map.set(e.muscle, [...(map.get(e.muscle) ?? []), e]);
        }
        return MUSCLE_ORDER.filter(m => map.has(m)).map(m => [m, map.get(m)!] as const);
    }, [query]);

    return (
        <div className="space-y-5">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('nav.exercises')}</h1>
                    <p className="text-sm text-white/55">{tp('exercises.subtitle', EXERCISES.length)}</p>
                </div>
            </header>
            <Section>
                <label className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2.5">
                    <Search size={18} className="text-white/40" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('common.search')} aria-label={t('picker.search')}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" />
                </label>
            </Section>
            {groups.map(([muscle, list]) => (
                <Section key={muscle} title={muscleLabel(muscle)}>
                    <div className="card divide-y divide-line">
                        {list.map(e => (
                            <Link key={e.id} to={`/ejercicios/${e.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-ink-3">
                                <ExerciseDemo id={e.id} name={exerciseName(e.id)} variant="thumb" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">{exerciseName(e.id)}</span>
                                    <span className="text-xs text-white/45">{equipmentLabel(e.equipment)}{done.has(e.id) ? ` · ${t('exercises.withHistory')}` : ''}</span>
                                </span>
                                <ChevronRight size={16} className="shrink-0 text-white/30" />
                            </Link>
                        ))}
                    </div>
                </Section>
            ))}
            {groups.length === 0 && <p className="px-4 text-center text-sm text-white/50">{t('common.noResults')}</p>}
        </div>
    );
}
