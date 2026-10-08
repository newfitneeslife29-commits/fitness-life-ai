import { ChevronLeft, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/feedback';
import { Section, Sheet } from '../components/ui';
import { FOOD_CATEGORIES, FOOD_EMOJI, foodMacros, foodName, foodTags, portionLabel, searchFoods, type Food, type FoodCategory } from '../data/foods';
import { t } from '../i18n';
import { fmtNumber, parseDecimal } from '../lib/format';
import { actions } from '../store/store';

// Food table: what a portion (or 100 g) of common foods brings, and a quick way to log it.

type Sort = 'name' | 'protein' | 'carbs' | 'kcal';
const SORTS: Sort[] = ['name', 'protein', 'carbs', 'kcal'];

const MacroBar = ({ label, grams, kcalShare, color }: { label: string; grams: number; kcalShare: number; color: string }) => (
    <div>
        <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium">{label}</span>
            <span className="tabular-nums text-white/70"><b className="text-white">{fmtNumber(grams)} g</b> · {Math.round(kcalShare * 100)} %</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-ink-4">
            <div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${Math.min(kcalShare * 100, 100)}%` }} />
        </div>
    </div>
);

const FoodSheet = ({ food, onClose }: { food: Food | null; onClose: () => void }) => {
    const [amount, setAmount] = useState<'portion' | '100' | 'custom'>('portion');
    const [custom, setCustom] = useState('');
    useEffect(() => {
        setAmount('portion');
        setCustom('');
    }, [food]);
    if (!food) return null;

    const customGrams = parseDecimal(custom);
    const grams = amount === 'portion' ? food.portion.grams : amount === '100' ? 100 : Number.isFinite(customGrams) && customGrams > 0 ? Math.min(customGrams, 5000) : 0;
    const m = foodMacros(food, grams);
    const energy = m.protein * 4 + m.carbs * 4 + m.fat * 9 || 1;

    const add = () => {
        actions.addMeal({
            name: `${foodName(food)} (${fmtNumber(grams)} g)`, source: 'manual', date: new Date().toISOString(),
            kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat,
        });
        toast(t('meal.added'));
        onClose();
    };

    return (
        <Sheet open onClose={onClose} title={foodName(food)}>
            <p className="mb-4 flex items-center gap-2 text-sm text-white/55">
                <span className="text-xl" aria-hidden>{FOOD_EMOJI[food.category]}</span> {t(`foods.cat.${food.category}`)}
            </p>

            <div role="radiogroup" aria-label={t('foods.amount')} className="mb-3 flex flex-wrap gap-2">
                <button role="radio" aria-checked={amount === 'portion'} onClick={() => setAmount('portion')} className={`chip ${amount === 'portion' ? 'chip-on' : ''}`}>
                    {portionLabel(food)} ({fmtNumber(food.portion.grams)} g)
                </button>
                <button role="radio" aria-checked={amount === '100'} onClick={() => setAmount('100')} className={`chip ${amount === '100' ? 'chip-on' : ''}`}>100 g</button>
                <button role="radio" aria-checked={amount === 'custom'} onClick={() => setAmount('custom')} className={`chip ${amount === 'custom' ? 'chip-on' : ''}`}>{t('foods.custom')}</button>
            </div>
            {amount === 'custom' && (
                <label className="mb-3 flex items-center gap-2">
                    <input autoFocus value={custom} onChange={e => setCustom(e.target.value)} inputMode="decimal" placeholder="150" aria-label={t('foods.grams')}
                        className="w-28 rounded-xl border border-line bg-ink px-3 py-2.5 tabular-nums outline-none focus:border-brand" />
                    <span className="text-white/60">g</span>
                </label>
            )}

            <div className="card mb-4 p-4">
                <p className="text-4xl font-extrabold tabular-nums">{fmtNumber(m.kcal)} <span className="text-base font-medium text-white/50">kcal</span></p>
                <div className="mt-4 space-y-3">
                    <MacroBar label={t('macro.protein')} grams={m.protein} kcalShare={(m.protein * 4) / energy} color="bg-brand" />
                    <MacroBar label={t('macro.carbs')} grams={m.carbs} kcalShare={(m.carbs * 4) / energy} color="bg-sky-400" />
                    <MacroBar label={t('macro.fat')} grams={m.fat} kcalShare={(m.fat * 9) / energy} color="bg-amber-300" />
                </div>
                <p className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
                    <span className="text-white/60">{t('foods.fiber')}</span>
                    <span className="font-semibold tabular-nums">{fmtNumber(m.fiber)} g</span>
                </p>
            </div>

            {foodTags(food).length > 0 && (
                <ul className="mb-4 flex flex-wrap gap-2">
                    {foodTags(food).map(tag => <li key={tag} className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">{t(`foods.tag.${tag}`)}</li>)}
                </ul>
            )}

            <p className="mb-4 text-xs text-white/45">
                {t('foods.per100', { kcal: fmtNumber(food.per100.kcal), p: fmtNumber(food.per100.protein), c: fmtNumber(food.per100.carbs), f: fmtNumber(food.per100.fat) })}
                {food.alcohol && <> {t('foods.alcohol')}</>}
            </p>

            <button className="btn-primary w-full" disabled={grams <= 0} onClick={add}><Plus size={18} /> {t('foods.add')}</button>
        </Sheet>
    );
};

export default function Foods() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<FoodCategory | null>(null);
    const [sort, setSort] = useState<Sort>('name');
    const [per100, setPer100] = useState(false);
    const [open, setOpen] = useState<Food | null>(null);

    const foods = useMemo(() => {
        const list = searchFoods(query, category);
        // Sorted by what the list shows: a serving, or 100 g.
        const shown = (f: Food) => foodMacros(f, per100 ? 100 : f.portion.grams);
        const by: Record<Sort, (a: Food, b: Food) => number> = {
            name: (a, b) => foodName(a).localeCompare(foodName(b)),
            protein: (a, b) => shown(b).protein - shown(a).protein,
            carbs: (a, b) => shown(a).carbs - shown(b).carbs,
            kcal: (a, b) => shown(a).kcal - shown(b).kcal,
        };
        return [...list].sort(by[sort]);
    }, [query, category, sort, per100]);

    return (
        <div className="space-y-4 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight">{t('foods.title')}</h1>
                    <p className="text-sm text-white/50">{t('foods.subtitle', { n: foods.length })}</p>
                </div>
            </header>

            <Section>
                <label className="relative block">
                    <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('foods.search')} aria-label={t('foods.search')}
                        className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-10 pr-10 outline-none focus:border-brand" />
                    {query && (
                        <button onClick={() => setQuery('')} aria-label={t('foods.clear')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/50 hover:text-white"><X size={16} /></button>
                    )}
                </label>
                <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label={t('foods.categories')}>
                    <button role="radio" aria-checked={category === null} onClick={() => setCategory(null)} className={`chip shrink-0 ${category === null ? 'chip-on' : ''}`}>{t('foods.all')}</button>
                    {FOOD_CATEGORIES.map(c => (
                        <button key={c} role="radio" aria-checked={category === c} onClick={() => setCategory(c === category ? null : c)}
                            className={`chip shrink-0 ${category === c ? 'chip-on' : ''}`}>
                            <span aria-hidden>{FOOD_EMOJI[c]}</span> {t(`foods.cat.${c}`)}
                        </button>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-white/60">
                        {t('foods.sortBy')}
                        <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="rounded-lg border border-line bg-ink-2 px-2 py-1.5 text-white outline-none focus:border-brand">
                            {SORTS.map(s => <option key={s} value={s}>{t(`foods.sort.${s}`)}</option>)}
                        </select>
                    </label>
                    <div className="flex rounded-lg bg-ink-3 p-0.5 text-xs font-medium" role="radiogroup" aria-label={t('foods.amount')}>
                        <button role="radio" aria-checked={!per100} onClick={() => setPer100(false)} className={`rounded-md px-2.5 py-1.5 ${!per100 ? 'bg-ink-2 text-white shadow' : 'text-white/55'}`}>{t('foods.perPortion')}</button>
                        <button role="radio" aria-checked={per100} onClick={() => setPer100(true)} className={`rounded-md px-2.5 py-1.5 ${per100 ? 'bg-ink-2 text-white shadow' : 'text-white/55'}`}>100 g</button>
                    </div>
                </div>
            </Section>

            <Section>
                {foods.length > 0 ? (
                    <ul className="card divide-y divide-line">
                        {foods.map(f => {
                            const grams = per100 ? 100 : f.portion.grams;
                            const m = foodMacros(f, grams);
                            return (
                                <li key={f.id}>
                                    <button onClick={() => setOpen(f)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-ink-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-3 text-xl" aria-hidden>{FOOD_EMOJI[f.category]}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">{foodName(f)}</span>
                                            <span className="block truncate text-xs text-white/45">{per100 ? '100 g' : `${portionLabel(f)} · ${fmtNumber(f.portion.grams)} g`}</span>
                                            <span className="mt-1 flex gap-1.5 text-[11px] font-semibold tabular-nums">
                                                <span className="rounded bg-brand-soft px-1.5 py-0.5 text-brand-strong">{t('foods.p')} {fmtNumber(m.protein)} g</span>
                                                <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-sky-500">{t('foods.c')} {fmtNumber(m.carbs)} g</span>
                                                <span className="rounded bg-amber-300/20 px-1.5 py-0.5 text-amber-500">{t('foods.f')} {fmtNumber(m.fat)} g</span>
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-right">
                                            <span className="block font-bold tabular-nums">{fmtNumber(m.kcal)}</span>
                                            <span className="block text-[11px] text-white/45">kcal</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="card px-4 py-8 text-center text-sm text-white/50">{t('foods.none')}</p>
                )}
                <p className="mt-3 text-xs text-white/40">{t('foods.source')}</p>
            </Section>

            <FoodSheet food={open} onClose={() => setOpen(null)} />
        </div>
    );
}
