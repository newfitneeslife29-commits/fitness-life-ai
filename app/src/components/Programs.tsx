import { CalendarDays, Check, ClipboardList, CreditCard, Loader2, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t, tp } from '../i18n';
import { parseDecimal } from '../lib/format';
import { routineName } from '../lib/names';
import { addProgramRoutines, deleteProgram, fetchMyPrograms, saveProgram, setProgramPublished, type MyProgram, type Program } from '../lib/programs';
import { buyProgram, PayError } from '../lib/trainerPay';
import { formatMoney } from '../lib/trainers';
import { useStore } from '../store/store';
import { confirm, toast } from './feedback';
import { Sheet } from './ui';

// Trainers' programs: what clients buy (ProgramsSheet) and what a trainer
// sells (MyPrograms, in the trainer panel).

const Meta = ({ weeks, routines }: { weeks: number; routines: number }) => (
    <span className="flex flex-wrap gap-x-3 text-xs text-white/55">
        <span className="flex items-center gap-1"><CalendarDays size={12} /> {tp('tprog.weeks', weeks)}</span>
        <span className="flex items-center gap-1"><ClipboardList size={12} /> {tp('tprog.routines', routines)}</span>
    </span>
);

export const ProgramsSheet = ({ name, programs, onClose }: { name: string; programs: Program[]; onClose: () => void }) => {
    const account = useStore(s => s.account);
    const [busy, setBusy] = useState<string | null>(null);
    const buy = async (p: Program) => {
        if (!account) {
            toast(t('trainers.needAccount'), 3500);
            return;
        }
        setBusy(p.id);
        try {
            await buyProgram(p.id);
        } catch (e) {
            toast(t(`pay.err.${e instanceof PayError ? e.code : 'failed'}`), 4500);
        } finally {
            setBusy(null);
        }
    };
    const addAgain = async (p: Program) => {
        setBusy(p.id);
        try {
            const title = await addProgramRoutines(p.id);
            if (title) toast(t('tprog.received', { name: title }), 4000);
        } catch {
            toast(t('pay.err.failed'), 3500);
        } finally {
            setBusy(null);
        }
    };
    return (
        <Sheet open onClose={onClose} title={t('tprog.of', { name })}>
            <ul className="space-y-3">
                {programs.map(p => (
                    <li key={p.id} className="card p-4">
                        <p className="font-bold">{p.title}</p>
                        <Meta weeks={p.weeks} routines={p.routineCount} />
                        {p.description && <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{p.description}</p>}
                        {p.owned ? (
                            <>
                                <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-good"><Check size={16} /> {t('tprog.owned')}</p>
                                <button disabled={busy !== null} onClick={() => void addAgain(p)} className="btn-ghost mt-2 w-full text-sm">{t('tprog.addAgain')}</button>
                            </>
                        ) : (
                            <button disabled={busy !== null} onClick={() => void buy(p)} className="btn-primary mt-3 w-full">
                                {busy === p.id ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} {t('tprog.buy', { price: formatMoney(p.priceCents, p.currency) })}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
            <p className="mt-3 text-xs text-white/45">{t('tprog.oneTime')}</p>
        </Sheet>
    );
};

const Editor = ({ trainerId, currency, program, onClose, onSaved }: {
    trainerId: string; currency: string; program: MyProgram | null; onClose: () => void; onSaved: () => void;
}) => {
    const routines = useStore(s => s.routines).filter(r => r.exercises.length > 0);
    const [title, setTitle] = useState(program?.title ?? '');
    const [description, setDescription] = useState(program?.description ?? '');
    const [weeks, setWeeks] = useState(String(program?.weeks ?? 4));
    const [price, setPrice] = useState(program ? String(program.priceCents / 100) : '');
    // Editing: the program keeps its routines unless others are picked.
    const [picked, setPicked] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const cents = Math.round(parseDecimal(price) * 100);
    const weeksN = Math.round(parseDecimal(weeks));
    const chosen = routines.filter(r => picked.includes(r.id));
    const valid = title.trim().length >= 3 && cents >= 100 && weeksN >= 1 && weeksN <= 52 && (chosen.length > 0 || !!program) && chosen.length <= 14;
    const save = async () => {
        setBusy(true);
        try {
            await saveProgram(trainerId, {
                id: program?.id, title, description, weeks: weeksN, priceCents: cents, currency: program?.currency ?? currency,
                routines: chosen.length ? chosen.map(r => ({ name: routineName(r), exercises: r.exercises })) : program!.routines,
            });
            toast(t('tprog.saved'));
            onSaved();
            onClose();
        } catch {
            toast(t('tprog.failed'), 4000);
        } finally {
            setBusy(false);
        }
    };
    const field = 'w-full rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand';
    return (
        <Sheet open onClose={onClose} title={t(program ? 'tprog.edit' : 'tprog.create')}>
            <label className="mb-3 block text-sm">
                <span className="mb-1 block text-white/60">{t('tprog.name')}</span>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} className={field} />
            </label>
            <label className="mb-3 block text-sm">
                <span className="mb-1 block text-white/60">{t('tprog.description')}</span>
                <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={3} className={`${field} resize-none`} />
            </label>
            <div className="mb-3 grid grid-cols-2 gap-2">
                <label className="block text-sm">
                    <span className="mb-1 block text-white/60">{t('tprog.weeksLabel')}</span>
                    <input value={weeks} onChange={e => setWeeks(e.target.value)} inputMode="numeric" className={field} />
                </label>
                <label className="block text-sm">
                    <span className="mb-1 block text-white/60">{t('tprog.price')} ({(program?.currency ?? currency).toUpperCase()})</span>
                    <input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" placeholder="29" className={field} />
                </label>
            </div>
            <p className="mb-2 text-sm text-white/60">{t('tprog.pick')}</p>
            {program && !chosen.length && <p className="mb-2 text-xs text-white/45">{program.routines.map(r => r.name).join(' · ')}</p>}
            <ul className="mb-4 max-h-56 space-y-1.5 overflow-y-auto">
                {routines.map(r => {
                    const on = picked.includes(r.id);
                    return (
                        <li key={r.id}>
                            <button role="checkbox" aria-checked={on} onClick={() => setPicked(p => (on ? p.filter(x => x !== r.id) : [...p, r.id]))}
                                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm ${on ? 'border-brand bg-brand-soft' : 'border-line'}`}>
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? 'border-brand bg-brand text-ink' : 'border-white/40'}`}>{on && <Check size={12} />}</span>
                                <span className="min-w-0 flex-1 truncate">{routineName(r)}</span>
                                <span className="text-xs text-white/45">{tp('common.exercises', r.exercises.length)}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            <button onClick={() => void save()} disabled={!valid || busy} className="btn-primary w-full">{t('tprog.save')}</button>
        </Sheet>
    );
};

// The trainer's programs, with their sales.
export const MyPrograms = ({ trainerId, currency, ready }: { trainerId: string; currency: string; ready: boolean }) => {
    const [list, setList] = useState<MyProgram[] | null>(null);
    const [editing, setEditing] = useState<MyProgram | 'new' | null>(null);
    const load = () => void fetchMyPrograms(trainerId).then(setList, () => setList([]));
    useEffect(load, [trainerId]);
    const remove = async (p: MyProgram) => {
        if (!(await confirm({ title: t('tprog.delete'), message: p.title, confirmLabel: t('tprog.delete'), danger: true }))) return;
        try {
            if (!(await deleteProgram(p.id))) toast(t('tprog.hasBuyers'), 5000);
            load();
        } catch {
            toast(t('tprog.failed'), 4000);
        }
    };
    const toggle = async (p: MyProgram) => {
        await setProgramPublished(p.id, !p.published).catch(() => toast(t('tprog.failed'), 4000));
        load();
    };
    return (
        <div>
            <p className="mb-3 text-sm text-white/60">{t('tprog.mineHint')}</p>
            {list === null ? (
                <div className="h-16 animate-pulse rounded-xl bg-ink-3" role="status" aria-label={t('community.loading')} />
            ) : list.length === 0 ? (
                <p className="mb-3 text-sm text-white/45">{t('tprog.none')}</p>
            ) : (
                <ul className="mb-3 space-y-2">
                    {list.map(p => (
                        <li key={p.id} className="card p-3" aria-label={p.title}>
                            <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{p.title}</p>
                                    <Meta weeks={p.weeks} routines={p.routines.length} />
                                    <p className="mt-1 text-xs text-white/55">
                                        {formatMoney(p.priceCents, p.currency)} · {tp('tprog.sales', p.sales)} · <span className={p.published ? 'text-good' : 'text-amber-400'}>{t(p.published ? 'tprog.onSale' : 'tprog.paused')}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 flex gap-1.5">
                                <button onClick={() => setEditing(p)} className="btn-ghost flex-1 py-1.5 text-xs"><Pencil size={14} /> {t('tprog.edit')}</button>
                                <button onClick={() => void toggle(p)} className="btn-ghost flex-1 py-1.5 text-xs">
                                    {p.published ? <Pause size={14} /> : <Play size={14} />} {t(p.published ? 'tprog.pause' : 'tprog.resume')}
                                </button>
                                <button onClick={() => void remove(p)} aria-label={t('tprog.delete')} className="rounded-xl p-2 text-white/40 hover:text-red-400"><Trash2 size={16} /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <button onClick={() => setEditing('new')} disabled={!ready} className="btn-primary w-full"><Plus size={16} /> {t('tprog.create')}</button>
            {editing && (
                <Editor trainerId={trainerId} currency={currency} program={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
            )}
        </div>
    );
};
