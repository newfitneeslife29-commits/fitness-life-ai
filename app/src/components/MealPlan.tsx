import { Bell, Check, Plus, RotateCcw, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { AiUsageLine, PremiumLock, useAiErrorHandler } from './AiParts';
import { confirm, toast } from './feedback';
import { ReportAiButton } from './ReportAi';
import { Chips, Sheet } from './ui';
import { getLang, locale, t } from '../i18n';
import { aiAvailable, designMealPlan, type CoachContext } from '../lib/ai';
import { fmtDate, fmtNumber } from '../lib/format';
import { uid } from '../lib/id';
import { dayTotals, loggedKeys, mealDate, planDayOf, planKey } from '../lib/mealplan';
import { isNative } from '../lib/native';
import { usePremiumActive } from '../lib/premium';
import { actions, useStore } from '../store/store';
import type { MealPlan, PlannedMeal } from '../store/types';

// Premium: the AI plans a week of meals for the user's targets. The plan is
// saved and shown day by day, in order, like the training plan.

const IDEAS = ['mealPlan.idea1', 'mealPlan.idea2', 'mealPlan.idea3', 'mealPlan.idea4'] as const;

// "lun", "mar"… in the app's language (1 Jan 2024 was a Monday).
const weekdayShort = (day: number) => new Date(2024, 0, 1 + day).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '');
const weekdayLong = (day: number) => {
    const name = new Date(2024, 0, 1 + day).toLocaleDateString(locale(), { weekday: 'long' });
    return name.charAt(0).toLocaleUpperCase(locale()) + name.slice(1);
};

// Non-breaking spaces keep each amount together ("G 18 g") on one line.
const macrosLine = (m: { kcal: number; protein: number; carbs: number; fat: number }) =>
    t('meal.macrosLine', { kcal: fmtNumber(m.kcal), p: fmtNumber(m.protein), c: fmtNumber(m.carbs), f: fmtNumber(m.fat) })
        .replace(/(\d) (g|kcal)\b/g, '$1\u00a0$2').replace(/(^|\s)(\p{L}) (\d)/gu, '$1$2\u00a0$3');

const dayText = (plan: MealPlan, day: number) => [
    plan.name, weekdayLong(day),
    ...plan.days[day].meals.map(m => `${m.time} ${m.name}: ${m.foods.join(', ')} (${m.kcal} kcal)`),
].join('\n');

const MealPlanSheet = ({ open, onClose, context }: { open: boolean; onClose: () => void; context: CoachContext }) => {
    const premium = usePremiumActive();
    const onAiError = useAiErrorHandler();
    const [perDay, setPerDay] = useState(4);
    const [request, setRequest] = useState('');
    const [busy, setBusy] = useState(false);

    const addIdea = (idea: string) => setRequest(r => (r.includes(idea) ? r : [r.trim(), idea].filter(Boolean).join(', ')));

    const create = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const result = await designMealPlan(getLang(), context, request.trim(), perDay);
            if (!result.days.length) {
                toast(result.note || t('mealPlan.empty'), 4000);
                return;
            }
            // Only the plan: the answer also carries the AI usage counter.
            const { name, note, days } = result;
            actions.setMealPlan({ id: uid(), request: request.trim(), createdAt: new Date().toISOString(), name, note, days });
            toast(t('mealPlan.saved'));
            setRequest('');
            onClose();
        } catch (e) {
            onAiError(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('mealPlan.createTitle')}>
            {!premium ? (
                <PremiumLock text={t('mealPlan.locked')} onOpen={onClose} />
            ) : !aiAvailable() ? (
                <p className="card p-4 text-sm text-white/60">{t('ai.error.unavailable')}</p>
            ) : (
                <>
                    <p className="mb-4 text-sm text-white/60">{t('mealPlan.createHint')}</p>
                    <p className="label mb-2">{t('mealPlan.perDay')}</p>
                    <div className="mb-4">
                        <Chips<number> label={t('mealPlan.perDay')} value={perDay} onChange={setPerDay}
                            options={[3, 4, 5].map(n => ({ value: n, label: t('mealPlan.perDayN', { n }) }))} />
                    </div>
                    <label className="label mb-1 block" htmlFor="mealplan-request">{t('mealPlan.ask')}</label>
                    <textarea id="mealplan-request" value={request} onChange={e => setRequest(e.target.value)} rows={3} maxLength={500}
                        placeholder={t('mealPlan.placeholder')}
                        className="w-full resize-none rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {IDEAS.map(k => <button key={k} onClick={() => addIdea(t(k))} className="chip text-left hover:text-white">{t(k)}</button>)}
                    </div>
                    {!context.targets && <p className="mt-3 text-xs text-warn">{t('mealPlan.noTargets')}</p>}
                    <button className="btn-primary mt-4 w-full" disabled={busy} onClick={create}>
                        <Sparkles size={18} /> {busy ? t('mealPlan.busy') : t('mealPlan.create')}
                    </button>
                    <p className="mt-3 text-xs text-white/40">{t('mealPlan.disclaimer')}</p>
                    <div className="mt-1"><AiUsageLine /></div>
                </>
            )}
        </Sheet>
    );
};

const PlannedMealRow = ({ meal, logged, onLog }: { meal: PlannedMeal; logged: boolean; onLog?: () => void }) => (
    <li className="flex gap-3 px-4 py-3">
        <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-brand">{meal.time}</span>
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{t(`mealPlan.slot.${meal.slot}`)}</p>
            <p className="font-semibold">{meal.name}</p>
            {meal.foods.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-white/70">
                    {meal.foods.map((f, i) => <li key={i} className="flex gap-1.5"><span aria-hidden className="text-white/35">•</span>{f}</li>)}
                </ul>
            )}
            <p className="mt-1 text-xs tabular-nums text-white/45">{macrosLine(meal)}</p>
        </div>
        {onLog && (
            logged ? (
                <span className="flex h-9 shrink-0 items-center gap-1 self-center rounded-full bg-good/15 px-3 text-xs font-semibold text-good"><Check size={14} /> {t('mealPlan.logged')}</span>
            ) : (
                <button onClick={onLog} aria-label={t('mealPlan.logLabel', { name: meal.name })}
                    className="flex h-9 shrink-0 items-center gap-1 self-center rounded-full bg-brand-soft px-3 text-xs font-semibold text-brand hover:bg-brand hover:text-snow">
                    <Plus size={14} /> {t('mealPlan.log')}
                </button>
            )
        )}
    </li>
);

export const MealPlanSection = ({ context }: { context: CoachContext }) => {
    const plan = useStore(s => s.mealPlan ?? null);
    const meals = useStore(s => s.meals);
    const reminders = useStore(s => s.profile?.mealReminders !== false);
    const today = planDayOf(new Date());
    const [day, setDay] = useState(today);
    const [open, setOpen] = useState(false);

    const sheet = <MealPlanSheet open={open} onClose={() => setOpen(false)} context={context} />;

    if (!plan) {
        return (
            <>
                <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-left text-snow shadow-lg shadow-emerald-500/25 active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/15"><UtensilsCrossed size={22} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-bold">{t('mealPlan.ctaTitle')}</span>
                        <span className="block text-sm text-snow/90">{t('mealPlan.ctaText')}</span>
                    </span>
                    <Sparkles className="shrink-0" />
                </button>
                {sheet}
            </>
        );
    }

    const menu = plan.days[day]?.meals ?? [];
    const logged = loggedKeys(meals, new Date());

    const log = (meal: PlannedMeal, index: number) => {
        const { slot: _slot, time, foods: _foods, ...rest } = meal;
        actions.addMeal({ ...rest, source: 'ai', planKey: planKey(plan, day, index), date: mealDate(new Date(), time).toISOString() });
        toast(t('mealPlan.loggedToast', { name: meal.name }));
    };

    const replace = async () => {
        if (await confirm({ title: t('mealPlan.newTitle'), message: t('mealPlan.newMessage'), confirmLabel: t('mealPlan.newConfirm') })) setOpen(true);
    };

    const remove = async () => {
        if (await confirm({ title: t('mealPlan.deleteTitle'), message: t('mealPlan.deleteMessage'), confirmLabel: t('common.delete'), danger: true })) {
            actions.setMealPlan(null);
        }
    };

    return (
        <div className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><UtensilsCrossed size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{plan.name || t('mealPlan.defaultName')}</p>
                    <p className="text-xs text-white/50">{t('mealPlan.createdOn', { date: fmtDate(plan.createdAt) })}</p>
                </div>
            </div>

            <div className="flex gap-1 overflow-x-auto px-3 pt-3" role="tablist" aria-label={t('mealPlan.days')}>
                {plan.days.map((_, i) => (
                    <button key={i} role="tab" aria-selected={day === i} aria-label={weekdayLong(i)} onClick={() => setDay(i)}
                        className={`relative min-w-11 flex-1 rounded-xl py-2 text-sm font-semibold capitalize ${day === i ? 'bg-brand text-snow' : 'bg-ink-3 text-white/60 hover:text-white'}`}>
                        {weekdayShort(i)}
                        {i === today && <span aria-hidden className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${day === i ? 'bg-snow' : 'bg-brand'}`} />}
                    </button>
                ))}
            </div>

            <p className="px-4 pt-3 text-sm font-semibold">{day === today ? t('mealPlan.todayMenu') : weekdayLong(day)}</p>
            <ol className="divide-y divide-line">
                {menu.map((meal, i) => (
                    <PlannedMealRow key={i} meal={meal} logged={logged.has(planKey(plan, day, i))} onLog={day === today ? () => log(meal, i) : undefined} />
                ))}
            </ol>
            <p className="border-t border-line px-4 py-3 text-sm font-semibold tabular-nums">{t('mealPlan.dayTotal', { line: macrosLine(dayTotals(menu)) })}</p>

            {plan.note && <p className="px-4 pb-3 text-sm text-white/60">{plan.note}</p>}

            <div className="flex items-center gap-3 border-t border-line p-4">
                <Bell size={20} className="shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                    <p className="font-medium">{t('mealPlan.reminders')}</p>
                    <p className="text-sm text-white/55">{isNative() ? t('mealPlan.remindersHint') : t('mealPlan.remindersWeb')}</p>
                </div>
                <button role="switch" aria-checked={reminders} aria-label={t('mealPlan.reminders')} onClick={() => actions.updateProfile({ mealReminders: !reminders })}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${reminders ? 'bg-brand' : 'bg-ink-4'}`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${reminders ? 'left-6' : 'left-1'}`} />
                </button>
            </div>

            <div className="flex items-center gap-2 border-t border-line p-3">
                <button className="btn-ghost flex-1 py-2 text-sm" onClick={replace}><RotateCcw size={16} /> {t('mealPlan.new')}</button>
                <button onClick={remove} aria-label={t('mealPlan.deleteTitle')} className="rounded-full p-2.5 text-white/40 hover:bg-ink-3 hover:text-red-400"><Trash2 size={18} /></button>
            </div>
            <div className="px-4 pb-3">
                <ReportAiButton report={{ kind: 'mealplan', question: plan.request, content: dayText(plan, day) }} />
                <p className="mt-1 text-[11px] text-white/35">{t('mealPlan.disclaimer')}</p>
            </div>
            {sheet}
        </div>
    );
};
