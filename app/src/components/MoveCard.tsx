import { ChevronRight, Footprints, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { locale, t } from '../i18n';
import { localDay } from '../lib/activity';
import { fmtNumber } from '../lib/format';
import { stepGoalOf, stepsOn } from '../lib/movement';
import { useStore } from '../store/store';

// Today's steps and last night's sleep, opening the Movement page.
export const MoveCard = () => {
    const state = useStore(s => s);
    const steps = stepsOn(state, localDay(new Date()));
    const goal = stepGoalOf(state);
    const night = state.sleep?.[0];
    const pct = Math.min(100, (steps / goal) * 100);
    return (
        <Link to="/movimiento" className="block overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 p-4 text-snow shadow-lg shadow-teal-500/25 active:scale-[0.99]">
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/15"><Footprints size={22} /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-snow/80">{t('move.title')}</p>
                    <p className="text-xl font-extrabold tabular-nums">{t('steps.todayLabel', { n: fmtNumber(steps) })}</p>
                </div>
                {night && (
                    <span className="flex items-center gap-1 rounded-full bg-black/15 px-2.5 py-1 text-sm font-semibold tabular-nums">
                        <Moon size={14} /> {(night.minutes / 60).toLocaleString(locale(), { maximumFractionDigits: 1 })} h
                    </span>
                )}
                <ChevronRight className="shrink-0" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-snow" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1.5 text-xs text-snow/85">{t('move.card')}</p>
        </Link>
    );
};
