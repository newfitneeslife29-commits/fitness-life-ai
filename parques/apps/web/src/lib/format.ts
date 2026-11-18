/**
 * Formato de números según el idioma elegido en el juego (no el del celular): en español 5.000 y 1.912.000.
 * `compact` abrevia desde un millón: 1,91 M.
 */
import { useSettings } from '../stores/settingsStore';

const LOCALES: Record<string, string> = { es: 'es-CO', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR' };

export function numLocale(): string {
  return LOCALES[useSettings.getState().language] ?? 'es-CO';
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString(numLocale());
}

export function compact(n: number): string {
  if (Math.abs(n) < 1_000_000) return fmt(n);
  const loc = numLocale();
  if (Math.abs(n) >= 1_000_000_000) return `${(Math.floor(n / 10_000_000) / 100).toLocaleString(loc, { maximumFractionDigits: 2 })} MM`;
  return `${(Math.floor(n / 10_000) / 100).toLocaleString(loc, { maximumFractionDigits: 2 })} M`;
}
