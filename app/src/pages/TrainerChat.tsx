import { ChevronLeft, MoreVertical, Send, Video, XCircle } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { confirm, toast } from '../components/feedback';
import { locale, t } from '../i18n';
import { enableChatPush } from '../lib/push';
import { formatMoney } from '../lib/trainers';
import {
    cancelHire, fetchHires, fetchMessages, hireState, markRead, otherSide, PayError, sendMessage, watchMessages, type ChatMessage, type Hire,
} from '../lib/trainerPay';

const day = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
const time = (iso: string) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });

// Links in a message open in the browser (video calls, documents…).
const Linked = ({ text }: { text: string }) => (
    <>
        {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => /^https?:\/\//.test(part)
            ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline">{part}</a>
            : <Fragment key={i}>{part}</Fragment>)}
    </>
);

// The private chat between a client and the trainer they hired.
export default function TrainerChat() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const [hire, setHire] = useState<Hire | null | undefined>(undefined);
    const [messages, setMessages] = useState<ChatMessage[] | null>(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [menu, setMenu] = useState(false);
    const bottom = useRef<HTMLDivElement>(null);

    const add = (m: ChatMessage) => setMessages(list => (list && !list.some(x => x.id === m.id) ? [...list, m] : list));

    useEffect(() => {
        void enableChatPush();
    }, []);

    useEffect(() => {
        let alive = true;
        const load = () => Promise.all([fetchHires(), fetchMessages(id)]).then(([hires, list]) => {
            if (!alive) return;
            setHire(hires.find(h => h.id === id) ?? null);
            setMessages(list);
            void markRead(id).catch(() => {});
        });
        load().catch(() => { if (alive) { setHire(h => h ?? null); setMessages(m => m ?? []); } });
        const stop = watchMessages(id, m => {
            add(m);
            if (!m.mine) void markRead(id).catch(() => {});
        });
        // Live updates can drop on a weak connection: a look every 15 s too.
        const poll = window.setInterval(() => { void fetchMessages(id).then(list => alive && setMessages(list)).catch(() => {}); }, 15_000);
        return () => { alive = false; stop(); window.clearInterval(poll); };
    }, [id]);

    useLayoutEffect(() => {
        bottom.current?.scrollIntoView({ block: 'end' });
    }, [messages?.length]);

    const send = async (e: FormEvent) => {
        e.preventDefault();
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        try {
            add(await sendMessage(id, body));
            setText('');
        } catch {
            toast(t('chat.sendFailed'), 3500);
        } finally {
            setSending(false);
        }
    };

    const cancel = async () => {
        setMenu(false);
        if (!hire || !(await confirm({ title: t('chat.cancelTitle'), message: t('chat.cancelMessage'), confirmLabel: t('chat.cancel'), danger: true }))) return;
        try {
            await cancelHire(hire.id);
            setHire({ ...hire, cancelAtPeriodEnd: true });
            toast(t('chat.canceled'), 4000);
        } catch (e) {
            toast(t(`pay.err.${e instanceof PayError ? e.code : 'failed'}`), 4000);
        }
    };

    const other = hire ? otherSide(hire) : null;
    const state = hire ? hireState(hire) : 'ended';
    const status = !hire ? '' : hire.cancelAtPeriodEnd && hire.periodEnd && state !== 'ended'
        ? t('hire.endsOn', { date: day(hire.periodEnd) })
        : state === 'active' && hire.periodEnd ? t('hire.renewsOn', { date: day(hire.periodEnd) }) : t(`hire.${state}`);

    return (
        <div className="pt-safe mx-auto flex h-dvh max-w-lg flex-col">
            <header className="flex items-center gap-2 border-b border-line px-2 py-2">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                {other && <Avatar src={other.avatar} name={other.name} size={40} />}
                <div className="min-w-0 flex-1">
                    <h1 className="truncate font-bold leading-tight">{other?.name ?? t('chat.title')}</h1>
                    {hire && (
                        <p className="truncate text-xs text-white/55">
                            {status}{hire.role === 'trainer' && hire.amountCents > 0 && ` · ${t('trainers.perMonth', { price: formatMoney(hire.amountCents, hire.currency) })}`}
                        </p>
                    )}
                </div>
                {hire && hire.role === 'client' && state !== 'ended' && !hire.cancelAtPeriodEnd && (
                    <div className="relative">
                        <button onClick={() => setMenu(m => !m)} aria-label={t('chat.options')} aria-expanded={menu} className="rounded-lg p-2 text-white/60 hover:bg-ink-3"><MoreVertical size={20} /></button>
                        {menu && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-xl border border-line bg-ink-2 p-1 shadow-xl">
                                <button onClick={() => void cancel()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 hover:bg-ink-3">
                                    <XCircle size={16} /> {t('chat.cancel')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
                {hire === null && messages !== null ? (
                    <p className="card mt-6 p-6 text-center text-sm text-white/60">{t('chat.notFound')}</p>
                ) : messages === null ? (
                    <div className="space-y-2 pt-4" role="status" aria-label={t('community.loading')}>
                        {[0, 1, 2].map(i => <div key={i} className={`h-10 w-2/3 animate-pulse rounded-2xl bg-ink-3 ${i % 2 ? 'ml-auto' : ''}`} />)}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="mt-8 rounded-2xl border border-brand/30 bg-brand-soft p-5 text-center text-sm text-white/75">
                        <Video size={26} className="mx-auto mb-2 text-brand" />
                        {t(hire?.role === 'trainer' ? 'chat.emptyTrainer' : 'chat.empty')}
                    </div>
                ) : (
                    <ol className="space-y-1.5">
                        {messages.map((m, i) => {
                            const newDay = i === 0 || day(messages[i - 1].createdAt) !== day(m.createdAt);
                            return (
                                <li key={m.id}>
                                    {newDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/40">{day(m.createdAt)}</p>}
                                    <div className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                                        <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.mine ? 'rounded-br-md bg-brand text-ink' : 'rounded-bl-md bg-ink-3 text-white/90'}`}>
                                            <Linked text={m.body} />
                                            <span className={`ml-2 inline-block translate-y-0.5 text-[10px] ${m.mine ? 'text-ink/60' : 'text-white/40'}`}>{time(m.createdAt)}</span>
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
                <div ref={bottom} />
            </main>

            {hire && !hire.open ? (
                <div className="pb-safe border-t border-line px-4 pt-3 text-center text-sm text-white/60">
                    {t('chat.closed')}
                    {hire.role === 'client' && hire.trainerId && (
                        <button onClick={() => navigate('/entrenadores')} className="btn-primary mt-2 w-full">{t('chat.hireAgain')}</button>
                    )}
                </div>
            ) : (
                <form onSubmit={send} className="pb-safe flex items-end gap-2 border-t border-line px-3 pt-2">
                    <label htmlFor="chat-input" className="sr-only">{t('chat.placeholder')}</label>
                    <textarea id="chat-input" value={text} onChange={e => setText(e.target.value)} rows={1} maxLength={2000} placeholder={t('chat.placeholder')}
                        disabled={!hire}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); void send(e); } }}
                        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-line bg-ink-2 px-4 py-2.5 outline-none [field-sizing:content] focus:border-brand" />
                    <button type="submit" disabled={!text.trim() || sending || !hire} aria-label={t('chat.send')}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-ink disabled:opacity-40"><Send size={18} /></button>
                </form>
            )}
        </div>
    );
}
