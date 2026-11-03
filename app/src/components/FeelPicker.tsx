import { t, type Key } from '../i18n';
import { FEELS, type Feel } from '../lib/feel';
import { haptic } from '../lib/native';
import { actions } from '../store/store';

const EMOJI: Record<Feel, string> = { tired: '😴', normal: '🙂', strong: '⚡' };

// "How do you feel today?" at the start of a workout (lib/feel.ts).
export const FeelPicker = ({ feel, className = '' }: { feel?: Feel; className?: string }) => (
    <div className={`rounded-xl border border-line bg-ink-3/60 p-2.5 ${className}`}>
        <p className="mb-2 text-sm font-semibold">{t('feel.question')}</p>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t('feel.question')}>
            {FEELS.map(f => (
                <button key={f} role="radio" aria-checked={feel === f}
                    onClick={() => { haptic('tap'); actions.setFeel(f); }}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border py-1.5 text-xs font-semibold transition ${feel === f ? 'border-brand bg-brand-soft text-white' : 'border-line text-white/70 hover:bg-ink-3'}`}>
                    <span className="text-lg leading-none" aria-hidden>{EMOJI[f]}</span>
                    {t(`feel.${f}` as Key)}
                </button>
            ))}
        </div>
        {feel && <p className="mt-2 text-xs text-white/60">{t(`feel.${feel}Hint` as Key)}</p>}
    </div>
);
