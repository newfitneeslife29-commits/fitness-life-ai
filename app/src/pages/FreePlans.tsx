import { Check, Plus, Salad, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from '../components/feedback';
import { BackHeader, Chips, Photo, Section } from '../components/ui';
import { dayKcal, FREE_PLANS, kcalOf, planKcal, portionFactor, type FreePlan } from '../data/freePlans';
import { l10n, t } from '../i18n';
import { fmtNumber } from '../lib/format';
import { autoTargets } from '../lib/nutrition';
import { actions, useStore } from '../store/store';

const food = (id: string) => ({ src: `./food/${id}.webp`, position: '50% 50%' });

// Free sample-day nutrition plans, with portions scaled to the user's calories
// and each meal one tap away from today's log.
export default function FreePlans() {
    const profile = useStore(s => s.profile)!;
    const custom = useStore(s => s.nutritionTargets);
    const weightKg = useStore(s => s.bodyWeights[0]?.weightKg ?? null);
    const target = custom?.kcal ?? (weightKg ? autoTargets(profile, weightKg).kcal : null);
    const fitting: FreePlan['id'] = profile.goal === 'grasa' ? 'grasa' : profile.goal === 'musculo' ? 'musculo' : 'equilibrado';
    const [id, setId] = useState<FreePlan['id']>(fitting);
    const [day, setDay] = useState(0);
    const [logged, setLogged] = useState<string[]>([]);
    const plan = FREE_PLANS.find(p => p.id === id)!;
    const factor = target ? portionFactor(planKcal(plan), target) : 1;
    const meals = plan.days[day];

    const log = (i: number) => {
        const m = meals[i];
        const scaled = { protein: m.protein * factor, carbs: m.carbs * factor, fat: m.fat * factor };
        actions.addMeal({ name: l10n(m.name), ...scaled, kcal: kcalOf(scaled), source: 'manual', date: new Date().toISOString() });
        setLogged(l => [...l, `${id}:${day}:${i}`]);
        toast(t('mealPlan.loggedToast', { name: l10n(m.name) }));
    };

    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('freePlans.title')} subtitle={t('freePlans.subtitle')} icon={<Salad size={20} />} />
            <Section>
                <Chips<FreePlan['id']> label={t('freePlans.title')} value={id} onChange={v => { setId(v); setDay(0); }}
                    options={FREE_PLANS.map(p => ({ value: p.id, label: l10n(p.name) }))} />
            </Section>
            <Section>
                <div className="card overflow-hidden">
                    <div className="relative flex min-h-[9rem] flex-col justify-end p-4 text-snow">
                        <Photo photo={food(plan.photo)} />
                        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                        <p className="relative text-xl font-bold">{l10n(plan.name)}{plan.id === fitting && <span className="ml-2 rounded-full bg-good px-2 py-0.5 align-middle text-[11px] font-bold text-snow">{t('freePlans.forYou')}</span>}</p>
                        <p className="relative text-sm text-snow/85">{l10n(plan.summary)}</p>
                    </div>
                    <p className="border-t border-line px-4 py-3 text-sm text-white/70">
                        {target
                            ? factor === 1 ? t('freePlans.fits', { kcal: fmtNumber(target) }) : t('freePlans.scale', { kcal: fmtNumber(target), factor: fmtNumber(factor) })
                            : t('freePlans.noTarget', { kcal: fmtNumber(planKcal(plan)) })}
                    </p>
                </div>
            </Section>
            <Section title={t('freePlans.day', { n: day + 1 })} action={
                <div className="flex gap-1">
                    {plan.days.map((d, i) => (
                        <button key={i} onClick={() => setDay(i)} aria-pressed={day === i}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${day === i ? 'bg-brand text-snow' : 'bg-ink-3 text-white/60'}`}>
                            {t('freePlans.dayShort', { n: i + 1 })} · {fmtNumber(Math.round(dayKcal(d) * factor))}
                        </button>
                    ))}
                </div>
            }>
                <ul className="space-y-2">
                    {meals.map((m, i) => {
                        const done = logged.includes(`${id}:${day}:${i}`);
                        return (
                            <li key={i} className="card p-4">
                                <p className="label">{t(`mealPlan.slot.${m.slot}`)}</p>
                                <p className="mt-0.5 font-semibold">{l10n(m.name)}</p>
                                <p className="mt-1 text-sm text-white/65">{l10n(m.foods)}</p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="text-xs tabular-nums text-white/50">
                                        {fmtNumber(Math.round(kcalOf(m) * factor))} kcal · {t('meal.macrosShort', { p: fmtNumber(Math.round(m.protein * factor)), c: fmtNumber(Math.round(m.carbs * factor)), f: fmtNumber(Math.round(m.fat * factor)) })}
                                    </span>
                                    <button onClick={() => log(i)} disabled={done} className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${done ? 'bg-good/15 text-good' : 'bg-brand-soft text-brand-strong'}`}>
                                        {done ? <Check size={14} /> : <Plus size={14} />} {t(done ? 'freePlans.logged' : 'freePlans.log')}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
                <Link to={`/nutricion/compras?plan=${id}`} className="btn-ghost mt-3 w-full"><ShoppingCart size={16} /> {t('shopping.title')}</Link>
                <p className="mt-3 text-xs text-white/45">{t('freePlans.note')}</p>
            </Section>
        </div>
    );
}
