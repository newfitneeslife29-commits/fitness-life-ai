import { Medal, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { confirm, toast } from '../components/feedback';
import { BackHeader, Section, Sheet } from '../components/ui';
import { t, tp } from '../i18n';
import {
    CHALLENGES, challengeGoal, challengeName, challengeStatus, fetchBoard, fetchPeople, leaveBoard, type BoardRow,
} from '../lib/challenges';
import { publicUrl } from '../lib/community';
import { haptic } from '../lib/native';
import { actions, useStore } from '../store/store';
import type { JoinedChallenge } from '../store/types';

const NONE: JoinedChallenge[] = [];

const Board = ({ id, onClose }: { id: string; onClose: () => void }) => {
    const account = useStore(s => s.account);
    const [rows, setRows] = useState<BoardRow[] | null>(null);
    useEffect(() => {
        if (!account) return;
        void fetchBoard(id).then(setRows, () => setRows([]));
    }, [id, account?.id]);
    return (
        <Sheet open onClose={onClose} title={`${t('challenges.board')} · ${challengeName(id)}`}>
            {!account ? (
                <div className="py-4 text-center">
                    <p className="mb-3 text-sm text-white/60">{t('challenges.boardAccount')}</p>
                    <Link to="/cuenta" className="btn-primary w-full">{t('account.cta')}</Link>
                </div>
            ) : rows === null ? (
                <div className="h-16 animate-pulse rounded-xl bg-ink-3" role="status" aria-label={t('community.loading')} />
            ) : rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/55">{t('challenges.boardEmpty')}</p>
            ) : (
                <ol className="space-y-1.5">
                    {rows.map(r => (
                        <li key={r.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.me ? 'bg-brand-soft' : 'bg-ink-3'}`}>
                            <span className={`w-7 text-center font-black tabular-nums ${r.rank <= 3 ? 'text-amber-300' : 'text-white/50'}`}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
                            <Avatar src={publicUrl(r.avatarPath, r.avatarUpdated ?? undefined)} name={r.name || '?'} size={32} />
                            <span className="min-w-0 flex-1 truncate font-semibold">{r.me ? t('challenges.you') : r.name || '—'}</span>
                            <span className="font-bold tabular-nums">{r.progress}</span>
                        </li>
                    ))}
                </ol>
            )}
        </Sheet>
    );
};

// 30-day challenges: join, see the progress and the leaderboard.
export default function Challenges() {
    const joined = useStore(s => s.challenges) ?? NONE;
    const sessions = useStore(s => s.sessions);
    const cardio = useStore(s => s.cardio);
    const steps = useStore(s => s.steps);
    const activeDays = useStore(s => s.activeDays);
    const [people, setPeople] = useState<Record<string, number>>({});
    const [board, setBoard] = useState<string | null>(null);
    useEffect(() => {
        void fetchPeople().then(setPeople).catch(() => {});
    }, []);

    const data = useMemo(() => ({ sessions, cardio, steps, activeDays }), [sessions, cardio, steps, activeDays]);
    // Joined ones first.
    const list = [...CHALLENGES].sort((a, b) => Number(joined.some(j => j.id === b.id)) - Number(joined.some(j => j.id === a.id)));

    const join = (id: string) => {
        haptic('success');
        actions.joinChallenge(id);
        toast(t('challenges.joined'), 3000);
    };
    const leave = async (id: string) => {
        if (!(await confirm({ title: t('challenges.leave'), message: t('challenges.leaveConfirm'), confirmLabel: t('challenges.leave'), danger: true }))) return;
        actions.leaveChallenge(id);
        void leaveBoard(id).catch(() => {});
    };

    return (
        <div className="space-y-4 pb-4">
            <BackHeader title={t('challenges.title')} subtitle={t('challenges.subtitle')} icon={<Trophy size={20} />} />
            <Section>
                <ul className="space-y-3">
                    {list.map(c => {
                        const mine = joined.find(j => j.id === c.id);
                        const status = mine ? challengeStatus(mine, data) : null;
                        const pct = status ? Math.round((status.progress / status.target) * 100) : 0;
                        return (
                            <li key={c.id}>
                                <article className={`card overflow-hidden p-4 ${status?.state === 'done' ? 'border-amber-300/50' : ''}`} aria-label={challengeName(c.id)}>
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink-3 text-2xl" aria-hidden>{c.emoji}</span>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="flex items-center gap-1.5 font-bold">{challengeName(c.id)} {status?.state === 'done' && <Medal size={18} className="text-amber-300" aria-hidden />}</h2>
                                            <p className="text-sm text-white/60">{challengeGoal(c.id)}</p>
                                            {(people[c.id] ?? 0) > 0 && (
                                                <p className="mt-1 flex items-center gap-1 text-xs text-white/45"><Users size={12} /> {tp('challenges.people', people[c.id])}</p>
                                            )}
                                        </div>
                                    </div>
                                    {status && (
                                        <div className="mt-3">
                                            <div className="mb-1 flex justify-between text-sm">
                                                <span className="font-semibold tabular-nums">{t('challenges.progress', { n: status.progress, target: status.target })}</span>
                                                <span className="text-white/55">
                                                    {status.state === 'done' ? t('challenges.done') : status.state === 'ended' ? t('challenges.ended') : tp('challenges.daysLeft', status.daysLeft)}
                                                </span>
                                            </div>
                                            <div className="h-2.5 overflow-hidden rounded-full bg-ink-4" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={challengeName(c.id)}>
                                                <div className={`h-full rounded-full transition-[width] duration-500 ${status.state === 'done' ? 'bg-amber-300' : 'bg-gradient-to-r from-brand to-amber-500'}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-3 flex gap-2">
                                        {!mine ? (
                                            <button onClick={() => join(c.id)} className="btn-primary flex-1">{t('challenges.join')}</button>
                                        ) : status?.state === 'ended' || (status?.state === 'done' && status.daysLeft === 0) ? (
                                            <button onClick={() => join(c.id)} className="btn-primary flex-1">{t('challenges.retry')}</button>
                                        ) : (
                                            <button onClick={() => void leave(c.id)} className="btn-ghost flex-1 text-sm">{t('challenges.leave')}</button>
                                        )}
                                        <button onClick={() => setBoard(c.id)} className="btn-ghost flex-1 text-sm"><Trophy size={16} /> {t('challenges.board')}</button>
                                    </div>
                                </article>
                            </li>
                        );
                    })}
                </ul>
            </Section>
            {board && <Board id={board} onClose={() => setBoard(null)} />}
        </div>
    );
}
