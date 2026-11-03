import { useState } from 'react';
import { t } from '../i18n';
import { fmtNumber, parseDecimal, typedNumber } from '../lib/format';
import { BAR, percentTable, platesFor } from '../lib/plates';
import { estimate1RM } from '../lib/progression';
import { useStore } from '../store/store';
import type { Unit } from '../store/types';
import { Bar } from './PlateSheet';
import { Sheet } from './ui';

const Field = ({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) => (
    <label className="block min-w-0 flex-1">
        <span className="label mb-1 block">{label}</span>
        <span className="flex items-center gap-2 rounded-xl border border-line bg-ink-3 px-3">
            <input value={value} onChange={e => onChange(e.target.value)} inputMode="decimal" aria-label={label}
                className="w-full min-w-0 flex-1 bg-transparent py-2.5 text-lg font-bold tabular-nums outline-none" size={1} />
            {suffix && <span className="text-sm text-white/50">{suffix}</span>}
        </span>
    </label>
);

const valid = (raw: string) => {
    const n = parseDecimal(raw);
    return raw.trim() !== '' && Number.isFinite(n) && n > 0 ? n : 0;
};

const Plates = ({ unit }: { unit: Unit }) => {
    const [total, setTotal] = useState(typedNumber(unit === 'kg' ? 60 : 135));
    const n = valid(total);
    const load = platesFor(n, unit);
    return (
        <div>
            <Field label={t('calc.total')} value={total} onChange={setTotal} suffix={unit} />
            {n > 0 && (
                <div className="mt-4">
                    <p className="label mb-1">{t('calc.perSide')}</p>
                    <Bar perSide={load.perSide} unit={unit} />
                    <p className="text-2xl font-bold tabular-nums">{load.perSide.length ? load.perSide.map(fmtNumber).join(' + ') : t('plates.justBar')}</p>
                    <p className="text-sm text-white/50">
                        {t('plates.bar', { weight: `${BAR[unit]} ${unit}` })}{!load.exact && ` ${t('plates.closest', { weight: `${fmtNumber(load.loaded)} ${unit}` })}`}
                    </p>
                </div>
            )}
        </div>
    );
};

const Max = ({ unit }: { unit: Unit }) => {
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('5');
    const w = valid(weight);
    const r = Math.min(15, Math.round(valid(reps)));
    // Epley works in any unit: the answer stays in the one typed.
    const max = w > 0 && r > 0 ? estimate1RM(w, r) : 0;
    return (
        <div>
            <div className="flex gap-2">
                <Field label={t('calc.weight')} value={weight} onChange={setWeight} suffix={unit} />
                <Field label={t('calc.reps')} value={reps} onChange={setReps} />
            </div>
            <p className="mt-1.5 text-xs text-white/45">{t('calc.maxHelp')}</p>
            {max > 0 && (
                <div className="mt-4">
                    <p className="label">{t('calc.yourMax')}</p>
                    <p className="text-3xl font-black tabular-nums text-brand">{fmtNumber(max)} {unit}</p>
                    <table className="mt-3 w-full text-sm">
                        <thead><tr className="text-left text-white/45"><th className="py-1 font-medium">%</th><th className="py-1 font-medium">{t('calc.weight')}</th><th className="py-1 text-right font-medium">{t('calc.reps')}</th></tr></thead>
                        <tbody className="divide-y divide-line">
                            {percentTable(max, unit).map(row => (
                                <tr key={row.pct}>
                                    <td className="py-1.5 text-white/60">{row.pct}%</td>
                                    <td className="py-1.5 font-semibold tabular-nums">{fmtNumber(row.weight)} {unit}</td>
                                    <td className="py-1.5 text-right tabular-nums text-white/70">{row.reps}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-2 text-xs text-white/40">{t('calc.maxNote')}</p>
                </div>
            )}
        </div>
    );
};

// Two everyday gym sums: what plates to load, and a max from any set.
export const GymCalculator = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const [tab, setTab] = useState<'plates' | 'max'>('plates');
    return (
        <Sheet open={open} onClose={onClose} title={t('calc.title')}>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ink-3 p-1" role="tablist">
                {(['plates', 'max'] as const).map(k => (
                    <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                        className={`rounded-lg py-2 text-sm font-semibold ${tab === k ? 'bg-brand text-ink' : 'text-white/60'}`}>
                        {t(k === 'plates' ? 'calc.platesTab' : 'calc.maxTab')}
                    </button>
                ))}
            </div>
            {tab === 'plates' ? <Plates unit={unit} /> : <Max unit={unit} />}
        </Sheet>
    );
};
