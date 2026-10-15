import { en } from './en';
import { es } from './es';
import { pt } from './pt';

// Minimal typed i18n: Spanish is the source dictionary; the other languages
// must define every key (enforced by their `Dict` type). Spanish, English and
// Portuguese are bundled; the rest load when chosen (one small file each).

export type Lang = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'nl' | 'pl' | 'tr' | 'ru' | 'ja' | 'ko' | 'zh' | 'hi' | 'id';
export type Key = keyof typeof es;
export type Dict = Record<Key, string>;
// Content written in the app (exercises, foods, guides…) comes in Spanish,
// English and Portuguese; the other languages show the English text.
export type L10n = Record<'es' | 'en' | 'pt', string> & Partial<Record<Lang, string>>;

// Native name, name in English (for the search box), flag and number/date format.
export const LANGS: { code: Lang; label: string; english: string; flag: string; locale: string }[] = [
    { code: 'es', label: 'Español', english: 'Spanish', flag: '🇪🇸', locale: 'es-ES' },
    { code: 'en', label: 'English', english: 'English', flag: '🇺🇸', locale: 'en-US' },
    { code: 'pt', label: 'Português', english: 'Portuguese', flag: '🇧🇷', locale: 'pt-BR' },
    { code: 'fr', label: 'Français', english: 'French', flag: '🇫🇷', locale: 'fr-FR' },
    { code: 'de', label: 'Deutsch', english: 'German', flag: '🇩🇪', locale: 'de-DE' },
    { code: 'it', label: 'Italiano', english: 'Italian', flag: '🇮🇹', locale: 'it-IT' },
    { code: 'nl', label: 'Nederlands', english: 'Dutch', flag: '🇳🇱', locale: 'nl-NL' },
    { code: 'pl', label: 'Polski', english: 'Polish', flag: '🇵🇱', locale: 'pl-PL' },
    { code: 'tr', label: 'Türkçe', english: 'Turkish', flag: '🇹🇷', locale: 'tr-TR' },
    { code: 'ru', label: 'Русский', english: 'Russian', flag: '🇷🇺', locale: 'ru-RU' },
    { code: 'ja', label: '日本語', english: 'Japanese', flag: '🇯🇵', locale: 'ja-JP' },
    { code: 'ko', label: '한국어', english: 'Korean', flag: '🇰🇷', locale: 'ko-KR' },
    { code: 'zh', label: '中文（简体）', english: 'Chinese', flag: '🇨🇳', locale: 'zh-CN' },
    { code: 'hi', label: 'हिन्दी', english: 'Hindi', flag: '🇮🇳', locale: 'hi-IN' },
    { code: 'id', label: 'Bahasa Indonesia', english: 'Indonesian', flag: '🇮🇩', locale: 'id-ID' },
];

const DICTS: Partial<Record<Lang, Dict>> = { es, en, pt };
const LOADERS: Partial<Record<Lang, () => Promise<Dict>>> = {
    fr: () => import('./fr').then(m => m.fr),
    de: () => import('./de').then(m => m.de),
    it: () => import('./it').then(m => m.it),
    nl: () => import('./nl').then(m => m.nl),
    pl: () => import('./pl').then(m => m.pl),
    tr: () => import('./tr').then(m => m.tr),
    ru: () => import('./ru').then(m => m.ru),
    ja: () => import('./ja').then(m => m.ja),
    ko: () => import('./ko').then(m => m.ko),
    zh: () => import('./zh').then(m => m.zh),
    hi: () => import('./hi').then(m => m.hi),
    id: () => import('./id').then(m => m.id),
};

let current: Lang = 'es';

export const isLang = (v: unknown): v is Lang => LANGS.some(l => l.code === v);
export const langInfo = (lang: Lang = current) => LANGS.find(l => l.code === lang) ?? LANGS[0];

export const getLang = () => current;
export const locale = () => langInfo().locale;

// Fetch a language's words before showing it (no-op for the bundled ones).
export const loadLang = async (lang: Lang) => {
    if (!DICTS[lang]) DICTS[lang] = await LOADERS[lang]!();
};

export const setLang = (lang: Lang) => {
    current = isLang(lang) ? lang : 'es';
    if (typeof document !== 'undefined') document.documentElement.lang = current;
};

// The phone's language when the app has it, otherwise English.
export const detectLang = (): Lang => {
    const tag = (typeof navigator !== 'undefined' ? navigator.language : 'es').slice(0, 2).toLowerCase();
    return isLang(tag) ? tag : 'en';
};

// A language still loading shows English for that moment.
export const t = (key: Key, vars?: Record<string, string | number>): string => {
    let s = (DICTS[current] ?? en)[key] ?? en[key] ?? es[key];
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
};

// Keys that come in `_one` / `_other` pairs.
type PluralBase = { [K in Key]: K extends `${infer B}_one` ? B : never }[Key];

export const tp = (base: PluralBase, n: number, vars?: Record<string, string | number>) =>
    t(`${base}_${n === 1 ? 'one' : 'other'}` as Key, { n, ...vars });

// Pick the current language from a per-language record.
export const l10n = (text: L10n) => text[current] ?? (current === 'es' ? text.es : text.en);
