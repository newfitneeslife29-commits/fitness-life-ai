import { locale, t, tp } from '../i18n';
import { isNative } from './native';

// Short spoken cues for the exercise timer: the device's own text-to-speech
// engine in the apps (Android's WebView has no speechSynthesis), the Web
// Speech API in the browser. Never fatal: without a voice the timer still
// shows the time.

export const voiceAvailable = () => isNative() || (typeof window !== 'undefined' && 'speechSynthesis' in window);

let tts: Promise<typeof import('@capacitor-community/text-to-speech')> | null = null;

export const speak = async (text: string) => {
    try {
        if (isNative()) {
            tts ??= import('@capacitor-community/text-to-speech');
            const { TextToSpeech, QueueStrategy } = await tts;
            await TextToSpeech.speak({ text, lang: locale(), rate: 1.05, queueStrategy: QueueStrategy.Flush, category: 'playback' });
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = locale();
            u.rate = 1.05;
            window.speechSynthesis.speak(u);
        }
    } catch {
        // No voice engine installed, or the phone is muted: the screen still shows the time.
    }
};

export const stopSpeaking = async () => {
    try {
        if (isNative()) {
            if (tts) await (await tts).TextToSpeech.stop();
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    } catch {
        // nothing to stop
    }
};

// "45 seconds", "1 minute", "1 minute 30 seconds".
export const spokenTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return tp('voice.seconds', s);
    if (s === 0) return tp('voice.minutes', m);
    return t('voice.minutesSeconds', { minutes: tp('voice.minutes', m), seconds: tp('voice.seconds', s) });
};

// What to say at second `sec` of a hold that aims for `target` seconds:
// a countdown into the target, "time!" on it, and the time every 10 seconds.
export const cueAt = (sec: number, target: number): string | null => {
    if (sec <= 0) return null;
    if (target > 0) {
        if (sec === target) return t('voice.target');
        if (sec >= target - 3 && sec < target) return String(target - sec);
    }
    if (sec % 10 === 0) return spokenTime(sec);
    return null;
};
