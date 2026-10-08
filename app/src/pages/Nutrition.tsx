import { ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Send, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { PageHeader, Section, Sheet } from '../components/ui';
import { getLang, t } from '../i18n';
import { AiError, aiAvailable, askCoach, estimateMeal, refreshUsage, type CoachContext, type MealEstimate } from '../lib/ai';
import { premiumAvailable } from '../lib/premium';
import { fmtDate, fmtNumber, parseDecimal } from '../lib/format';
import { autoTargets, kcalFromMacros, mealsOn, onDay, sumMacros } from '../lib/nutrition';
import { displayToKg } from '../lib/progression';
import { actions, getState, useStore } from '../store/store';
import type { Macros, Meal } from '../store/types';

const aiErrorText = (e: unknown) => t(`ai.error.${e instanceof AiError ? e.code : 'failed'}`);

// Free uses spent: explain and open the Premium page.
const useAiErrorHandler = () => {
    const navigate = useNavigate();
    return (e: unknown) => {
        toast(aiErrorText(e), 4000);
        if (e instanceof AiError && e.code === 'upgrade' && premiumAvailable()) navigate('/premium');
    };
};

// "3 of 5 free AI uses left this month · Go Premium"
const AiUsageLine = () => {
    const usage = useStore(s => s.aiUsage);
    if (!usage) return null;
    const left = Math.max(usage.limit - usage.used, 0);
    return (
        <p className="text-xs text-white/50">
            {usage.premium ? t('ai.usage.premium', { left, limit: usage.limit }) : t('ai.usage.free', { left, limit: usage.limit })}
            {!usage.premium && premiumAvailable() && <> · <Link to="/premium" className="font-semibold text-brand">{t('premium.cta')}</Link></>}
        </p>
    );
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const dayLabel = (day: Date) => {
    const diff = Math.round((startOfDay(new Date()).getTime() - day.getTime()) / 86_400_000);
    if (diff === 0) return t('nutrition.today');
    if (diff === 1) return t('nutrition.yesterday');
    return fmtDate(day);
};

// ---------- Daily summary ----------

const KcalRing = ({ eaten, target }: { eaten: number; target: number }) => {
    const r = 46, c = 2 * Math.PI * r;
    const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
    const over = target > 0 && eaten > target;
    return (
        <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx={54} cy={54} r={r} fill="none" className="stroke-ink-4" strokeWidth={10} />
                <circle cx={54} cy={54} r={r} fill="none" strokeWidth={10} strokeLinecap="round"
                    strokeDasharray={`${pct * c} ${c}`} className={`transition-[stroke-dasharray] duration-500 ${over ? 'stroke-red-400' : 'stroke-brand'}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums">{fmtNumber(Math.abs(target - eaten))}</span>
                <span className="text-[11px] text-white/50">{over ? t('nutrition.kcalOver') : t('nutrition.kcalLeft')}</span>
            </div>
        </div>
    );
};

const MacroBar = ({ label, eaten, target, color }: { label: string; eaten: number; target: number; color: string }) => (
    <div>
        <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-white/80">{label}</span>
            <span className="tabular-nums text-white/50">{fmtNumber(eaten)} / {fmtNumber(target)} g</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-4">
            <div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${target > 0 ? Math.min((eaten / target) * 100, 100) : 0}%` }} />
        </div>
    </div>
);

const Summary = ({ totals, targets, onEdit }: { totals: Macros; targets: Macros; onEdit: () => void }) => (
    <div className="card p-4">
        <div className="flex items-center gap-4">
            <KcalRing eaten={totals.kcal} target={targets.kcal} />
            <div className="min-w-0 flex-1 space-y-2.5">
                <MacroBar label={t('macro.protein')} eaten={totals.protein} target={targets.protein} color="bg-brand" />
                <MacroBar label={t('macro.carbs')} eaten={totals.carbs} target={targets.carbs} color="bg-sky-400" />
                <MacroBar label={t('macro.fat')} eaten={totals.fat} target={targets.fat} color="bg-amber-300" />
            </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="tabular-nums text-white/60">{t('nutrition.eatenOf', { eaten: fmtNumber(totals.kcal), target: fmtNumber(targets.kcal) })}</span>
            <button onClick={onEdit} className="flex items-center gap-1 text-brand hover:text-brand-strong"><Pencil size={14} /> {t('nutrition.editTargets')}</button>
        </div>
    </div>
);

const WeightPrompt = () => {
    const unit = useStore(s => s.profile?.unit ?? 'kg');
    const [value, setValue] = useState('');
    const save = () => {
        const n = parseDecimal(value);
        if (!Number.isFinite(n) || n < 20 || n > 400) {
            toast(t('bw.invalid'));
            return;
        }
        actions.logBodyWeight(displayToKg(n, unit));
        toast(t('bw.saved'));
    };
    return (
        <div className="card p-4">
            <p className="font-semibold">{t('nutrition.needWeight')}</p>
            <p className="mb-3 text-sm text-white/55">{t('nutrition.needWeightHint')}</p>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); save(); }}>
                <input value={value} onChange={e => setValue(e.target.value)} inputMode="decimal" placeholder={t('bw.placeholder', { unit })} aria-label={t('bw.label')}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                <button className="btn-primary px-4 py-2" disabled={!value.trim()}>{t('common.save')}</button>
            </form>
        </div>
    );
};

// ---------- Targets ----------

const MacroInputs = ({ value, onChange }: { value: Record<keyof Macros, string>; onChange: (v: Record<keyof Macros, string>) => void }) => (
    <div className="grid grid-cols-2 gap-3">
        {(['kcal', 'protein', 'carbs', 'fat'] as const).map(k => (
            <label key={k} className="block">
                <span className="label mb-1 block">{k === 'kcal' ? t('macro.kcal') : `${t(`macro.${k}`)} (g)`}</span>
                <input value={value[k]} onChange={e => onChange({ ...value, [k]: e.target.value })} inputMode="decimal"
                    className="w-full rounded-xl border border-line bg-ink px-3 py-2.5 tabular-nums outline-none focus:border-brand" />
            </label>
        ))}
    </div>
);

const toFields = (m?: Macros) => ({
    kcal: m ? String(m.kcal) : '', protein: m ? String(m.protein) : '', carbs: m ? String(m.carbs) : '', fat: m ? String(m.fat) : '',
});

// Empty macro fields count as 0; empty kcal is worked out from the macros.
const fromFields = (f: Record<keyof Macros, string>): Macros | null => {
    const num = (s: string) => (s.trim() ? parseDecimal(s) : 0);
    const m = { protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat) };
    const kcal = f.kcal.trim() ? parseDecimal(f.kcal) : kcalFromMacros(m);
    const all = [kcal, m.protein, m.carbs, m.fat];
    if (all.some(n => !Number.isFinite(n) || n < 0 || n > 20_000)) return null;
    return { kcal, ...m };
};

const TargetsSheet = ({ open, onClose, current, auto }: { open: boolean; onClose: () => void; current: Macros; auto: Macros | null }) => {
    const [fields, setFields] = useState(toFields(current));
    // Reset only when the sheet opens: `current` is recalculated on every render.
    useEffect(() => { if (open) setFields(toFields(current)); }, [open]);
    const save = () => {
        const m = fromFields(fields);
        if (!m || m.kcal <= 0) {
            toast(t('nutrition.invalidNumbers'));
            return;
        }
        actions.setNutritionTargets(m);
        onClose();
    };
    return (
        <Sheet open={open} onClose={onClose} title={t('nutrition.targets')}>
            <p className="mb-4 text-sm text-white/55">{t('nutrition.targetsHint')}</p>
            <MacroInputs value={fields} onChange={setFields} />
            <div className="mt-5 flex gap-2">
                {auto && (
                    <button className="btn-ghost flex-1" onClick={() => { actions.setNutritionTargets(null); onClose(); }}>
                        <RotateCcw size={16} /> {t('nutrition.useAuto')}
                    </button>
                )}
                <button className="btn-primary flex-1" onClick={save}>{t('common.save')}</button>
            </div>
        </Sheet>
    );
};

// ---------- Adding meals ----------

const EstimateView = ({ estimate }: { estimate: MealEstimate }) => {
    const total = sumMacros(estimate.items);
    return (
        <div className="card mt-4 p-4">
            <p className="font-semibold">{estimate.name}</p>
            <ul className="mt-2 divide-y divide-line text-sm">
                {estimate.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2">
                        <span className="min-w-0 text-white/80">{item.name} <span className="text-white/40">· {fmtNumber(item.grams)} g</span></span>
                        <span className="shrink-0 tabular-nums text-white/60">{fmtNumber(item.kcal)} kcal</span>
                    </li>
                ))}
            </ul>
            <p className="mt-2 border-t border-line pt-2 text-sm font-semibold tabular-nums">
                {t('meal.macrosLine', { kcal: fmtNumber(total.kcal), p: fmtNumber(total.protein), c: fmtNumber(total.carbs), f: fmtNumber(total.fat) })}
            </p>
            {estimate.note && <p className="mt-2 text-xs text-white/50">{estimate.note}</p>}
        </div>
    );
};

const AddMealSheet = ({ open, onClose, day }: { open: boolean; onClose: () => void; day: Date }) => {
    const ai = aiAvailable();
    const onAiError = useAiErrorHandler();
    const [mode, setMode] = useState<'ai' | 'manual'>(ai ? 'ai' : 'manual');
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [estimate, setEstimate] = useState<MealEstimate | null>(null);
    const [name, setName] = useState('');
    const [fields, setFields] = useState(toFields());

    useEffect(() => {
        if (!open) return;
        setMode(ai ? 'ai' : 'manual');
        setText(''); setEstimate(null); setName(''); setFields(toFields());
    }, [open, ai]);

    const runEstimate = async () => {
        setBusy(true);
        try {
            setEstimate(await estimateMeal(getLang(), text.trim()));
        } catch (e) {
            onAiError(e);
        } finally {
            setBusy(false);
        }
    };

    const add = (meal: Omit<Meal, 'id' | 'date'>) => {
        actions.addMeal({ ...meal, date: onDay(day).toISOString() });
        toast(t('meal.added'));
        onClose();
    };

    const addEstimate = () => estimate && add({ name: estimate.name, source: 'ai', ...sumMacros(estimate.items) });

    const editEstimate = () => {
        if (!estimate) return;
        setName(estimate.name);
        setFields(toFields(sumMacros(estimate.items)));
        setMode('manual');
    };

    const addManual = () => {
        const m = fromFields(fields);
        if (!name.trim() || !m) {
            toast(t(name.trim() ? 'nutrition.invalidNumbers' : 'meal.nameRequired'));
            return;
        }
        add({ name, source: estimate ? 'ai' : 'manual', ...m });
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('meal.add')}>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-ink p-1" role="tablist">
                {(['ai', 'manual'] as const).map(m => (
                    <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                        className={`rounded-lg py-2 text-sm font-medium ${mode === m ? 'bg-ink-3 text-white' : 'text-white/50'}`}>
                        {m === 'ai' ? t('meal.withAi') : t('meal.manual')}
                    </button>
                ))}
            </div>

            {mode === 'ai' ? (
                ai ? (
                    <>
                        <label className="label mb-1 block" htmlFor="meal-text">{t('meal.describe')}</label>
                        <textarea id="meal-text" value={text} onChange={e => { setText(e.target.value); setEstimate(null); }} rows={3} maxLength={600}
                            placeholder={t('meal.describePlaceholder')}
                            className="w-full resize-none rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                        {!estimate ? (
                            <button className="btn-primary mt-3 w-full" disabled={busy || text.trim().length < 3} onClick={runEstimate}>
                                <Sparkles size={18} /> {busy ? t('meal.estimating') : t('meal.estimate')}
                            </button>
                        ) : (
                            <>
                                <EstimateView estimate={estimate} />
                                <div className="mt-3 flex gap-2">
                                    <button className="btn-ghost flex-1" onClick={editEstimate}><Pencil size={16} /> {t('common.edit')}</button>
                                    <button className="btn-primary flex-1" onClick={addEstimate}><Plus size={18} /> {t('meal.addThis')}</button>
                                </div>
                            </>
                        )}
                        <p className="mt-3 text-xs text-white/40">{t('meal.aiDisclaimer')}</p>
                        <div className="mt-1"><AiUsageLine /></div>
                    </>
                ) : (
                    <p className="card p-4 text-sm text-white/60">{t('ai.error.unavailable')}</p>
                )
            ) : (
                <>
                    <label className="label mb-1 block" htmlFor="meal-name">{t('meal.name')}</label>
                    <input id="meal-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('meal.namePlaceholder')}
                        className="mb-4 w-full rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                    <MacroInputs value={fields} onChange={setFields} />
                    <p className="mt-2 text-xs text-white/40">{t('meal.kcalHint')}</p>
                    <button className="btn-primary mt-4 w-full" onClick={addManual}><Plus size={18} /> {t('meal.addThis')}</button>
                </>
            )}
        </Sheet>
    );
};

// ---------- AI coach chat ----------

const SUGGESTIONS = ['coach.s1', 'coach.s2', 'coach.s3'] as const;

// Unsent question, kept while the app is open (e.g. across a trip to the Premium page).
let draft = '';

const Coach = ({ context }: { context: CoachContext }) => {
    const chat = useStore(s => s.coachChat);
    const [input, setInputState] = useState(() => draft);
    const setInput = (text: string) => {
        draft = text;
        setInputState(text);
    };
    const [pending, setPending] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const ai = aiAvailable();
    const onAiError = useAiErrorHandler();

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [chat.length, pending]);

    const send = async (raw: string) => {
        const question = raw.trim();
        if (!question || pending) return;
        setPending(question);
        setInput('');
        try {
            const history = [...getState().coachChat, { id: 'pending', role: 'user' as const, text: question, at: '' }];
            const answer = await askCoach(getLang(), context, history);
            actions.addChatMessage('user', question);
            actions.addChatMessage('assistant', answer);
        } catch (e) {
            setInput(question); // nothing is lost: the question goes back in the box
            onAiError(e);
        } finally {
            setPending(null);
        }
    };

    const clear = async () => {
        if (await confirm({ title: t('coach.clearTitle'), message: t('coach.clearMessage'), confirmLabel: t('coach.clear'), danger: true })) actions.clearChat();
    };

    return (
        <div className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand"><Sparkles size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t('coach.title')}</p>
                    <p className="text-xs text-white/50">{t('coach.subtitle')}</p>
                </div>
                {chat.length > 0 && (
                    <button onClick={clear} aria-label={t('coach.clear')} className="rounded-full p-2 text-white/40 hover:bg-ink-3 hover:text-white"><Trash2 size={16} /></button>
                )}
            </div>

            <div ref={listRef} className="max-h-[26rem] space-y-3 overflow-y-auto p-4" aria-live="polite">
                <Bubble role="assistant" text={t('coach.welcome')} />
                {chat.map(m => <Bubble key={m.id} role={m.role} text={m.text} />)}
                {pending && (
                    <>
                        <Bubble role="user" text={pending} />
                        <div className="flex items-center gap-1.5 px-1 text-sm text-white/50" role="status">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />{t('coach.thinking')}
                        </div>
                    </>
                )}
            </div>

            {ai ? (
                <>
                    {chat.length === 0 && !pending && (
                        <div className="flex flex-wrap gap-2 px-4 pb-3">
                            {SUGGESTIONS.map(k => (
                                <button key={k} onClick={() => send(t(k))} className="chip text-left hover:text-white">{t(k)}</button>
                            ))}
                        </div>
                    )}
                    <form className="flex gap-2 border-t border-line p-3" onSubmit={e => { e.preventDefault(); void send(input); }}>
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('coach.placeholder')} aria-label={t('coach.placeholder')} maxLength={1000}
                            className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                        <button className="btn-primary px-3.5 py-2" disabled={!input.trim() || pending !== null} aria-label={t('coach.send')}><Send size={18} /></button>
                    </form>
                </>
            ) : (
                <p className="border-t border-line p-4 text-sm text-white/55">{t('ai.error.unavailable')}</p>
            )}
            {ai && <div className="px-4 pb-1"><AiUsageLine /></div>}
            <p className="px-4 pb-3 text-[11px] text-white/35">{t('coach.disclaimer')}</p>
        </div>
    );
};

const Bubble = ({ role, text }: { role: 'user' | 'assistant'; text: string }) => (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${role === 'user' ? 'rounded-br-md bg-brand text-ink' : 'rounded-bl-md bg-ink-3 text-white/90'}`}>
            {text}
        </p>
    </div>
);

// ---------- Page ----------

export default function Nutrition() {
    const profile = useStore(s => s.profile)!;
    const meals = useStore(s => s.meals);
    const custom = useStore(s => s.nutritionTargets);
    const weightKg = useStore(s => s.bodyWeights[0]?.weightKg ?? null);
    const sessions = useStore(s => s.sessions);
    const [day, setDay] = useState(() => startOfDay(new Date()));
    const [editTargets, setEditTargets] = useState(false);
    const [adding, setAdding] = useState(false);

    // How many AI uses are left this month (free or Premium).
    useEffect(() => {
        if (aiAvailable()) refreshUsage().catch(() => {});
    }, []);

    const auto = weightKg ? autoTargets(profile.goal, weightKg) : null;
    const targets = custom ?? auto;
    const dayMeals = useMemo(() => mealsOn(meals, day), [meals, day]);
    const totals = useMemo(() => sumMacros(dayMeals), [dayMeals]);
    const isToday = day.getTime() === startOfDay(new Date()).getTime();

    const today = new Date();
    const context: CoachContext = {
        goal: profile.goal,
        weightKg,
        targets,
        today: sumMacros(mealsOn(meals, today)),
        trainedToday: sessions.some(s => new Date(s.startedAt).toDateString() === today.toDateString()),
    };

    return (
        <div className="space-y-6">
            <PageHeader title={t('nav.nutrition')} subtitle={t('nutrition.subtitle')} />

            <Section>
                <div className="mb-3 flex items-center justify-between">
                    <button onClick={() => setDay(d => addDays(d, -1))} aria-label={t('nutrition.prevDay')} className="rounded-full p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={20} /></button>
                    <p className="font-semibold">{dayLabel(day)}</p>
                    <button onClick={() => setDay(d => addDays(d, 1))} disabled={isToday} aria-label={t('nutrition.nextDay')} className="rounded-full p-2 text-white/60 hover:bg-ink-3 hover:text-white disabled:opacity-30"><ChevronRight size={20} /></button>
                </div>
                {targets ? <Summary totals={totals} targets={targets} onEdit={() => setEditTargets(true)} /> : <WeightPrompt />}
            </Section>

            <Section title={t('nutrition.meals')} action={<span className="text-xs tabular-nums text-white/45">{fmtNumber(totals.kcal)} kcal</span>}>
                {dayMeals.length > 0 ? (
                    <ul className="card divide-y divide-line">
                        {dayMeals.map(m => (
                            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-1.5 truncate font-medium">
                                        {m.source === 'ai' && <Sparkles size={13} className="shrink-0 text-brand" aria-label={t('meal.fromAi')} />}
                                        <span className="truncate">{m.name}</span>
                                    </p>
                                    <p className="text-xs tabular-nums text-white/50">{t('meal.macrosShort', { p: fmtNumber(m.protein), c: fmtNumber(m.carbs), f: fmtNumber(m.fat) })}</p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold tabular-nums">{fmtNumber(m.kcal)} kcal</span>
                                <button onClick={() => actions.deleteMeal(m.id)} aria-label={t('meal.delete', { name: m.name })} className="rounded p-1 text-white/35 hover:text-red-400"><Trash2 size={15} /></button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="card px-4 py-6 text-center text-sm text-white/50">{t('nutrition.noMeals')}</p>
                )}
                <button className="btn-primary mt-2 w-full" onClick={() => setAdding(true)}><Plus size={18} /> {t('meal.add')}</button>
            </Section>

            <Section title={t('coach.section')}>
                <Coach context={context} />
                {!weightKg && !custom && <p className="mt-2 text-xs text-white/45">{t('coach.weightTip')} <Link to="/progreso" className="text-brand underline">{t('nav.progress')}</Link></p>}
            </Section>

            {targets && <TargetsSheet open={editTargets} onClose={() => setEditTargets(false)} current={targets} auto={auto} />}
            <AddMealSheet open={adding} onClose={() => setAdding(false)} day={day} />
        </div>
    );
}
