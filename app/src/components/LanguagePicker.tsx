import { Check, ChevronRight, Languages, Search } from 'lucide-react';
import { useState } from 'react';
import { getLang, langInfo, LANGS, t, type Lang } from '../i18n';
import { actions, useStore } from '../store/store';
import { toast } from './feedback';
import { Sheet } from './ui';

// Change the language, and say so in the new one.
const choose = async (lang: Lang, done: () => void) => {
    if (lang === getLang()) return done();
    try {
        await actions.setLanguage(lang);
        done();
        toast(t('language.changed', { lang: langInfo(lang).label }), 3200);
    } catch {
        toast(t('language.failed'), 4000);
    }
};

// Every language the app speaks, with its country's flag and a search box.
export const LanguageSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    useStore(s => s.lang);
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState<Lang | null>(null);
    const q = query.trim().toLowerCase();
    const shown = q ? LANGS.filter(l => `${l.label} ${l.english} ${l.code}`.toLowerCase().includes(q)) : LANGS;
    const close = () => { setQuery(''); onClose(); };
    return (
        <Sheet open={open} onClose={close} title={t('settings.language')}>
            <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2.5 focus-within:border-brand">
                <Search size={16} className="shrink-0 text-white/40" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('language.search')} aria-label={t('language.search')}
                    className="min-w-0 flex-1 bg-transparent outline-none" />
            </label>
            <ul role="radiogroup" aria-label={t('settings.language')} className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {shown.map(l => {
                    const on = l.code === getLang();
                    return (
                        <li key={l.code}>
                            <button role="radio" aria-checked={on} disabled={busy !== null}
                                onClick={() => { setBusy(l.code); void choose(l.code, close).finally(() => setBusy(null)); }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${on ? 'bg-brand-soft' : 'hover:bg-ink-3'}`}>
                                <span aria-hidden className="text-2xl leading-none">{l.flag}</span>
                                <span className="min-w-0 flex-1">
                                    <span className={`block font-medium ${on ? 'text-brand-strong' : ''}`}>{l.label}</span>
                                    <span className="block text-xs text-white/50">{l.english}</span>
                                </span>
                                {busy === l.code ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                                    : on && <Check size={18} className="text-brand" />}
                            </button>
                        </li>
                    );
                })}
                {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-white/50">{t('language.none')}</li>}
            </ul>
        </Sheet>
    );
};

// The row in Ajustes: the current language; tap to see them all.
export const LanguageRow = () => {
    useStore(s => s.lang);
    const [open, setOpen] = useState(false);
    const info = langInfo();
    return (
        <>
            <button onClick={() => setOpen(true)} className="card flex w-full items-center gap-3 p-4 text-left hover:bg-ink-3">
                <Languages size={20} className="shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                    <span className="block font-medium">{info.flag} {info.label}</span>
                    <span className="block text-sm text-white/55">{t('language.count', { n: LANGS.length })}</span>
                </span>
                <ChevronRight className="shrink-0 text-white/40" />
            </button>
            <LanguageSheet open={open} onClose={() => setOpen(false)} />
        </>
    );
};

// A small flag button (welcome screen) that opens the same list.
export const LanguageButton = ({ className = '' }: { className?: string }) => {
    useStore(s => s.lang);
    const [open, setOpen] = useState(false);
    const info = langInfo();
    return (
        <>
            <button onClick={() => setOpen(true)} aria-label={`${t('settings.language')}: ${info.label}`}
                className={`flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1.5 text-xs font-semibold uppercase ${className}`}>
                <span aria-hidden className="text-base leading-none">{info.flag}</span> {info.code}
            </button>
            <LanguageSheet open={open} onClose={() => setOpen(false)} />
        </>
    );
};
