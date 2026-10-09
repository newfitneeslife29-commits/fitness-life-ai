import { useEffect } from 'react';
import { Medal } from '../components/Medal';
import { PageHeader, Section } from '../components/ui';
import { t } from '../i18n';
import { ACHIEVEMENTS, achievementDescription, achievementTitle } from '../lib/achievements';
import { fmtNumber, fmtShortDate } from '../lib/format';
import { useProgressStats, useUnlocked } from '../lib/useAchievements';
import { actions } from '../store/store';

export default function Achievements() {
    const unlocked = useUnlocked();
    const stats = useProgressStats();

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
            <PageHeader title={t('nav.achievements')} subtitle={t('achievements.count', { n: unlocked.size, total: ACHIEVEMENTS.length })} />
            <Section>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-ink-4">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong" style={{ width: `${(unlocked.size / ACHIEVEMENTS.length) * 100}%` }} />
                </div>
                <ul className="grid grid-cols-1 gap-2">
                    {ordered.map(a => {
                        const u = unlocked.get(a.id);
                        const goal = !u && a.goal ? { value: Math.min(stats[a.goal.stat], a.goal.target), target: a.goal.target } : null;
                        return (
                            <li key={a.id} className={`card flex items-center gap-4 p-3 ${u ? '' : 'opacity-70'}`}>
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
                                {u && <span className="shrink-0 text-xs text-white/45">{fmtShortDate(u.date)}</span>}
                            </li>
                        );
                    })}
                </ul>
            </Section>
        </div>
    );
}
