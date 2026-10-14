import { BookOpen, ChefHat, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AiUsageLine, useAiErrorHandler } from './AiParts';
import { confirm, toast } from './feedback';
import { Sheet } from './ui';
import { getLang, t } from '../i18n';
import { aiAvailable, estimateMeal } from '../lib/ai';
import { fmtNumber, parseDecimal } from '../lib/format';
import { kcalFromMacros, onDay, sumMacros } from '../lib/nutrition';
import { usePremiumActive } from '../lib/premium';
import { actions, useStore } from '../store/store';
import type { Macros, Recipe } from '../store/types';

// The user's own recipes: ingredients, how to make it and the macros of a
// serving; one tap adds a serving to the day. With Premium the AI can work
// out the macros from the ingredients.

type Fields = { name: string; servings: string; ingredients: string; steps: string } & Record<keyof Macros, string>;

const empty: Fields = { name: '', servings: '1', ingredients: '', steps: '', kcal: '', protein: '', carbs: '', fat: '' };
const fieldsOf = (r: Recipe): Fields => ({
    name: r.name, servings: String(r.servings), ingredients: r.ingredients.join('\n'), steps: r.steps,
    kcal: String(r.kcal), protein: String(r.protein), carbs: String(r.carbs), fat: String(r.fat),
});

const RecipeSheet = ({ open, onClose, recipe }: { open: boolean; onClose: () => void; recipe: Recipe | null }) => {
    const [f, setF] = useState<Fields>(empty);
    const [busy, setBusy] = useState(false);
    const premium = usePremiumActive();
    const onAiError = useAiErrorHandler();
    useEffect(() => { if (open) setF(recipe ? fieldsOf(recipe) : empty); }, [open, recipe]);
    const set = (k: keyof Fields) => (e: { target: { value: string } }) => setF(prev => ({ ...prev, [k]: e.target.value }));

    const servings = Math.max(1, Math.round(parseDecimal(f.servings) || 1));
    const ingredients = f.ingredients.split('\n').map(l => l.trim()).filter(Boolean);

    // The AI estimates the whole recipe; a serving is that divided by the servings.
    const estimate = async () => {
        setBusy(true);
        try {
            const result = await estimateMeal(getLang(), `${f.name}: ${ingredients.join(', ')}`);
            const total = sumMacros(result.items);
            const per = (n: number) => String(Math.round(n / servings));
            setF(prev => ({ ...prev, kcal: per(total.kcal), protein: per(total.protein), carbs: per(total.carbs), fat: per(total.fat) }));
        } catch (e) {
            onAiError(e);
        } finally {
            setBusy(false);
        }
    };

    const save = () => {
        const num = (s: string) => (s.trim() ? parseDecimal(s) : 0);
        const m = { protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat) };
        const kcal = f.kcal.trim() ? num(f.kcal) : kcalFromMacros(m);
        if (!f.name.trim()) return toast(t('meal.nameRequired'));
        if ([kcal, m.protein, m.carbs, m.fat].some(n => !Number.isFinite(n) || n < 0 || n > 20_000)) return toast(t('nutrition.invalidNumbers'));
        actions.saveRecipe({ id: recipe?.id, name: f.name, servings, ingredients, steps: f.steps.trim(), kcal, ...m });
        toast(t('recipes.saved'));
        onClose();
    };

    const input = 'w-full rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand';
    return (
        <Sheet open={open} onClose={onClose} title={recipe ? t('recipes.edit') : t('recipes.new')}>
            <div className="space-y-3">
                <label className="block"><span className="label mb-1 block">{t('recipes.name')}</span>
                    <input value={f.name} onChange={set('name')} placeholder={t('recipes.namePlaceholder')} className={input} /></label>
                <label className="block"><span className="label mb-1 block">{t('recipes.servings')}</span>
                    <input value={f.servings} onChange={set('servings')} inputMode="numeric" className={`${input} w-24`} /></label>
                <label className="block"><span className="label mb-1 block">{t('recipes.ingredients')}</span>
                    <textarea value={f.ingredients} onChange={set('ingredients')} rows={4} placeholder={t('recipes.ingredientsPlaceholder')} className={`${input} resize-none`} /></label>
                <label className="block"><span className="label mb-1 block">{t('recipes.steps')}</span>
                    <textarea value={f.steps} onChange={set('steps')} rows={3} maxLength={2000} placeholder={t('recipes.stepsPlaceholder')} className={`${input} resize-none`} /></label>
                <p className="label">{t('recipes.perServing')}</p>
                <div className="grid grid-cols-2 gap-3">
                    {(['kcal', 'protein', 'carbs', 'fat'] as const).map(k => (
                        <label key={k} className="block">
                            <span className="label mb-1 block">{k === 'kcal' ? t('macro.kcal') : `${t(`macro.${k}`)} (g)`}</span>
                            <input value={f[k]} onChange={set(k)} inputMode="decimal" className={`${input} tabular-nums`} />
                        </label>
                    ))}
                </div>
                {aiAvailable() && premium && (
                    <button className="btn-ghost w-full" disabled={busy || ingredients.length === 0} onClick={estimate}>
                        <Sparkles size={16} /> {busy ? t('meal.estimating') : t('recipes.estimate')}
                    </button>
                )}
                {premium && <AiUsageLine />}
                <button className="btn-primary w-full" onClick={save}>{t('common.save')}</button>
            </div>
        </Sheet>
    );
};

// One empty list for every read: a new [] each time would re-render forever.
const NONE: Recipe[] = [];

export const Recipes = ({ day }: { day: Date }) => {
    const recipes = useStore(s => s.recipes ?? NONE);
    const [editing, setEditing] = useState<Recipe | null>(null);
    const [open, setOpen] = useState(false);
    const [shown, setShown] = useState<string | null>(null);

    const openNew = () => { setEditing(null); setOpen(true); };
    const addServing = (r: Recipe) => {
        actions.addMeal({ name: r.name, source: 'manual', kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, date: onDay(day).toISOString() });
        toast(t('recipes.added', { name: r.name }));
    };
    const remove = async (r: Recipe) => {
        if (await confirm({ title: t('recipes.deleteTitle'), message: t('recipes.deleteMessage', { name: r.name }), confirmLabel: t('common.delete'), danger: true })) actions.deleteRecipe(r.id);
    };

    return (
        <>
            {recipes.length === 0 ? (
                <button onClick={openNew} className="card flex w-full items-center gap-3 p-4 text-left hover:bg-ink-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400"><ChefHat size={22} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{t('recipes.emptyTitle')}</span>
                        <span className="block text-sm text-white/55">{t('recipes.emptyText')}</span>
                    </span>
                    <Plus className="shrink-0 text-brand" />
                </button>
            ) : (
                <ul className="space-y-2">
                    {recipes.map(r => (
                        <li key={r.id} className="card overflow-hidden">
                            <div className="flex items-center gap-3 p-3">
                                <button onClick={() => setShown(shown === r.id ? null : r.id)} aria-expanded={shown === r.id} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400"><BookOpen size={18} /></span>
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold">{r.name}</span>
                                        <span className="block text-xs tabular-nums text-white/50">{t('recipes.serving', { kcal: fmtNumber(r.kcal), p: fmtNumber(r.protein) })}</span>
                                    </span>
                                </button>
                                <button onClick={() => addServing(r)} aria-label={t('recipes.addLabel', { name: r.name })}
                                    className="flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-snow">
                                    <Plus size={14} /> {t('recipes.add')}
                                </button>
                            </div>
                            {shown === r.id && (
                                <div className="border-t border-line px-4 py-3 text-sm">
                                    <p className="text-xs text-white/50">{t('recipes.makes', { n: r.servings })} · {t('meal.macrosLine', { kcal: fmtNumber(r.kcal), p: fmtNumber(r.protein), c: fmtNumber(r.carbs), f: fmtNumber(r.fat) })}</p>
                                    {r.ingredients.length > 0 && (
                                        <ul className="mt-2 space-y-0.5 text-white/75">{r.ingredients.map((i, n) => <li key={n} className="flex gap-1.5"><span aria-hidden className="text-white/35">•</span>{i}</li>)}</ul>
                                    )}
                                    {r.steps && <p className="mt-2 whitespace-pre-line text-white/65">{r.steps}</p>}
                                    <div className="mt-3 flex gap-2">
                                        <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => { setEditing(r); setOpen(true); }}><Pencil size={14} /> {t('common.edit')}</button>
                                        <button onClick={() => remove(r)} aria-label={t('recipes.deleteTitle')} className="rounded-full p-2.5 text-white/40 hover:bg-ink-3 hover:text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                    <li><button onClick={openNew} className="btn-ghost w-full"><Plus size={16} /> {t('recipes.new')}</button></li>
                </ul>
            )}
            <RecipeSheet open={open} onClose={() => setOpen(false)} recipe={editing} />
        </>
    );
};
