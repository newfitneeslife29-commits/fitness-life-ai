/**
 * Idiomas: español (base), inglés, portugués y francés.
 * Las claves son el texto en español; `locales.ts` tiene las traducciones.
 * Variables con llaves: t('Necesitas nivel {n}', { n: 5 }).
 */
import { useSettings, type Lang } from '../stores/settingsStore';
import { LOCALES } from './locales';

export const LANGUAGES: { code: Lang; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇨🇴' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

const INDEX: Record<Exclude<Lang, 'es'>, number> = { en: 0, pt: 1, fr: 2 };

export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  let out = text;
  if (lang !== 'es') {
    const hit = LOCALES[text]?.[INDEX[lang]];
    if (hit) out = hit;
    else {
      // Mensajes con números (p. ej. del servidor): "Necesitas nivel 100" → "Necesitas nivel {n}".
      const m = text.match(/\d[\d.,]*/);
      const tpl = m ? LOCALES[text.replace(m[0], '{n}')]?.[INDEX[lang]] : undefined;
      if (tpl && m) out = tpl.split('{n}').join(m[0]);
    }
  }
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  // "1 partidas" → "1 partida" (cuando la cantidad {n} es exactamente 1).
  if (vars && String(vars.n) === '1') out = singularize(out, 1);
  return out;
}

export type TFn = (text: string, vars?: Record<string, string | number>) => string;

export function useT(): TFn {
  const lang = useSettings((s) => s.language);
  return (text, vars) => translate(lang, text, vars);
}

/** Traducción fuera de React (stores, eventos). */
export function tr(text: string, vars?: Record<string, string | number>): string {
  return translate(useSettings.getState().language, text, vars);
}


export function locale(lang: Lang): string {
  return { es: 'es-CO', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR' }[lang];
}

/** Plurales → singular cuando la cantidad es 1 ("Gana 1 partidas" → "Gana 1 partida"), en los 4 idiomas. */
const SINGULAR: [RegExp, string][] = [
  [/\bpartidas\b/g, 'partida'],
  [/\bveces\b/g, 'vez'],
  [/\bvezes\b/g, 'vez'],
  [/\bfichas\b/g, 'ficha'],
  [/\bmonedas\b/g, 'moneda'],
  [/\bvictorias\b/g, 'victoria'],
  [/\bvitórias\b/g, 'vitória'],
  [/\brápidas\b/g, 'rápida'],
  [/\bpeças\b/g, 'peça'],
  [/\bmoedas\b/g, 'moeda'],
  [/\bgames\b/g, 'game'],
  [/\btimes\b/g, 'time'],
  [/\bpieces\b/g, 'piece'],
  [/\bcoins\b/g, 'coin'],
  [/\bwins\b/g, 'win'],
  [/\bparties\b/g, 'partie'],
  [/\bpions\b/g, 'pion'],
  [/\bpièces\b/g, 'pièce'],
  [/\bvictoires\b/g, 'victoire'],
];
export function singularize(text: string, n: number): string {
  if (n !== 1) return text;
  return SINGULAR.reduce((s, [re, rep]) => s.replace(re, rep), text);
}
