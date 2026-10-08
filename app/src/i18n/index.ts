import { en } from './en';
import { es } from './es';
import { pt } from './pt';

// Minimal typed i18n: Spanish is the source dictionary; the other languages
// must define every key (enforced by their `Dict` type).

export type Lang = 'es' | 'en' | 'pt';
export type Key = keyof typeof es;
export type Dict = Record<Key, string>;
export type L10n = Record<Lang, string>;

export const LANGS: { code: Lang; label: string }[] = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' },
];

const DICTS: Record<Lang, Dict> = { es, en, pt };
const LOCALES: Record<Lang, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR' };

let current: Lang = 'es';

export const getLang = () => current;
export const locale = () => LOCALES[current];

export const setLang = (lang: Lang) => {
    current = lang;
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
};

// Spanish and Portuguese speakers get their language; everyone else English.
export const detectLang = (): Lang => {
    const tag = (typeof navigator !== 'undefined' ? navigator.language : 'es').slice(0, 2).toLowerCase();
    return tag === 'es' || tag === 'pt' ? tag : 'en';
};

export const isLang = (v: unknown): v is Lang => v === 'es' || v === 'en' || v === 'pt';

export const t = (key: Key, vars?: Record<string, string | number>): string => {
    let s = DICTS[current][key] ?? es[key];
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
};

// Keys that come in `_one` / `_other` pairs.
type PluralBase = { [K in Key]: K extends `${infer B}_one` ? B : never }[Key];

export const tp = (base: PluralBase, n: number, vars?: Record<string, string | number>) =>
    t(`${base}_${n === 1 ? 'one' : 'other'}` as Key, { n, ...vars });

// Pick the current language from a per-language record.
export const l10n = (text: L10n) => text[current] ?? text.es;
