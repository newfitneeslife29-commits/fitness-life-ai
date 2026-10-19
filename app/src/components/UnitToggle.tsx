import { haptic } from '../lib/native';
import { t } from '../i18n';
import { actions } from '../store/store';
import type { Unit } from '../store/types';

// kg ⇄ lb right where the weights are typed; the whole app follows.
export const UnitToggle = ({ unit, tone = 'ink' }: { unit: Unit; tone?: 'ink' | 'glass' }) => (
    <div role="radiogroup" aria-label={t('workout.unit')} className={`flex rounded-full p-0.5 text-xs font-bold ${tone === 'glass' ? 'bg-black/30 backdrop-blur' : 'bg-ink-3'}`}>
        {(['kg', 'lbs'] as const).map(u => (
            <button key={u} role="radio" aria-checked={unit === u} onClick={() => { if (unit !== u) { haptic('tap'); actions.updateProfile({ unit: u }); } }}
                className={`rounded-full px-2.5 py-1 transition ${unit === u ? 'bg-white text-ink shadow' : tone === 'glass' ? 'text-snow/70' : 'text-white/55'}`}>
                {u === 'kg' ? 'kg' : 'lb'}
            </button>
        ))}
    </div>
);

