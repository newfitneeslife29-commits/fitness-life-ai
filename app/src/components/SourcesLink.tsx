import { BookOpenCheck, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SOURCES, type SourceTopic } from '../data/sources';
import { t } from '../i18n';
import { openLink } from '../lib/native';
import { Sheet } from './ui';

// The sources of one topic, each a link to the study or guideline.
export const SourceList = ({ topic, highlight = false }: { topic: SourceTopic; highlight?: boolean }) => (
    <ul className={`card divide-y divide-line overflow-hidden ${highlight ? 'ring-2 ring-brand' : ''}`}>
        {SOURCES[topic].map(s => (
            <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                    onClick={e => { e.preventDefault(); void openLink(s.url); }}
                    className="flex items-start gap-3 p-4 hover:bg-ink-3">
                    <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">{s.title}</span>
                        <span className="mt-0.5 block text-sm text-white/55">{s.by}</span>
                    </span>
                    <ExternalLink size={16} className="mt-1 shrink-0 text-brand" />
                </a>
            </li>
        ))}
    </ul>
);

// "Sources": a small link next to a health number or tip. It shows where that
// number comes from, with links to each source (App Store guideline 1.4.1).
// `all` adds a way to the page with every source (not during sign-up, where
// the app has no pages yet).
export const SourcesLink = ({ topics, all = true, className = '' }: { topics: SourceTopic[]; all?: boolean; className?: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}
                className={`inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-2 hover:underline ${className}`}>
                <BookOpenCheck size={13} /> {t('sources.link')}
            </button>
            <Sheet open={open} onClose={() => setOpen(false)} title={t('sources.title')}>
                <div className="space-y-4">
                    {topics.map(k => (
                        <div key={k}>
                            <h3 className="label mb-2">{t(`sources.topic.${k}`)}</h3>
                            <SourceList topic={k} />
                        </div>
                    ))}
                    <p className="text-xs leading-relaxed text-white/45">{t('sources.note')}</p>
                    {all && (
                        <Link to="/fuentes" onClick={() => setOpen(false)} className="btn-ghost w-full">
                            {t('sources.all')} <ChevronRight size={16} />
                        </Link>
                    )}
                </div>
            </Sheet>
        </>
    );
};
