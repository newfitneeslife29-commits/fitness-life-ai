import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A Capacitor plugin can't be the value of a promise: awaiting it calls a
// native "then" that doesn't exist, the await never ends and the feature is
// silently dead on phones (push notifications were, until Sentry caught it).
// Loaders return the module, and callers take the plugin out after the await.
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const path = join(dir, e.name);
    return e.isDirectory() ? files(path) : /\.tsx?$/.test(e.name) && !e.name.includes('.test.') ? [path] : [];
});

describe('Capacitor plugins', () => {
    it('are never the value of a promise', () => {
        const bad = /import\('@(capacitor|capgo|capawesome)[^']*'\)\.then\(\s*\w+\s*=>\s*\w+\.[A-Z]|\(await import\('@(capacitor|capgo|capawesome)[^']*'\)\)\.[A-Z]\w*;/;
        const found = files(join(import.meta.dirname, '..')).filter(f => bad.test(readFileSync(f, 'utf8')));
        expect(found).toEqual([]);
    });
});
