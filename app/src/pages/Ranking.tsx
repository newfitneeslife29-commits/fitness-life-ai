import { Trophy, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { BackHeader, Chips, Section } from '../components/ui';
import { t } from '../i18n';
import { publicUrl } from '../lib/community';
import { fmtNumber } from '../lib/format';
import { fetchFriendsWeek, type FriendRow } from '../lib/friendsWeek';
import { useStore } from '../store/store';

type By = 'workouts' | 'minutes' | 'steps';

// This week's ranking: me and the people I follow.
export default function Ranking() {
    const account = useStore(s => s.account);
    const myName = useStore(s => s.profile?.name ?? '');
    const [by, setBy] = useState<By>('workouts');
    const [rows, setRows] = useState<FriendRow[] | null>(null);
    useEffect(() => {
        if (!account) return;
        void fetchFriendsWeek().then(setRows, () => setRows([]));
    }, [account?.id]);

    const sorted = [...(rows ?? [])].sort((a, b) => b[by] - a[by]);
    const friends = sorted.filter(r => !r.me).length;

    return (
        <div className="space-y-4 pb-4">
            <BackHeader title={t('ranking.title')} subtitle={t('ranking.subtitle')} icon={<Trophy size={20} />} />
            {!account ? (
                <Section>
                    <div className="card p-6 text-center">
                        <p className="mb-3 text-sm text-white/60">{t('ranking.account')}</p>
                        <Link to="/cuenta" className="btn-primary w-full">{t('account.cta')}</Link>
                    </div>
                </Section>
            ) : (
                <>
                    <Section>
                        <Chips<By> label={t('ranking.title')} value={by} onChange={setBy}
                            options={[{ value: 'workouts', label: t('ranking.workouts') }, { value: 'minutes', label: t('ranking.minutes') }, { value: 'steps', label: t('ranking.steps') }]} />
                    </Section>
                    <Section>
                        {rows === null ? (
                            <div className="h-24 animate-pulse rounded-xl bg-ink-3" role="status" aria-label={t('community.loading')} />
                        ) : (
                            <ol className="space-y-1.5">
                                {sorted.map((r, i) => (
                                    <li key={r.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${r.me ? 'bg-brand-soft' : 'card'}`}>
                                        <span className="w-7 text-center text-lg font-black tabular-nums">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                                        <Avatar src={publicUrl(r.avatarPath, r.avatarUpdated ?? undefined)} name={(r.me ? myName : r.name) || '?'} size={36} />
                                        <span className="min-w-0 flex-1 truncate font-semibold">{r.me ? t('challenges.you') : r.name || '—'}</span>
                                        <span className="text-lg font-bold tabular-nums">{fmtNumber(r[by])}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                        {rows !== null && friends === 0 && (
                            <div className="card mt-3 p-4 text-center">
                                <p className="mb-3 text-sm text-white/60">{t('ranking.empty')}</p>
                                <Link to="/comunidad" className="btn-primary w-full"><UserPlus size={16} /> {t('nav.community')}</Link>
                            </div>
                        )}
                        <p className="mt-3 text-center text-xs text-white/45">{t('ranking.resets')}</p>
                    </Section>
                </>
            )}
        </div>
    );
}
