import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef } from 'react';
import { confirm, toast } from '../components/feedback';
import { Chips, PageHeader, Section } from '../components/ui';
import { saveFile } from '../lib/native';
import { pickProgram } from '../data/programs';
import { actions, getSaveError, useStore } from '../store/store';
import type { Goal, Level, Setup } from '../store/types';

export default function Settings() {
    const profile = useStore(s => s.profile)!;
    const plan = useStore(s => s.plan);
    const sessionsCount = useStore(s => s.sessions.length);
    const fileRef = useRef<HTMLInputElement>(null);

    const proposed = pickProgram(profile.setup, profile.daysPerWeek);
    const planChanged = plan?.programId !== proposed.id;

    const download = async () => {
        try {
            await saveFile(`fitness-life-${new Date().toISOString().slice(0, 10)}.json`, actions.exportData());
            toast('Copia lista');
        } catch {
            toast('No se pudo exportar');
        }
    };

    const restore = async (file: File) => {
        const ok = await confirm({ title: '¿Restaurar esta copia?', message: 'Reemplaza todos tus datos actuales por los de la copia.', confirmLabel: 'Restaurar', danger: true });
        if (!ok) return;
        try {
            actions.importData(await file.text());
            toast('Copia restaurada');
        } catch (e) {
            toast(e instanceof Error ? e.message : 'No se pudo leer el archivo');
        }
    };

    const regenerate = async () => {
        const ok = await confirm({ title: `¿Crear el plan «${proposed.name}»?`, message: 'Tus rutinas propias y tu historial se mantienen.', confirmLabel: 'Crear plan' });
        if (!ok) return;
        actions.regeneratePlan();
        toast(`Plan actualizado: ${proposed.name}`);
    };

    const reset = async () => {
        const ok = await confirm({ title: '¿Borrar todos tus datos?', message: 'Se borran perfil, plan, rutinas e historial de este dispositivo. No se puede deshacer.', confirmLabel: 'Borrar todo', danger: true });
        if (ok) actions.resetAll();
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
                    <button onClick={reset} className="btn-danger w-full">Borrar todos los datos</button>
                </div>
                {getSaveError() && (
                    <p role="alert" className="mt-2 text-sm text-red-400">Error al guardar: {getSaveError()}</p>
                )}
            </Section>

            <p className="px-4 pb-4 text-center text-xs text-white/30">Fitness Life · funciona sin conexión · instálala desde el menú del navegador</p>
        </div>
    );
}
