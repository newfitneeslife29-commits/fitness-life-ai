import { Mic, MicOff, Play, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { fmtClock } from '../lib/format';
import { haptic } from '../lib/native';
import { useNow } from '../lib/useNow';
import { cueAt, speak, stopSpeaking, voiceAvailable } from '../lib/voice';
import { actions, useStore } from '../store/store';

const COUNT_IN = 3; // seconds of "3, 2, 1" before the hold starts

// Stopwatch for timed exercises (plank, mountain climbers...). A voice counts
// in, calls out the time every 10 seconds and says when the target is reached;
// "Finish" saves the seconds held into the set.
export const HoldTimer = ({ target, onDone }: { target: number; onDone: (seconds: number) => void }) => {
    const voiceOn = useStore(s => s.profile?.voice !== false) && voiceAvailable();
    const [goAt, setGoAt] = useState<number | null>(null);
    const now = useNow(goAt !== null, 200);
    // Negative while counting in. The first render after Start still has the
    // old clock reading, hence the floor at the count-in.
    const elapsed = goAt === null ? 0 : Math.max(-COUNT_IN, Math.floor((now - goAt) / 1000));
    const lastCue = useRef<number | null>(null);

    useEffect(() => {
        if (goAt === null || lastCue.current === elapsed) return;
        lastCue.current = elapsed;
        const cue = elapsed < 0 ? String(-elapsed) : elapsed === 0 ? t('voice.go') : cueAt(elapsed, target);
        if (elapsed === target && target > 0) haptic('success');
        if (cue && voiceOn) void speak(cue);
    }, [elapsed, goAt, target, voiceOn]);

    useEffect(() => () => { void stopSpeaking(); }, []);

    const start = () => {
        lastCue.current = null;
        haptic('tap');
        setGoAt(Date.now() + COUNT_IN * 1000);
    };
    const stop = (save: boolean) => {
        const held = Math.max(0, elapsed);
        setGoAt(null);
        void stopSpeaking();
        if (save && held > 0) {
            haptic('success');
            onDone(held);
        }
    };

    if (goAt === null) {
        return (
            <div className="mx-4 mb-3 flex items-center gap-2">
                <button onClick={start} className="btn-primary flex-1 py-2.5"><Play size={16} fill="currentColor" /> {t('timer.start')}</button>
                {voiceAvailable() && (
                    <button onClick={() => actions.updateProfile({ voice: !voiceOn })} aria-pressed={voiceOn} aria-label={t('settings.voice')}
                        className={`rounded-xl border border-line p-2.5 ${voiceOn ? 'text-brand' : 'text-white/40'}`}>
                        {voiceOn ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                )}
            </div>
        );
    }

    const counting = elapsed < 0;
    const reached = target > 0 && elapsed >= target;
    return (
        <div role="timer" aria-live="off" className={`mx-4 mb-3 rounded-2xl border p-4 text-center ${reached ? 'border-good/50 bg-good/10' : 'border-brand/40 bg-brand-soft'}`}>
            <p className="label">{counting ? t('timer.getReady') : reached ? t('timer.reached') : t('timer.target', { n: target })}</p>
            <p className={`my-1 font-bold tabular-nums ${counting ? 'text-6xl text-brand' : 'text-5xl'}`}>{counting ? -elapsed : fmtClock(elapsed)}</p>
            {!counting && target > 0 && (
                <div className="mx-auto mb-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-ink-4">
                    <div className={`h-full rounded-full ${reached ? 'bg-good' : 'bg-brand'}`} style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }} />
                </div>
            )}
            <div className="flex gap-2">
                <button onClick={() => stop(false)} aria-label={t('common.cancel')} className="btn-ghost px-3 py-2"><X size={18} /></button>
                <button onClick={() => stop(true)} disabled={counting} className="btn-primary flex-1 py-2"><Square size={14} fill="currentColor" /> {t('timer.finish')}</button>
            </div>
        </div>
    );
};
