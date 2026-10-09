import { Apple, Bandage, Dumbbell, Flame, Footprints, House, ListChecks, Moon, Scale, ShieldCheck, TrendingUp } from 'lucide-react';
import type { Guide } from '../data/guides';

const ICONS = {
    start: Footprints, session: ListChecks, warmup: Flame, technique: ShieldCheck, progress: TrendingUp,
    home: House, joints: Bandage, rest: Moon, food: Apple, fat: Scale, muscle: Dumbbell,
} satisfies Record<Guide['icon'], unknown>;

export const GuideIcon = ({ icon, size = 20 }: { icon: Guide['icon']; size?: number }) => {
    const Icon = ICONS[icon];
    return <Icon size={size} />;
};
