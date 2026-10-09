import { Dumbbell, Flame, Layers, Moon, Scale, Star, Sunrise, Target, Timer, Trophy, Weight, type LucideIcon } from 'lucide-react';
import type { Achievement } from '../lib/achievements';

const ICONS: Record<Achievement['icon'], LucideIcon> = {
    dumbbell: Dumbbell, flame: Flame, trophy: Trophy, weight: Weight, sunrise: Sunrise, moon: Moon, target: Target, star: Star, timer: Timer, layers: Layers, scale: Scale,
};

export const Medal = ({ achievement, unlocked, size = 'md' }: { achievement: Achievement; unlocked: boolean; size?: 'md' | 'lg' }) => {
    const Icon = ICONS[achievement.icon];
    const dim = size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
    return (
        <div aria-hidden className={`relative flex ${dim} shrink-0 items-center justify-center rounded-2xl ${unlocked
            ? 'bg-gradient-to-br from-brand-strong to-brand text-ink shadow-lg shadow-brand/25'
            : 'border border-dashed border-line bg-ink-3 text-white/25'}`}>
            <Icon size={size === 'lg' ? 30 : 22} strokeWidth={2} />
        </div>
    );
};
