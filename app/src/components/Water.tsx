import { Droplets, GlassWater, Minus, Plus } from 'lucide-react';
import { locale, t } from '../i18n';
import { localDay } from '../lib/activity';
import { haptic } from '../lib/native';
import { GLASS_ML } from '../lib/nutrition';
import { actions, useStore } from '../store/store';

// Water of the day: the target (lib/nutrition.ts waterTargetMl) in glasses,
// filled one tap at a time.

const liters = (ml: number) => (ml / 1000).toLocaleString(locale(), { maximumFractionDigits: 2 });

export const WaterCard = ({ day, targetMl, why }: { day: Date; targetMl: number; why: string }) => {
    const key = localDay(day);
    const drunk = useStore(s => s.water?.[key] ?? 0);
    const glasses = Math.round(targetMl / GLASS_ML);
    const done = Math.floor(drunk / GLASS_ML);
    const pct = Math.min(100, (drunk / targetMl) * 100);
    const reached = drunk >= targetMl;

    const add = (ml: number) => {
        haptic('tap');
        actions.addWater(key, ml);
    };

    return (
        <div className="card overflow-hidden">
            <div className="relative p-4">
                <div aria-hidden className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500/25 to-cyan-400/10 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400"><Droplets size={22} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-2xl font-bold tabular-nums" aria-label={t('water.label', { drunk: liters(drunk), target: liters(targetMl) })}>
                            {liters(drunk)} <span className="text-base font-medium text-white/50">/ {liters(targetMl)} L</span>
                        </p>
                        <p className="text-xs text-white/55">{reached ? t('water.reached') : t('water.left', { n: Math.max(0, glasses - done) })}</p>
                    </div>
                    <button onClick={() => add(-GLASS_ML)} disabled={drunk === 0} aria-label={t('water.remove')}
                        className="rounded-full border border-line p-2 text-white/60 hover:text-white disabled:opacity-30"><Minus size={18} /></button>
                    <button onClick={() => add(GLASS_ML)} aria-label={t('water.add')}
                        className="flex items-center gap-1 rounded-full bg-sky-500 px-3 py-2 text-sm font-semibold text-snow shadow-lg shadow-sky-500/30 active:scale-95">
                        <Plus size={16} /> {t('water.glass')}
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-1 px-4 pb-3" aria-hidden>
                {Array.from({ length: Math.min(glasses, 20) }, (_, i) => (
                    <GlassWater key={i} size={20} className={i < done ? 'text-sky-400' : 'text-white/15'} fill={i < done ? 'currentColor' : 'none'} fillOpacity={0.25} />
                ))}
            </div>
            <p className="border-t border-line px-4 py-2 text-[11px] text-white/45">{why}</p>
        </div>
    );
};
