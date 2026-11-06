import { BookOpenCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SourceList } from '../components/SourcesLink';
import { BackHeader, Section } from '../components/ui';
import { SOURCE_TOPICS, SOURCES, type SourceTopic } from '../data/sources';
import { t } from '../i18n';

// Where the app's health numbers and advice come from, with a link to each
// source (Ajustes → Fuentes y referencias).
export default function Sources() {
    const [params] = useSearchParams();
    const topic = params.get('tema') as SourceTopic | null;

    useEffect(() => {
        if (!topic || !SOURCES[topic]) return;
        const id = window.requestAnimationFrame(() => document.getElementById(`fuente-${topic}`)?.scrollIntoView({ block: 'start' }));
        return () => window.cancelAnimationFrame(id);
    }, [topic]);

    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('sources.title')} subtitle={t('sources.subtitle')} icon={<BookOpenCheck size={20} />} />
            <Section>
                <p className="card p-4 text-[15px] leading-relaxed text-white/80">{t('sources.intro')}</p>
            </Section>
            {SOURCE_TOPICS.map(k => (
                <Section key={k} id={`fuente-${k}`} title={t(`sources.topic.${k}`)}>
                    <SourceList topic={k} highlight={k === topic} />
                </Section>
            ))}
            <Section>
                <p className="px-1 text-sm leading-relaxed text-white/55">{t('sources.note')}</p>
            </Section>
        </div>
    );
}
