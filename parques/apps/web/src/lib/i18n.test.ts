import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { dataKeys } from './i18nKeys';
import { LOCALES } from './locales';
import { translate } from './i18n';

function codeKeys(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...codeKeys(p));
    else if (/\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts')) {
      for (const m of readFileSync(p, 'utf8').matchAll(/\b(?:t|tr)\(\s*'((?:[^'\\]|\\.)*)'/g)) out.push(m[1]!.replace(/\\'/g, "'"));
    }
  }
  return out;
}

const KEYS = [...new Set([...codeKeys(join(__dirname, '..')), ...dataKeys()])].filter(Boolean);
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('idiomas', () => {
  it('todos los textos tienen traducción al inglés, portugués y francés', () => {
    const missing = KEYS.filter((k) => !LOCALES[k]);
    expect(missing).toEqual([]);
    expect(KEYS.length).toBeGreaterThan(400);
  });

  it('las traducciones conservan las variables', () => {
    for (const [k, tr] of Object.entries(LOCALES)) for (const v of tr) expect(vars(v), `${k} → ${v}`).toEqual(vars(k));
  });

  it('traduce con variables y mensajes con números del servidor', () => {
    expect(translate('en', 'Necesitas nivel {n}', { n: 5 })).toBe('You need level 5');
    expect(translate('pt', 'Necesitas nivel 100')).toBe('Você precisa do nível 100');
    expect(translate('fr', 'Tienda')).toBe('Boutique');
    expect(translate('es', 'Tienda')).toBe('Tienda');
  });
});
