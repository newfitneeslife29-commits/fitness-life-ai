import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Chips, PageHeader, Section } from '../components/ui';
import { pickProgram } from '../data/programs';
import { actions, getSaveError, useStore } from '../store/store';
import type { Goal, Level, Setup } from '../store/types';

export default function Settings() {
    const profile = useStore(s => s.profile)!;
    const plan = useStore(s => s.plan);
    const sessionsCount = useStore(s => s.sessions.length);
    const fileRef = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<string | null>(null);

    const proposed = pickProgram(profile.setup, profile.daysPerWeek);
    const planChanged = plan?.programId !== proposed.id;

    const download = () => {
        const blob = new Blob([actions.exportData()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitness-life-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage('Copia descargada.');
    };

    const restore = async (file: File) => {
        try {
            if (!window.confirm('Esto reemplaza todos tus datos actuales por los de la copia. ¿Continuar?')) return;
            actions.importData(await file.text());
            setMessage('Copia restaurada.');
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
        }
    };

    const regenerate = () => {
        if (!window.confirm('Se creará un plan nuevo con tus ajustes. Tus rutinas propias y tu historial se mantienen. ¿Continuar?')) return;
        actions.regeneratePlan();
        setMessage(`Plan actualizado: ${proposed.name}.`);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Ajustes" />

            <Section title="Perfil">
                <div className="card space-y-5 p-4">
                    <label className="block">
                        <span className="label mb-2 block">Nombre</span>
                        <input value={profile.name} onChange={e => actions.updateProfile({ name: e.target.value })} placeholder="Tu nombre"
                            className="w-full rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                    </label>
                    <div>
                        <p className="label mb-2">Objetivo</p>
                        <Chips<Goal> label="Objetivo" value={profile.goal} onChange={goal => actions.updateProfile({ goal })}
                            options={[{ value: 'musculo', label: 'Músculo' }, { value: 'fuerza', label: 'Fuerza' }, { value: 'salud', label: 'Forma física' }]} />
                    </div>
                    <div>
                        <p className="label mb-2">Nivel</p>
                        <Chips<Level> label="Nivel" value={profile.level} onChange={level => actions.updateProfile({ level })}
                            options={[{ value: 'principiante', label: 'Principiante' }, { value: 'intermedio', label: 'Intermedio' }, { value: 'avanzado', label: 'Avanzado' }]} />
                    </div>
                    <div>
                        <p className="label mb-2">Días por semana</p>
                        <Chips<number> label="Días por semana" value={profile.daysPerWeek} onChange={daysPerWeek => actions.updateProfile({ daysPerWeek })}
                            options={[2, 3, 4, 5, 6].map(d => ({ value: d, label: String(d) }))} />
                    </div>
                    <div>
                        <p className="label mb-2">Material</p>
                        <Chips<Setup> label="Material" value={profile.setup} onChange={setup => actions.updateProfile({ setup })}
                            options={[{ value: 'gimnasio', label: 'Gimnasio' }, { value: 'mancuernas', label: 'Mancuernas' }, { value: 'casa', label: 'Casa' }]} />
                    </div>
                    <div>
                        <p className="label mb-2">Unidades</p>
                        <Chips label="Unidades" value={profile.unit} onChange={unit => actions.updateProfile({ unit })}
                            options={[{ value: 'kg', label: 'kg' }, { value: 'lbs', label: 'lb' }]} />
                    </div>
                </div>
            </Section>

            <Section title="Plan">
                <div className="card p-4">
                    <p className="font-semibold">{plan?.programName ?? 'Sin plan'}</p>
                    <p className="mb-3 text-sm text-white/55">
                        {planChanged ? `Con tus ajustes actuales te encaja «${proposed.name}».` : 'Las series y repeticiones se ajustan a tu objetivo y nivel.'}
                    </p>
                    <button onClick={regenerate} className={planChanged ? 'btn-primary w-full' : 'btn-ghost w-full'}>
                        <RotateCcw size={16} /> {planChanged ? `Cambiar a ${proposed.name}` : 'Regenerar plan'}
                    </button>
                </div>
            </Section>

            <Section title="Tus datos">
                <div className="card space-y-3 p-4">
                    <p className="text-sm text-white/60">
                        Todo se guarda en este dispositivo ({sessionsCount} entrenos). Descarga una copia de vez en cuando para no perder nada si cambias de móvil.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={download} className="btn-ghost"><Download size={16} /> Exportar</button>
                        <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload size={16} /> Importar</button>
                    </div>
                    <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
                    <button onClick={() => window.confirm('¿Borrar todos tus datos de este dispositivo? No se puede deshacer.') && actions.resetAll()}
                        className="btn-danger w-full">Borrar todos los datos</button>
                </div>
                {(message || getSaveError()) && (
                    <p role="status" className="mt-2 text-sm text-white/70">{getSaveError() ? `Error al guardar: ${getSaveError()}` : message}</p>
                )}
            </Section>

            <p className="px-4 pb-4 text-center text-xs text-white/30">Fitness Life · funciona sin conexión · instálala desde el menú del navegador</p>
        </div>
    );
}
