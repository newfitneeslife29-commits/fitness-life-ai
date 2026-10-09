import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GuideIcon } from '../components/GuideIcon';
import { Section } from '../components/ui';
import { getGuide, GUIDES, guideSummary, guideTitle } from '../data/guides';
import { l10n, t } from '../i18n';

export default function GuideDetail() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const guide = getGuide(id);
    if (!guide) return <p className="p-6 text-center text-white/60">{t('learn.notFound')}</p>;
    const next = GUIDES[(GUIDES.indexOf(guide) + 1) % GUIDES.length];

    return (
        <div className="space-y-5 pb-4">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><GuideIcon icon={guide.icon} /></span>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold leading-tight">{guideTitle(guide)}</h1>
                    <p className="text-sm text-white/55">{guideSummary(guide)}</p>
                </div>
            </header>

            <Section>
                <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                        <li key={i} className="card flex gap-3 p-4">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-snow">{i + 1}</span>
                            <p className="text-[15px] leading-relaxed text-white/85">{l10n(step)}</p>
                        </li>
                    ))}
                </ol>
            </Section>

            <Section title={t('learn.next')}>
                <Link to={`/aprende/${next.id}`} replace className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><GuideIcon icon={next.icon} /></span>
                    <span className="min-w-0 flex-1 font-semibold">{guideTitle(next)}</span>
                    <ChevronRight className="shrink-0 text-white/40" />
                </Link>
            </Section>
        </div>
    );
}
