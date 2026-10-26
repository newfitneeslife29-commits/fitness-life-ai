import { Apple, ArrowRight, ChevronLeft, Crown, Dumbbell, Footprints, GlassWater, LineChart, ListChecks, Play, Settings, ShoppingBag, Sparkles, Trophy, UserCheck, Users, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { t, type Key } from '../i18n';

// The tour of the app: what each part does, one card at a time. Shown once to
// new users after setting up their plan, and any time from Ajustes → Guía.

const STEPS: { id: string; icon: ReactNode; tone: string }[] = [
    { id: 'welcome', icon: <Sparkles size={34} />, tone: 'from-brand via-orange-500 to-amber-500' },
    { id: 'today', icon: <Play size={34} />, tone: 'from-brand via-orange-500 to-amber-500' },
    { id: 'workout', icon: <Dumbbell size={34} />, tone: 'from-red-500 via-orange-600 to-amber-500' },
    { id: 'routines', icon: <ListChecks size={34} />, tone: 'from-violet-600 via-indigo-600 to-fuchsia-600' },
    { id: 'progress', icon: <LineChart size={34} />, tone: 'from-sky-500 via-blue-600 to-indigo-600' },
    { id: 'nutrition', icon: <Apple size={34} />, tone: 'from-emerald-500 via-green-600 to-teal-600' },
    { id: 'water', icon: <GlassWater size={34} />, tone: 'from-sky-400 via-cyan-500 to-teal-500' },
    { id: 'move', icon: <Footprints size={34} />, tone: 'from-amber-600 via-orange-600 to-rose-600' },
    { id: 'challenges', icon: <Trophy size={34} />, tone: 'from-amber-400 via-orange-500 to-red-500' },
    { id: 'community', icon: <Users size={34} />, tone: 'from-rose-500 via-pink-600 to-fuchsia-600' },
    { id: 'trainers', icon: <UserCheck size={34} />, tone: 'from-teal-500 via-emerald-600 to-green-700' },
    { id: 'premium', icon: <Crown size={34} />, tone: 'from-amber-500 via-yellow-500 to-orange-500' },
    { id: 'shop', icon: <ShoppingBag size={34} />, tone: 'from-slate-800 via-slate-900 to-orange-700' },
    { id: 'settings', icon: <Settings size={34} />, tone: 'from-slate-500 via-slate-600 to-slate-700' },
];

const GUIDE_KEY = 'fitness-life:guide-seen';
export const guideSeen = () => {
    try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return true; }
};
const markSeen = () => {
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch { /* shown again next time */ }
};

export const AppGuide = ({ onClose, page = false }: { onClose: () => void; page?: boolean }) => {
    const [i, setI] = useState(0);
    const step = STEPS[i];
    const last = i === STEPS.length - 1;
    const close = () => { markSeen(); onClose(); };
    const k = (part: string) => t(`guide.${step.id}.${part}` as Key);
    return (
        <div role="dialog" aria-modal={!page} aria-label={t('guide.title')}
            className={`${page ? 'min-h-dvh' : 'fixed inset-0 z-[70]'} flex flex-col bg-ink pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]`}>
            <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-white/50">{t('guide.count', { n: i + 1, total: STEPS.length })}</span>
                <button onClick={close} aria-label={page ? t('common.close') : undefined} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-white/60 hover:text-white">
                    {page ? <X size={18} /> : t('guide.skip')}
                </button>
            </div>

            <div key={step.id} className="mx-auto flex w-full max-w-lg flex-1 animate-fade flex-col px-6">
                <div className={`relative mt-2 flex h-48 items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br text-snow shadow-lg ${step.tone}`}>
                    <div aria-hidden className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-snow/15 blur-2xl" />
                    <div aria-hidden className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-black/15 blur-2xl" />
                    <span className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-snow/20 shadow-inner backdrop-blur">{step.icon}</span>
                </div>
                <h2 className="mt-7 text-[1.75rem] font-extrabold leading-tight tracking-tight">{k('title')}</h2>
                <p className="mt-2 text-white/65">{k('text')}</p>
                <ul className="mt-5 space-y-2.5">
                    {[1, 2, 3].map(n => (
                        <li key={n} className="flex gap-3 text-[15px] text-white/80">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                            {k(`p${n}`)}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mx-auto w-full max-w-lg px-6 pb-6 pt-4">
                <div className="mb-5 flex justify-center gap-1.5" aria-hidden>
                    {STEPS.map((s, n) => (
                        <span key={s.id} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-brand' : 'w-1.5 bg-white/20'}`} />
                    ))}
                </div>
                <div className="flex gap-2">
                    {i > 0 && (
                        <button onClick={() => setI(i - 1)} aria-label={t('common.back')} className="btn-ghost px-4"><ChevronLeft size={20} /></button>
                    )}
                    <button onClick={() => (last ? close() : setI(i + 1))} className="btn-primary flex-1 py-4 text-base">
                        {last ? t('guide.done') : t('guide.next')} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
