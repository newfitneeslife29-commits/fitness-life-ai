import { Check, RotateCcw, Share2, ShoppingCart } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '../components/feedback';
import { BackHeader, Section } from '../components/ui';
import { FOOD_EMOJI } from '../data/foods';
import { FREE_PLANS, planKcal, portionFactor } from '../data/freePlans';
import { l10n, t, tp } from '../i18n';
import { autoTargets } from '../lib/nutrition';
import { shareText } from '../lib/native';
import { shoppingList } from '../lib/shopping';
import { actions, useStore } from '../store/store';

// The shopping list of the AI meal plan (?plan=ai) or of a free plan (?plan=<id>).
export default function Shopping() {
    const [params] = useSearchParams();
    const source = params.get('plan') ?? 'ai';
    const mealPlan = useStore(s => s.mealPlan);
    const profile = useStore(s => s.profile)!;
    const custom = useStore(s => s.nutritionTargets);
    const weightKg = useStore(s => s.bodyWeights[0]?.weightKg ?? null);
    const shopping = useStore(s => s.shopping);

    const { list, sections, note } = useMemo(() => {
        if (source === 'ai') {
            if (!mealPlan) return { list: '', sections: [], note: '' };
            const lines = mealPlan.days.flatMap(d => d.meals.flatMap(m => m.foods));
            return { list: `ai:${mealPlan.id}`, sections: shoppingList(lines), note: t('shopping.aiNote') };
        }
        const free = FREE_PLANS.find(p => p.id === source);
        if (!free) return { list: '', sections: [], note: '' };
        const target = custom?.kcal ?? (weightKg ? autoTargets(profile, weightKg).kcal : null);
        const factor = target ? portionFactor(planKcal(free), target) : 1;
        const lines = free.days.flatMap(d => d.map(m => l10n(m.foods)));
        return { list: `free:${free.id}`, sections: shoppingList(lines, (7 / free.days.length) * factor), note: t('shopping.freeNote') };
    }, [source, mealPlan, custom, weightKg, profile]);

    const checked = shopping?.list === list ? shopping.checked : [];
    const total = sections.reduce((n, s) => n + s.items.length, 0);
    const left = sections.reduce((n, s) => n + s.items.filter(i => !checked.includes(i.key)).length, 0);

    const share = async () => {
        const text = sections.map(s => `${FOOD_EMOJI[s.category]} ${t(`foods.cat.${s.category}`)}\n${s.items.map(i => `• ${i.name}${i.amount ? ` — ${i.amount}` : ''}`).join('\n')}`).join('\n\n');
        if ((await shareText(t('shopping.title'), `🛒 ${t('shopping.title')}\n\n${text}`)) === 'copied') toast(t('shopping.copied'));
    };

    return (
        <div className="space-y-4 pb-4">
            <BackHeader title={t('shopping.title')} subtitle={total ? (left ? tp('shopping.left', left) : t('shopping.done')) : undefined} icon={<ShoppingCart size={20} />} />
            {!total ? (
                <Section><p className="card p-6 text-center text-sm text-white/60">{t('shopping.empty')}</p></Section>
            ) : (
                <>
                    <Section>
                        <p className="mb-3 text-sm text-white/60">{note}</p>
                        <div className="flex gap-2">
                            <button onClick={() => void share()} className="btn-primary flex-1"><Share2 size={16} /> {t('shopping.share')}</button>
                            <button onClick={() => actions.clearShopping(list)} disabled={!checked.length} className="btn-ghost flex-1 text-sm"><RotateCcw size={16} /> {t('shopping.clear')}</button>
                        </div>
                    </Section>
                    {sections.map(s => (
                        <Section key={s.category} title={`${FOOD_EMOJI[s.category]} ${t(`foods.cat.${s.category}`)}`}>
                            <ul className="card divide-y divide-line">
                                {s.items.map(i => {
                                    const done = checked.includes(i.key);
                                    return (
                                        <li key={i.key}>
                                            <button role="checkbox" aria-checked={done} onClick={() => actions.toggleShopping(list, i.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${done ? 'border-good bg-good text-ink' : 'border-white/30'}`}>{done && <Check size={14} strokeWidth={3} />}</span>
                                                <span className={`min-w-0 flex-1 ${done ? 'text-white/40 line-through' : ''}`}>{i.name}</span>
                                                {i.amount && <span className={`shrink-0 text-sm tabular-nums ${done ? 'text-white/30' : 'text-white/60'}`}>{i.amount}</span>}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Section>
                    ))}
                </>
            )}
        </div>
    );
}
