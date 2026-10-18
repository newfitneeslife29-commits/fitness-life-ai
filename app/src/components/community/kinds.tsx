import { CircleHelp, Flame, Lightbulb, MessageCircle, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '../../i18n';
import type { PostKind } from '../../lib/community';

// How each kind of post looks: icon and colour.
export const KIND_STYLE: Record<PostKind, { icon: (size: number) => ReactNode; chip: string }> = {
    tip: { icon: s => <Lightbulb size={s} />, chip: 'bg-amber-400/15 text-amber-500' },
    experience: { icon: s => <Flame size={s} />, chip: 'bg-rose-500/15 text-rose-500' },
    question: { icon: s => <CircleHelp size={s} />, chip: 'bg-sky-500/15 text-sky-500' },
    achievement: { icon: s => <Trophy size={s} />, chip: 'bg-emerald-500/15 text-emerald-500' },
    general: { icon: s => <MessageCircle size={s} />, chip: 'bg-white/10 text-white/70' },
};

export const KindBadge = ({ kind }: { kind: PostKind }) => kind === 'general' ? null : (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${KIND_STYLE[kind].chip}`}>
        {KIND_STYLE[kind].icon(12)} {t(`community.kind.${kind}`)}
    </span>
);

// The topic of the week: a question for everyone to answer, changing every Monday.
const TOPICS: PostKind[] = ['tip', 'experience', 'question', 'achievement', 'tip', 'experience', 'tip', 'achievement', 'experience', 'question', 'tip', 'experience'];
const WEEK = 7 * 86_400_000;
const FIRST_MONDAY = Date.UTC(2026, 0, 5);
export const weeklyTopic = (now = Date.now()) => {
    const n = Math.floor((now - FIRST_MONDAY) / WEEK);
    const i = ((n % TOPICS.length) + TOPICS.length) % TOPICS.length;
    return { n: i + 1, kind: TOPICS[i] };
};
