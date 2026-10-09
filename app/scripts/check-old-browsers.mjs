// Fails if the build uses CSS or JavaScript that old Android WebViews
// (Chrome 70+, e.g. an Android 11 phone that never updated) can't read.
// Run after `npm run build`. postcss.config.js and vite.config.ts do the
// rewriting; this keeps it from silently breaking.
import { parse } from 'acorn';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../dist/assets/', import.meta.url).pathname;
const problems = [];

for (const file of readdirSync(dir)) {
    const text = readFileSync(join(dir, file), 'utf8');
    if (file.endsWith('.css')) {
        // A rule with :where() is dropped whole by Chrome < 88.
        if (text.includes(':where(')) problems.push(`${file}: :where() (Chrome 88+)`);
        // Every dvh needs a vh line just before it.
        for (const m of text.matchAll(/([\w-]+):([^;{}]*\d)dvh/g)) {
            if (!text.includes(`${m[1]}:${m[2]}vh;${m[0]}`)) problems.push(`${file}: ${m[0]} has no vh fallback`);
        }
    }
    if (file.endsWith('.js')) {
        const found = new Set();
        const walk = node => {
            if (!node || typeof node.type !== 'string') return;
            if (node.type === 'ChainExpression') found.add('?.');
            if (node.type === 'LogicalExpression' && node.operator === '??') found.add('??');
            if (node.type === 'AssignmentExpression' && ['??=', '||=', '&&='].includes(node.operator)) found.add(node.operator);
            if (node.type === 'PropertyDefinition' || node.type === 'PrivateIdentifier' || node.type === 'StaticBlock') found.add('class fields');
            for (const key in node) {
                const value = node[key];
                if (Array.isArray(value)) value.forEach(walk);
                else if (value && typeof value === 'object') walk(value);
            }
        };
        walk(parse(text, { ecmaVersion: 2022, sourceType: 'module' }));
        if (found.size) problems.push(`${file}: ${[...found].join(', ')} (too new for Chrome 70)`);
    }
}

if (problems.length) {
    console.error('The build would break on old Android phones:\n- ' + problems.join('\n- '));
    process.exit(1);
}
console.log('Build is readable by old Android WebViews (Chrome 70+).');
