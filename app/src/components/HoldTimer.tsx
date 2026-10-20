import { Check, Mic, MicOff, Minus, Pause, Play, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { fmtClock } from '../lib/format';
import { COUNTDOWN_SEC, haptic, primeSound, restOver, restTick } from '../lib/native';
import { useNow } from '../lib/useNow';
import { cueAt, speak, stopSpeaking, voiceAvailable } from '../lib/voice';
import { actions, useStore } from '../store/store';

const COUNT_IN = 3; // seconds of "3, 2, 1" before the hold starts
const STEP = 10; // seconds added or taken with − / +

// The timer of timed exercises (plank, mountain climbers, bike…), like the
// big fitness apps: a ring that counts down to the target with the seconds
// left in the middle, 3-2-1 to start, pause and resume, ±10 s on the fly,
// a voice that says "halfway" and the last seconds, and beeps from the last
// 10. Past the target it keeps going in green as extra time. "Done" saves
// the seconds held into the set. In cardio and fat-burning workouts (auto)
// it starts by itself and the set ends when the time is reached, so the
// clock only stops for the rests.
export const HoldTimer = ({ target, onDone, auto = false, size = 'md' }: {
    target: number; onDone: (seconds: number) => void; auto?: boolean; size?: 'md' | 'lg';
}) => {
    const voiceOn = useStore(s => s.profile?.voice !== false) && voiceAvailable();
    const sound = useStore(s => s.profile?.restSound !== false);
    const [goal, setGoal] = useState(Math.max(1, target));
    const [goAt, setGoAt] = useState<number | null>(() => (auto ? Date.now() : null));
    // Pauses: when the current one started, and the time already spent paused.
    const [pausedAt, setPausedAt] = useState<number | null>(null);
    const [pausedMs, setPausedMs] = useState(0);
    const now = useNow(goAt !== null && pausedAt === null, 200);
    const clock = pausedAt ?? now;
    // Negative while counting in. The first render after Start still has the
    // old clock reading, hence the floor at the count-in.
    const elapsed = goAt === null ? 0 : Math.max(-COUNT_IN, Math.floor((clock - goAt - pausedMs) / 1000));
    const lastCue = useRef<number | null>(null);

    useEffect(() => {
        if (goAt === null || pausedAt !== null || lastCue.current === elapsed) return;
        const before = lastCue.current;
        lastCue.current = elapsed;
        const cue = elapsed < 0 ? String(-elapsed) : elapsed === 0 ? t('voice.go') : cueAt(elapsed, goal);
        const left = goal - elapsed;
        if (elapsed < 0) restTick(sound);
        else if (elapsed === 0) restTick(sound, true);
        else if (left > 0 && left <= COUNTDOWN_SEC) restTick(sound, left <= 3);
        // Also when a tick was skipped (the app was briefly in the background).
        if (elapsed >= goal && (before === null || before < goal)) {
            haptic('success');
            restOver(sound);
            if (auto) {
                finish(goal);
                return;
            }
        }
        if (cue && voiceOn) void speak(cue);
    }, [elapsed, goAt, pausedAt, goal, voiceOn, sound]);

    useEffect(() => () => { void stopSpeaking(); }, []);

    const start = () => {
        lastCue.current = null;
        primeSound();
        haptic('tap');
        setPausedAt(null);
        setPausedMs(0);
        setGoAt(Date.now() + COUNT_IN * 1000);
    };
    const reset = () => {
        setGoAt(null);
        setPausedAt(null);
        setPausedMs(0);
        void stopSpeaking();
    };
    const finish = (held: number) => {
        reset();
        if (held > 0) {
            haptic('success');
            onDone(held);
        }
    };
    const togglePause = () => {
        haptic('tap');
        if (pausedAt === null) {
            setPausedAt(Date.now());
            void stopSpeaking();
            if (voiceOn) void speak(t('timer.paused'));
        } else {
            setPausedMs(ms => ms + Date.now() - pausedAt);
            setPausedAt(null);
        }
    };
    // ±10 s on the fly; never below what's already done (+5 s) nor 5 s.
    const changeGoal = (delta: number) => {
        haptic('tap');
        setGoal(g => Math.max(5, Math.max(elapsed + 5, g + delta)));
    };

    const lg = size === 'lg';
    const counting = goAt !== null && elapsed < 0;
    const running = goAt !== null && !counting;
    const extra = running && elapsed >= goal;
    const paused = pausedAt !== null;
    const left = Math.max(0, goal - elapsed);
    const progress = goAt === null ? 0 : counting ? 0 : Math.min(1, elapsed / goal);
    const ending = running && !extra && left <= 3;

    // The ring: a circle that fills as the seconds go by.
    const box = lg ? 208 : 152;
    const stroke = lg ? 14 : 11;
    const r = (box - stroke) / 2;
    const length = 2 * Math.PI * r;
    const big = counting ? String(-elapsed) : extra ? `+${fmtClock(elapsed - goal)}` : fmtClock(goAt === null ? goal : left);
    const caption = goAt === null ? t('timer.target', { n: goal })
        : counting ? t('timer.getReady')
        : paused ? t('timer.paused')
        : extra ? t('timer.reached')
        : t('timer.left');
    const label = goAt === null ? `${t('timer.target', { n: goal })}`
        : `${caption}: ${counting ? -elapsed : extra ? `+${fmtClock(elapsed - goal)}` : fmtClock(left)}`;

    const round = `flex shrink-0 items-center justify-center rounded-full border border-line bg-ink-2 text-white/75 active:scale-95 disabled:opacity-30 ${lg ? 'h-12 w-12' : 'h-10 w-10'}`;

    return (
        <div className={`mx-4 mb-3 rounded-3xl border p-4 transition-colors ${extra ? 'border-good/40 bg-good/10' : goAt !== null ? 'border-brand/30 bg-brand-soft' : 'border-line bg-ink-2'}`}>
            <div className="flex items-center justify-center gap-4">
                <button onClick={() => changeGoal(-STEP)} disabled={goal <= 5 || extra} aria-label={t('timer.less')} className={round}><Minus size={18} /></button>
                <div role={goAt === null ? 'img' : 'timer'} aria-live="off" aria-label={label} className="relative shrink-0" style={{ width: box, height: box }}>
                    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90" aria-hidden>
                        <circle cx={box / 2} cy={box / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink-4" />
                        <circle cx={box / 2} cy={box / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                            strokeDasharray={length} strokeDashoffset={length * (1 - progress)}
                            className={`transition-[stroke-dashoffset] duration-200 ease-linear ${extra ? 'stroke-good' : 'stroke-brand'}`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${extra ? 'text-good' : 'text-white/55'}`}>{caption}</span>
                        <span key={counting ? elapsed : undefined}
                            className={`font-black tabular-nums leading-none ${counting ? `animate-pop text-brand ${lg ? 'text-7xl' : 'text-6xl'}` : lg ? 'text-6xl' : 'text-5xl'} ${ending ? 'animate-pulse text-brand' : ''} ${extra ? 'text-good' : ''} ${paused ? 'opacity-50' : ''}`}>
                            {big}
                        </span>
                        {running && !extra && <span className="mt-1 text-xs font-semibold tabular-nums text-white/45">{fmtClock(elapsed)} / {fmtClock(goal)}</span>}
                    </div>
                </div>
                <button onClick={() => changeGoal(STEP)} disabled={extra} aria-label={t('timer.more')} className={round}><Plus size={18} /></button>
            </div>

            {goAt === null ? (
                <div className="mt-4 flex items-center gap-2">
                    <button onClick={start} className="btn-primary flex-1 py-3"><Play size={18} fill="currentColor" /> {t('timer.start')}</button>
                    {voiceAvailable() && (
                        <button onClick={() => actions.updateProfile({ voice: !voiceOn })} aria-pressed={voiceOn} aria-label={t('settings.voice')}
                            className={`rounded-xl border border-line p-3 ${voiceOn ? 'text-brand' : 'text-white/40'}`}>
                            {voiceOn ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>
                    )}
                </div>
            ) : (
                <div className="mt-4 flex gap-2">
                    <button onClick={reset} aria-label={t('common.cancel')} className="btn-ghost px-3 py-3"><X size={18} /></button>
                    <button onClick={togglePause} disabled={counting} className="btn-ghost flex-1 py-3">
                        {paused ? <><Play size={16} fill="currentColor" /> {t('timer.resume')}</> : <><Pause size={16} fill="currentColor" /> {t('timer.pause')}</>}
                    </button>
                    <button onClick={() => finish(Math.max(0, elapsed))} disabled={counting} className="btn-primary flex-1 py-3"><Check size={18} strokeWidth={3} /> {t('timer.finish')}</button>
                </div>
            )}
        </div>
    );
};
