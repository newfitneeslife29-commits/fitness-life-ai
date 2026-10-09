// Old Android phones that never updated "Android System WebView" run an old
// Chrome (Android 11 ships with 83). Such a browser drops a whole CSS rule
// when one part of it is new, so the build rewrites what it doesn't know:
// - :where(x) → x (Chrome 88). Tailwind's base styles use it, e.g. for the
//   transparent button background; without it every button turns white.
// - dvh (Chrome 108) gets a vh line before it, so heights still apply.
// - aspect-ratio (Chrome 88) gets a padding fallback, so photo frames keep
//   their shape instead of collapsing.

const unwrapWhere = selector => {
    let out = '';
    for (let i = 0; i < selector.length; i++) {
        if (!selector.startsWith(':where(', i)) {
            out += selector[i];
            continue;
        }
        let depth = 1;
        let j = i + ':where('.length;
        const start = j;
        for (; j < selector.length && depth > 0; j++) {
            if (selector[j] === '(') depth++;
            else if (selector[j] === ')') depth--;
        }
        out += unwrapWhere(selector.slice(start, j - 1));
        i = j - 1;
    }
    return out;
};

const oldWebView = () => ({
    postcssPlugin: 'old-webview',
    Rule(rule) {
        if (rule.selector.includes(':where(')) rule.selector = unwrapWhere(rule.selector);
    },
    Declaration(decl, { AtRule, Rule }) {
        if (/\ddvh\b/.test(decl.value)) {
            decl.cloneBefore({ value: decl.value.replace(/(\d)dvh\b/g, '$1vh') });
        }
        const ratio = decl.prop === 'aspect-ratio' && /^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/.exec(decl.value);
        const rule = decl.parent;
        if (ratio && rule.type === 'rule' && !rule.selector.includes('::')) {
            const pct = `${+((+ratio[2] / +ratio[1]) * 100).toFixed(4)}%`;
            const fallback = new AtRule({ name: 'supports', params: 'not (aspect-ratio: 1 / 1)' });
            fallback.append(
                new Rule({ selector: rule.selectors.map(s => `${s}::before`).join(','), nodes: [] })
                    .append({ prop: 'content', value: '""' }, { prop: 'float', value: 'left' }, { prop: 'padding-top', value: pct }),
                new Rule({ selector: rule.selectors.map(s => `${s}::after`).join(','), nodes: [] })
                    .append({ prop: 'content', value: '""' }, { prop: 'display', value: 'block' }, { prop: 'clear', value: 'both' }),
            );
            (rule.parent.type === 'atrule' ? rule.parent : rule).after(fallback);
        }
    },
});
oldWebView.postcss = true;

export default {
    plugins: [(await import('tailwindcss')).default, (await import('autoprefixer')).default, oldWebView],
};
