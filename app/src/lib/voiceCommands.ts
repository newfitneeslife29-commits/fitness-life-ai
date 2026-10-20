import { useEffect, useRef, useState } from 'react';
import { locale, t, type Key } from '../i18n';
import { isNative } from './native';
import { appTalking, recentSpeech } from './voice';
import { useStore } from '../store/store';

// Hands-free guided workouts: the microphone listens for a few words ("done",
// "next", "more time", "save") in the app's language. The phone's own speech
// recognizer in the apps (@capgo/capacitor-speech-recognition), the Web
// Speech API in browsers that have it. Each command ends the listening
// session and a new one starts, so a word is never acted on twice.

export type VoiceCommand = 'done' | 'next' | 'more' | 'save';
const WORDS: Record<VoiceCommand, Key> = {
    done: 'handsFree.words.done', next: 'handsFree.words.next', more: 'handsFree.words.more', save: 'handsFree.words.save',
};

// Lowercase, Latin accents off, punctuation out (marks of other scripts stay).
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

// Scripts without spaces between words match anywhere.
const noSpaces = /[぀-ヿ㐀-鿿가-힯]/;

export const commandWords = (): Record<VoiceCommand, string[]> => {
    const out = {} as Record<VoiceCommand, string[]>;
    for (const c of Object.keys(WORDS) as VoiceCommand[]) out[c] = t(WORDS[c]).split(',').map(norm).filter(Boolean);
    return out;
};

// The command said last in `text`, if any.
export const matchCommand = (text: string, words: Record<VoiceCommand, string[]>): VoiceCommand | null => {
    const said = ` ${norm(text)} `;
    let best: { c: VoiceCommand; at: number } | null = null;
    for (const c of Object.keys(words) as VoiceCommand[]) {
        for (const w of words[c]) {
            const at = noSpaces.test(w) ? said.lastIndexOf(w) : said.lastIndexOf(` ${w} `);
            if (at >= 0 && (!best || at > best.at)) best = { c, at };
        }
    }
    return best?.c ?? null;
};

export type HandsFreeState = 'off' | 'listening' | 'denied' | 'unavailable';

interface WebRecognition {
    lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
    onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onend: (() => void) | null;
    onerror: ((e: { error: string }) => void) | null;
    start(): void; abort(): void;
}
const webRecognition = (): (new () => WebRecognition) | null => {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { SpeechRecognition?: new () => WebRecognition; webkitSpeechRecognition?: new () => WebRecognition };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const handsFreeSupported = () => isNative() || !!webRecognition();

// Starts listening; resolves to a stop function, or why it can't.
const listen = async (onCommand: (c: VoiceCommand) => void, onDenied: () => void): Promise<(() => void) | Exclude<HandsFreeState, 'off' | 'listening'>> => {
    const words = commandWords();
    let on = true;
    let lastAt = 0;
    const heard = (texts: string[], restart: () => void) => {
        if (!on || appTalking()) return;
        const echo = norm(recentSpeech());
        for (const text of texts) {
            // The app's own cue heard back: every word was in what it just said.
            const said = norm(text);
            if (echo && said && said.split(' ').every(w => echo.includes(w))) continue;
            const c = matchCommand(text, words);
            if (!c) continue;
            if (Date.now() - lastAt < 1200) return;
            lastAt = Date.now();
            onCommand(c);
            restart();
            return;
        }
    };

    if (!isNative()) {
        const Rec = webRecognition();
        if (!Rec) return 'unavailable';
        const rec = new Rec();
        rec.lang = locale();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 3;
        rec.onresult = e => {
            const texts: string[] = [];
            for (let i = e.resultIndex; i < e.results.length; i++) for (let j = 0; j < e.results[i].length; j++) texts.push(e.results[i][j].transcript);
            heard(texts, () => rec.abort());
        };
        rec.onerror = e => {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                on = false;
                onDenied();
            }
        };
        rec.onend = () => { if (on) setTimeout(() => { if (on) try { rec.start(); } catch { /* already started */ } }, 300); };
        try {
            rec.start();
        } catch {
            return 'unavailable';
        }
        return () => { on = false; rec.abort(); };
    }

    const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
    try {
        if (!(await SpeechRecognition.available()).available) return 'unavailable';
        let perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') perm = await SpeechRecognition.requestPermissions();
        if (perm.speechRecognition !== 'granted') return 'denied';
    } catch {
        return 'unavailable';
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Sessions that end right away (no network, busy microphone) wait longer each time.
    let startedAt = 0;
    let quickEnds = 0;
    const start = () => {
        clearTimeout(timer);
        quickEnds = startedAt && Date.now() - startedAt < 1500 ? quickEnds + 1 : 0;
        timer = setTimeout(() => {
            if (!on) return;
            startedAt = Date.now();
            void SpeechRecognition.start({
                language: locale(), partialResults: true, maxResults: 3, popup: false,
                contextualStrings: Object.values(words).flat(), muteRecognizerBeep: true,
            }).catch(() => { if (on) timer = setTimeout(start, 1500); });
        }, 350 * 2 ** Math.min(quickEnds, 4));
    };
    const restart = () => { void SpeechRecognition.forceStop().catch(() => {}); };
    const handles = await Promise.all([
        SpeechRecognition.addListener('partialResults', e => heard([...(e.matches ?? []), e.accumulatedText ?? ''].filter(Boolean), restart)),
        // Each session ends after a silence: listen again.
        SpeechRecognition.addListener('listeningState', e => { if ((e.state ?? e.status) === 'stopped') start(); }),
    ]);
    start();
    return () => {
        on = false;
        clearTimeout(timer);
        handles.forEach(h => void h.remove());
        void SpeechRecognition.forceStop().catch(() => {});
    };
};

// Listens while `on`, calling the latest `onCommand` for each command heard.
export const useHandsFree = (on: boolean, onCommand: (c: VoiceCommand) => void): HandsFreeState => {
    const [state, setState] = useState<HandsFreeState>('off');
    const latest = useRef(onCommand);
    latest.current = onCommand;
    const lang = useStore(s => s.lang);
    useEffect(() => {
        if (!on) {
            setState('off');
            return;
        }
        let stop: (() => void) | null = null;
        let cancelled = false;
        void listen(c => latest.current(c), () => setState('denied')).then(r => {
            if (typeof r === 'function') {
                if (cancelled) r();
                else {
                    stop = r;
                    setState('listening');
                }
            } else if (!cancelled) setState(r);
        });
        return () => {
            cancelled = true;
            stop?.();
        };
    }, [on, lang]);
    return state;
};
