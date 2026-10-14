import { ChevronLeft, Crown, Dumbbell, House, RotateCcw, Save, Send, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiUsageLine, ChatBubble, PremiumLock, useAiErrorHandler } from '../components/AiParts';
import { confirm, toast } from '../components/feedback';
import { ReportAiButton } from '../components/ReportAi';
import { Chips, Section, Sheet } from '../components/ui';
import { exerciseName, getExercise } from '../data/exercises';
import { getLang, t } from '../i18n';
import { aiAvailable, askTrainer, designRoutine, refreshUsage, type AiRoutine } from '../lib/ai';
import { fmtRange, fmtRest } from '../lib/format';
import { premiumAvailable, refreshPremium, usePremiumActive } from '../lib/premium';
import { routineCatalog, trainerContext } from '../lib/trainer';
import { actions, getState, useStore } from '../store/store';
import type { AppState, Setup } from '../store/types';

// Premium: a personal trainer that knows the user's plan and recent workouts,
// answers questions and designs routines from the app's exercises.

// A fixed empty list: a new [] on every read would re-render forever.
const NO_CHAT: NonNullable<AppState['trainerChat']> = [];
const SUGGESTIONS = ['trainer.s1', 'trainer.s2', 'trainer.s3', 'trainer.s4'] as const;
const IDEAS = ['trainer.idea1', 'trainer.idea2', 'trainer.idea3'] as const;
// Training at home gets its own ideas: no equipment, short and effective.
const HOME_IDEAS = ['trainer.home1', 'trainer.home2', 'trainer.home3', 'trainer.home4'] as const;

// Unsent question, kept while the app is open (e.g. across a trip to the Premium page).
let draft = '';

const RoutineSheet = ({ open, onClose, place: initialPlace }: { open: boolean; onClose: () => void; place: Setup }) => {
    const premium = usePremiumActive();
    const [place, setPlace] = useState<Setup>(initialPlace);
    useEffect(() => { if (open) setPlace(initialPlace); }, [open, initialPlace]);
    const navigate = useNavigate();
    const onAiError = useAiErrorHandler();
    const [request, setRequest] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<AiRoutine | null>(null);

    const generate = async () => {
        if (busy || request.trim().length < 3) return;
        setBusy(true);
        try {
            const state = getState();
            const routine = await designRoutine(getLang(), { ...trainerContext(state), setup: place }, request.trim(), routineCatalog(state, place));
            if (!routine.exercises.length) toast(routine.note || t('trainer.routineEmpty'), 4000);
            setResult(routine.exercises.length ? routine : null);
        } catch (e) {
            onAiError(e);
        } finally {
            setBusy(false);
        }
    };

    const save = () => {
        if (!result) return;
        actions.saveRoutine({ name: result.name || t('trainer.routineDefault'), exercises: result.exercises });
        toast(t('trainer.routineSaved', { name: result.name }));
        onClose();
        navigate('/rutinas');
    };

    return (
        <Sheet open={open} onClose={onClose} title={t('trainer.routineTitle')}>
            {!premium ? (
                <PremiumLock text={t('trainer.locked')} onOpen={onClose} />
            ) : !result ? (
                <>
                    <p className="label mb-2">{t('trainer.where')}</p>
                    <div className="mb-4">
                        <Chips<Setup> label={t('trainer.where')} value={place} onChange={setPlace} options={[
                            { value: 'casa', label: t('trainer.whereHome') },
                            { value: 'mancuernas', label: t('setup.mancuernas.short') },
                            { value: 'gimnasio', label: t('setup.gimnasio.short') },
                        ]} />
                    </div>
                    <label className="label mb-1 block" htmlFor="routine-request">{t('trainer.routineAsk')}</label>
                    <textarea id="routine-request" value={request} onChange={e => setRequest(e.target.value)} rows={3} maxLength={500}
                        placeholder={t('trainer.routinePlaceholder')}
                        className="w-full resize-none rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {(place === 'casa' ? HOME_IDEAS : IDEAS).map(k => <button key={k} onClick={() => setRequest(t(k))} className="chip text-left hover:text-white">{t(k)}</button>)}
                    </div>
                    <button className="btn-primary mt-4 w-full" disabled={busy || request.trim().length < 3} onClick={generate}>
                        <Sparkles size={18} /> {busy ? t('trainer.routineBusy') : t('trainer.routineCreate')}
                    </button>
                    <p className="mt-3 text-xs text-white/40">{t('trainer.routineHint')}</p>
                </>
            ) : (
                <>
                    <p className="text-lg font-bold">{result.name}</p>
                    {result.note && <p className="mb-3 text-sm text-white/65">{result.note}</p>}
                    <ol className="card divide-y divide-line">
                        {result.exercises.map((e, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                <span className="min-w-0 truncate font-medium">{exerciseName(e.exerciseId)}</span>
                                <span className="shrink-0 text-sm tabular-nums text-white/55">
                                    {e.sets} × {fmtRange(e.repMin, e.repMax)}{getExercise(e.exerciseId)?.timed ? ' s' : ''} · {fmtRest(e.restSec)}
                                </span>
                            </li>
                        ))}
                    </ol>
                    <ReportAiButton className="mt-2" report={{
                        kind: 'routine', question: request,
                        content: `${result.name}\n${result.note}\n${result.exercises.map(e => `${exerciseName(e.exerciseId)} ${e.sets}x${e.repMin}-${e.repMax}`).join('\n')}`,
                    }} />
                    <div className="mt-4 flex gap-2">
                        <button className="btn-ghost flex-1" onClick={() => setResult(null)}><RotateCcw size={16} /> {t('trainer.routineAgain')}</button>
                        <button className="btn-primary flex-1" onClick={save}><Save size={16} /> {t('trainer.routineSave')}</button>
                    </div>
                </>
            )}
            {premium && <div className="mt-2"><AiUsageLine /></div>}
        </Sheet>
    );
};

export default function Trainer() {
    const navigate = useNavigate();
    const chat = useStore(s => s.trainerChat ?? NO_CHAT);
    const name = useStore(s => s.profile?.name);
    const [input, setInputState] = useState(() => draft);
    const setInput = (text: string) => {
        draft = text;
        setInputState(text);
    };
    const [pending, setPending] = useState<string | null>(null);
    const [routineOpen, setRoutineOpen] = useState<Setup | null>(null);
    const setup = useStore(s => s.profile?.setup ?? 'gimnasio');
    const listRef = useRef<HTMLDivElement>(null);
    const ai = aiAvailable();
    const premium = usePremiumActive();
    const onAiError = useAiErrorHandler();

    // Whether this user has Premium (store and server) and how many AI uses are left.
    useEffect(() => {
        if (aiAvailable()) refreshUsage().catch(() => {});
        if (premiumAvailable()) refreshPremium().catch(() => {});
    }, []);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [chat.length, pending]);

    const send = async (raw: string) => {
        const question = raw.trim();
        if (!question || pending) return;
        setPending(question);
        setInput('');
        try {
            const state = getState();
            const history = [...(state.trainerChat ?? []), { id: 'pending', role: 'user' as const, text: question, at: '' }];
            const answer = await askTrainer(getLang(), trainerContext(state), history);
            actions.addTrainerMessage('user', question);
            actions.addTrainerMessage('assistant', answer);
        } catch (e) {
            setInput(question); // nothing is lost: the question goes back in the box
            onAiError(e);
        } finally {
            setPending(null);
        }
    };

    const clear = async () => {
        if (await confirm({ title: t('coach.clearTitle'), message: t('coach.clearMessage'), confirmLabel: t('coach.clear'), danger: true })) actions.clearTrainerChat();
    };

    return (
        <div className="space-y-5 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div className="min-w-0 flex-1">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        {t('trainer.title')}
                        <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-400"><Crown size={12} /> Premium</span>
                    </h1>
                    <p className="text-sm text-white/55">{t('trainer.subtitle')}</p>
                </div>
            </header>

            <Section className="space-y-2">
                <button onClick={() => setRoutineOpen('casa')} className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-left text-snow shadow-lg shadow-emerald-500/25 active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/15"><House size={22} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-bold">{t('trainer.homeTitle')}</span>
                        <span className="block text-sm text-snow/90">{t('trainer.homeCard')}</span>
                    </span>
                    <Sparkles className="shrink-0" />
                </button>
                <button onClick={() => setRoutineOpen(setup === 'casa' ? 'gimnasio' : setup)} className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brand to-amber-500 p-4 text-left text-snow shadow-lg shadow-brand/25 active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/15"><Dumbbell size={22} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-bold">{t('trainer.routineTitle')}</span>
                        <span className="block text-sm text-snow/90">{t('trainer.routineCard')}</span>
                    </span>
                    <Sparkles className="shrink-0" />
                </button>
            </Section>

            <Section>
                <div className="card overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-line p-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand"><Sparkles size={20} /></span>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">{t('trainer.chatTitle')}</p>
                            <p className="text-xs text-white/50">{t('trainer.chatSubtitle')}</p>
                        </div>
                        {chat.length > 0 && (
                            <button onClick={clear} aria-label={t('coach.clear')} className="rounded-full p-2 text-white/40 hover:bg-ink-3 hover:text-white"><Trash2 size={16} /></button>
                        )}
                    </div>

                    <div ref={listRef} className="max-h-[30rem] space-y-3 overflow-y-auto p-4" aria-live="polite">
                        <ChatBubble role="assistant" text={t('trainer.welcome', { name: name ? ` ${name}` : '' })} />
                        {chat.map((m, i) => (
                            <ChatBubble key={m.id} role={m.role} text={m.text}
                                report={m.role === 'assistant' ? { kind: 'trainer', content: m.text, question: chat[i - 1]?.role === 'user' ? chat[i - 1].text : '' } : undefined} />
                        ))}
                        {pending && (
                            <>
                                <ChatBubble role="user" text={pending} />
                                <div className="flex items-center gap-1.5 px-1 text-sm text-white/50" role="status">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />{t('trainer.thinking')}
                                </div>
                            </>
                        )}
                    </div>

                    {ai && !premium ? (
                        <div className="border-t border-line p-4"><PremiumLock text={t('trainer.locked')} /></div>
                    ) : ai ? (
                        <>
                            {chat.length === 0 && !pending && (
                                <div className="flex flex-wrap gap-2 px-4 pb-3">
                                    {(setup === 'casa' ? ['trainer.sHome', ...SUGGESTIONS.slice(0, 3)] as const : SUGGESTIONS).map(k => (
                                        <button key={k} onClick={() => send(t(k))} className="chip text-left hover:text-white">{t(k)}</button>
                                    ))}
                                </div>
                            )}
                            <form className="flex gap-2 border-t border-line p-3" onSubmit={e => { e.preventDefault(); void send(input); }}>
                                <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('trainer.placeholder')} aria-label={t('trainer.placeholder')} maxLength={1000}
                                    className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                                <button className="btn-primary px-3.5 py-2" disabled={!input.trim() || pending !== null} aria-label={t('coach.send')}><Send size={18} /></button>
                            </form>
                        </>
                    ) : (
                        <p className="border-t border-line p-4 text-sm text-white/55">{t('ai.error.unavailable')}</p>
                    )}
                    {ai && <div className="px-4 pb-1"><AiUsageLine /></div>}
                    <p className="px-4 pb-3 text-[11px] text-white/35">{t('trainer.disclaimer')}</p>
                </div>
            </Section>

            <RoutineSheet open={routineOpen !== null} place={routineOpen ?? setup} onClose={() => setRoutineOpen(null)} />
        </div>
    );
}
