import { useEffect, useMemo } from 'react';
import { Medal } from '../components/Medal';
import { PageHeader, Section } from '../components/ui';
import { ACHIEVEMENTS, unlockedAchievements } from '../lib/achievements';
import { fmtShortDate } from '../lib/format';
import { actions, useStore } from '../store/store';

export default function Achievements() {
    const sessions = useStore(s => s.sessions);
    const days = useStore(s => s.profile?.daysPerWeek ?? 3);
    const unlocked = useMemo(() => unlockedAchievements(sessions, days), [sessions, days]);

    // Visiting the page counts as having seen every unlocked medal.
    useEffect(() => {
        actions.markAchievementsSeen([...unlocked.keys()]);
    }, [unlocked]);

    return (
        <div className="space-y-5 pb-4">
            <PageHeader title="Logros" subtitle={`${unlocked.size} de ${ACHIEVEMENTS.length} conseguidos`} />
            <Section>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-ink-4">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong" style={{ width: `${(unlocked.size / ACHIEVEMENTS.length) * 100}%` }} />
                </div>
                <ul className="grid grid-cols-1 gap-2">
                    {ACHIEVEMENTS.map(a => {
                        const u = unlocked.get(a.id);
                        return (
                            <li key={a.id} className={`card flex items-center gap-4 p-3 ${u ? '' : 'opacity-70'}`}>
                                <Medal achievement={a} unlocked={!!u} />
                                <div className="min-w-0 flex-1">
                                    <p className={`font-semibold ${u ? '' : 'text-white/60'}`}>{a.title}</p>
                                    <p className="text-sm text-white/50">{a.description}</p>
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
