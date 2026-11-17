import { Bot, Crown, Dumbbell, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t, tp } from '../i18n';
import { fmtDate } from '../lib/format';
import { useNow } from '../lib/useNow';
import { useStore } from '../store/store';

// The last days of the free trial, or of a Premium that won't renew: what the
// user has done with it, so the choice to keep it is an informed one.
const DAY = 86_400_000;

export const PremiumKeepCard = () => {
    const premium = useStore(s => s.premium);
    const usage = useStore(s => s.aiUsage);
    const sessions = useStore(s => s.sessions);
    const meals = useStore(s => s.meals);
    const now = useNow(true, 60 * 60_000);
    if (!premium?.active || !premium.expiresAt) return null;
    const left = Date.parse(premium.expiresAt) - now;
    const ending = premium.trial ? left < 3 * DAY : !premium.willRenew && left < 5 * DAY;
    if (!ending || left <= 0) return null;
    const since = now - (premium.trial ? 7 * DAY : 30 * DAY);
    const workouts = sessions.filter(s => Date.parse(s.startedAt) >= since).length;
    const logged = meals.filter(m => Date.parse(m.date) >= since).length;
    const days = Math.max(1, Math.ceil(left / DAY));
    const stat = (Icon: typeof Bot, n: number, label: string) => (
        <div className="rounded-2xl bg-white/[0.06] p-2.5 text-center">
            <Icon size={16} className="mx-auto text-amber-300" />
            <p className="mt-1 text-lg font-extrabold tabular-nums">{n}</p>
            <p className="text-[10.5px] leading-tight text-snow/60">{label}</p>
        </div>
    );
    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1206] via-[#100d0a] to-black p-4 text-snow shadow-xl shadow-black/25 ring-1 ring-amber-400/30">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/25 blur-3xl" />
            <p className="relative flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300"><Crown size={14} /> Premium</p>
            <h2 className="relative mt-1 text-lg font-extrabold leading-snug">
                {premium.trial ? tp('keep.trialEnds', days) : t('keep.ends', { date: fmtDate(premium.expiresAt) })}
            </h2>
            <p className="relative mt-0.5 text-sm text-snow/65">{premium.trial ? t('keep.trialHint') : t('keep.hint')}</p>
            <div className="relative mt-3 grid grid-cols-3 gap-2">
                {stat(Dumbbell, workouts, t('keep.workouts'))}
                {stat(Bot, usage?.used ?? 0, t('keep.ai'))}
                {stat(UtensilsCrossed, logged, t('keep.meals'))}
            </div>
            {!premium.trial && (
                <Link to="/premium" className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 py-3 font-bold text-neutral-900 active:scale-[0.98]">
                    <Crown size={17} /> {t('keep.cta')}
                </Link>
            )}
        </div>
    );
};
