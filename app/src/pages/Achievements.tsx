import { Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BADGE_EMOJI, BadgeShareSheet, type Badge } from '../components/BadgeShare';
import { Medal } from '../components/Medal';
import { PageHeader, Section } from '../components/ui';
import { t, tp } from '../i18n';
import { ACHIEVEMENTS, achievementDescription, achievementTitle } from '../lib/achievements';
import { fmtNumber, fmtShortDate } from '../lib/format';
import { STREAK_MILESTONES, useStreak } from '../lib/streak';
import { useProgressStats, useUnlocked } from '../lib/useAchievements';
import { actions } from '../store/store';

export default function Achievements() {
    const unlocked = useUnlocked();
    const stats = useProgressStats();
    const { bestStreak } = useStreak();
    const [badge, setBadge] = useState<Badge | null>(null);

    // Visiting the page counts as having seen every unlocked medal.
    useEffect(() => {
        actions.markAchievementsSeen([...unlocked.keys()]);
    }, [unlocked]);

    // Earned first (newest on top), then the ones closest to unlocking.
    const closeness = (id: string) => {
        const goal = ACHIEVEMENTS.find(a => a.id === id)?.goal;
        return goal ? stats[goal.stat] / goal.target : 0;
    };
    const ordered = [...ACHIEVEMENTS].sort((a, b) => {
        const ua = unlocked.get(a.id), ub = unlocked.get(b.id);
        if (ua && ub) return ub.date.localeCompare(ua.date);
        if (ua || ub) return ua ? -1 : 1;
        return closeness(b.id) - closeness(a.id);
    });

    return (
        <div className="space-y-5 pb-4">
            <PageHeader tone="amber" title={t('nav.achievements')} subtitle={t('achievements.count', { n: unlocked.size, total: ACHIEVEMENTS.length })} />
            <Section title={t('badge.streaks')}>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                    {STREAK_MILESTONES.map(n => {
                        const reached = bestStreak >= n;
                        return (
                            <button key={n} disabled={!reached} data-testid={`streak-badge-${n}`}
                                onClick={() => setBadge({ id: `racha-${n}-dias`, emoji: '🔥', title: t('badge.streakTitle', { n }), description: t('badge.streakText', { n }) })}
                                aria-label={reached ? `${t('badge.share')}: ${t('badge.streakTitle', { n })}` : t('badge.streakTitle', { n })}
                                className={`flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border p-2 ${reached ? 'border-amber-300/40 bg-amber-300/10 hover:bg-amber-300/20' : 'border-dashed border-line opacity-40'}`}>
                                <span className="text-2xl" aria-hidden>🔥</span>
                                <span className="text-xs font-bold tabular-nums">{tp('activity.days', n)}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-1 text-xs text-white/45">{t('badge.tapToShare')}</p>
            </Section>
            <Section>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-ink-4">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong" style={{ width: `${(unlocked.size / ACHIEVEMENTS.length) * 100}%` }} />
                </div>
                <ul className="grid grid-cols-1 gap-2">
                    {ordered.map(a => {
                        const u = unlocked.get(a.id);
                        const goal = !u && a.goal ? { value: Math.min(stats[a.goal.stat], a.goal.target), target: a.goal.target } : null;
                        return (
                            <li key={a.id} className={`card flex items-center gap-4 p-3 ${u ? 'cursor-pointer hover:bg-ink-3' : 'opacity-70'}`}
                                onClick={u ? () => setBadge({ id: a.id, emoji: BADGE_EMOJI[a.icon], title: achievementTitle(a), description: achievementDescription(a), date: u.date }) : undefined}>
                                <Medal achievement={a} unlocked={!!u} />
                                <div className="min-w-0 flex-1">
                                    <p className={`font-semibold ${u ? '' : 'text-white/60'}`}>{achievementTitle(a)}</p>
                                    <p className="text-sm text-white/50">{achievementDescription(a)}</p>
                                    {goal && goal.value > 0 && (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-4">
                                                <div className="h-full rounded-full bg-brand" style={{ width: `${(goal.value / goal.target) * 100}%` }} />
                                            </div>
                                            <span className="shrink-0 text-[11px] tabular-nums text-white/45">{fmtNumber(goal.value)} / {fmtNumber(goal.target)}</span>
                                        </div>
                                    )}
                                </div>
                                {u && (
                                    <span className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="text-xs text-white/45">{fmtShortDate(u.date)}</span>
                                        <button onClick={e => { e.stopPropagation(); setBadge({ id: a.id, emoji: BADGE_EMOJI[a.icon], title: achievementTitle(a), description: achievementDescription(a), date: u.date }); }}
                                            aria-label={`${t('badge.share')}: ${achievementTitle(a)}`} className="rounded-full p-1.5 text-brand hover:bg-ink-4"><Share2 size={16} /></button>
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Section>
            <BadgeShareSheet badge={badge} onClose={() => setBadge(null)} />
        </div>
    );
}
