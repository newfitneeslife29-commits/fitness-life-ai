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
