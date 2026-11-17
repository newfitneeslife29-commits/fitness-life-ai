import { Bot, Camera, Check, Crown, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../i18n';
import { premiumAvailable, usePremiumActive } from '../lib/premium';

// Premium is offered once the user has felt what the app does: after their
// second finished workout, on the workout summary, once. Not at sign-up.
const KEY = 'fitness-life:premium-nudge';
const shown = () => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return true; }
};
const markShown = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* shown again next time */ }
};

export const PremiumNudge = ({ workouts }: { workouts: number }) => {
    const premium = usePremiumActive();
    const [visible] = useState(() => premiumAvailable() && !premium && workouts >= 2 && !shown());
    const [closed, setClosed] = useState(false);
    if (!visible || closed) return null;
    const close = () => { markShown(); setClosed(true); };
    return (
        <div className="welcome-in relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1206] via-[#0f0d0b] to-black p-5 text-snow shadow-xl shadow-black/30 ring-1 ring-amber-400/30">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-400/25 blur-3xl" />
            <p className="relative flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-300"><Crown size={14} /> {t('nudge.eyebrow')}</p>
            <h2 className="relative mt-1.5 text-xl font-extrabold leading-snug">{t('nudge.title', { n: workouts })}</h2>
            <p className="relative mt-1 text-sm text-snow/70">{t('nudge.text')}</p>
            <ul className="relative mt-3 space-y-2 text-sm">
                {([[Bot, 'nudge.b1'], [UtensilsCrossed, 'nudge.b2'], [Camera, 'nudge.b3'], [Sparkles, 'nudge.b4']] as const).map(([Icon, k]) => (
                    <li key={k} className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300"><Icon size={15} /></span>
                        <span className="text-snow/90">{t(k)}</span>
                    </li>
                ))}
            </ul>
            <Link to="/premium" onClick={markShown} className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 py-3.5 font-bold text-neutral-900 shadow-lg shadow-amber-500/25 active:scale-[0.98]">
                <Crown size={18} /> {t('nudge.cta')}
            </Link>
            <p className="relative mt-2 flex items-center justify-center gap-1 text-xs text-snow/55"><Check size={13} /> {t('nudge.small')}</p>
            <button onClick={close} className="relative mt-1 w-full py-2 text-sm text-snow/55">{t('premium.notNow')}</button>
        </div>
    );
};
