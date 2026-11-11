// Imprime las claves de texto que faltan en locales.ts (uso: npx tsx scripts/i18n-keys.ts)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { dataKeys } from '../src/lib/i18nKeys';
import { LOCALES } from '../src/lib/locales';

export function codeKeys(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts')) {
        const src = readFileSync(p, 'utf8');
        for (const m of src.matchAll(/\b(?:t|tr)\(\s*'((?:[^'\\]|\\.)*)'/g)) out.push(m[1]!.replace(/\\'/g, "'"));
      }
    }
  };
  walk(dir);
  return out;
}

const all = [...new Set([...codeKeys(new URL('../src', import.meta.url).pathname), ...dataKeys()])].filter(Boolean);
const missing = all.filter((k) => !LOCALES[k]);
console.log(JSON.stringify({ total: all.length, missing }, null, 1));
