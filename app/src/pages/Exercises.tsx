import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Section } from '../components/ui';
import { EXERCISES, MUSCLE_LABEL, type Muscle } from '../data/exercises';
import { useStore } from '../store/store';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Exercises() {
    const sessions = useStore(s => s.sessions);
    const [query, setQuery] = useState('');
    const done = useMemo(() => new Set(sessions.flatMap(s => s.sets.map(x => x.exerciseId))), [sessions]);

    const groups = useMemo(() => {
        const q = normalize(query.trim());
        const map = new Map<Muscle, typeof EXERCISES>();
        for (const e of EXERCISES) {
            if (q && !normalize(e.name).includes(q)) continue;
            map.set(e.muscle, [...(map.get(e.muscle) ?? []), e]);
        }
        return (Object.keys(MUSCLE_LABEL) as Muscle[]).filter(m => map.has(m)).map(m => [m, map.get(m)!] as const);
    }, [query]);

    return (
        <div className="space-y-5">
            <PageHeader title="Ejercicios" subtitle={`${EXERCISES.length} ejercicios con consejos de técnica`} />
            <Section>
                <label className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2.5">
                    <Search size={18} className="text-white/40" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar" aria-label="Buscar ejercicio"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" />
                </label>
            </Section>
            {groups.map(([muscle, list]) => (
                <Section key={muscle} title={MUSCLE_LABEL[muscle]}>
                    <div className="card divide-y divide-line">
                        {list.map(e => (
                            <Link key={e.id} to={`/ejercicios/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-3">
                                <span className="min-w-0">
                                    <span className="block truncate">{e.name}</span>
                                    <span className="text-xs text-white/45">{e.equipment}{done.has(e.id) ? ' · con historial' : ''}</span>
                                </span>
                                <ChevronRight size={16} className="shrink-0 text-white/30" />
                            </Link>
                        ))}
                    </div>
                </Section>
            ))}
            {groups.length === 0 && <p className="px-4 text-center text-sm text-white/50">Sin resultados</p>}
        </div>
    );
}
