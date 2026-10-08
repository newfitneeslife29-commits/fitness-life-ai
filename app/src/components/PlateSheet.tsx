import { fmtNumber, fmtWeight } from '../lib/format';
import { BAR, platesFor, warmupSets } from '../lib/plates';
import { kgToDisplay } from '../lib/progression';
import type { Unit } from '../store/types';
import { Sheet } from './ui';

// Plate colours roughly follow competition colour coding.
const COLOR: Record<string, string> = {
    '25': '#ef4444', '20': '#3b82f6', '15': '#eab308', '10': '#22c55e', '5': '#e5e7eb', '2.5': '#9ca3af', '1.25': '#6b7280',
    '45': '#3b82f6', '35': '#eab308',
};

const Bar = ({ perSide, unit }: { perSide: number[]; unit: Unit }) => {
    const max = unit === 'kg' ? 25 : 45;
    return (
        <div className="flex h-24 items-center" aria-hidden>
            <div className="h-2.5 w-8 rounded-l bg-white/40" />
            {/* Drawn from the outer end of the sleeve: lightest plate outside. */}
            {[...perSide].reverse().map((p, i) => {
                const h = 36 + (p / max) * 60;
                return <div key={i} className="mx-px rounded-sm" style={{ width: 12, height: h, background: COLOR[String(p)] ?? '#9ca3af' }} />;
            })}
            <div className="h-2.5 flex-1 rounded-r bg-white/40" />
        </div>
    );
};

const PlateLine = ({ total, unit }: { total: number; unit: Unit }) => {
    const load = platesFor(total, unit);
    return (
        <span className="text-white/60">
            {load.perSide.length ? load.perSide.map(fmtNumber).join(' + ') : 'barra sola'}
            {!load.exact && <span className="text-amber-300"> (≈ {fmtNumber(load.loaded)})</span>}
        </span>
    );
};

export const PlateSheet = ({ open, onClose, weightKg, unit, exerciseName }: {
    open: boolean;
    onClose: () => void;
    weightKg: number;
    unit: Unit;
    exerciseName: string;
}) => {
    const total = kgToDisplay(weightKg, unit);
    const load = platesFor(total, unit);
    const warmups = warmupSets(weightKg, unit);
    return (
        <Sheet open={open} onClose={onClose} title={`Discos · ${exerciseName}`}>
            <p className="label mb-1">Para {fmtWeight(weightKg, unit)}, en cada lado</p>
            <Bar perSide={load.perSide} unit={unit} />
            <p className="mb-1 text-2xl font-bold tabular-nums">
                {load.perSide.length ? load.perSide.map(fmtNumber).join(' + ') : 'Solo la barra'}
            </p>
            <p className="text-sm text-white/50">
                Barra de {BAR[unit]} {unit}.{!load.exact && ` Con estos discos llegas a ${fmtNumber(load.loaded)} ${unit}.`}
            </p>

            {warmups.length > 0 && (
                <>
                    <p className="label mb-2 mt-6">Calentamiento sugerido</p>
                    <ol className="divide-y divide-line rounded-xl border border-line">
                        {warmups.map((w, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                                <span className="font-semibold tabular-nums">{fmtWeight(w.weightKg, unit)} × {w.reps}</span>
                                <PlateLine total={kgToDisplay(w.weightKg, unit)} unit={unit} />
                            </li>
                        ))}
                    </ol>
                    <p className="mt-2 text-xs text-white/40">Las series de calentamiento no cuentan para el volumen ni para los récords.</p>
                </>
            )}
        </Sheet>
    );
};
