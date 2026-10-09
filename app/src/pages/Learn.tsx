import { ChevronLeft, ChevronRight, Dumbbell, Layers } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { GuideIcon } from '../components/GuideIcon';
import { Section } from '../components/ui';
import { EXERCISES } from '../data/exercises';
import { GUIDES, guideSummary, guideTitle } from '../data/guides';
import { PROGRAMS } from '../data/programs';
import { t, tp } from '../i18n';

// Guides, the exercise library and the program list in one place.
export default function Learn() {
    const navigate = useNavigate();
    const [first, ...rest] = GUIDES;
    return (
        <div className="space-y-6">
            <header className="flex items-center gap-2 px-2 pt-4">
                <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="rounded-lg p-2 text-white/60 hover:bg-ink-3 hover:text-white"><ChevronLeft size={22} /></button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('learn.title')}</h1>
                    <p className="text-sm text-white/55">{t('learn.subtitle')}</p>
                </div>
            </header>

            <Section>
                <Link to={`/aprende/${first.id}`} className="block rounded-3xl bg-gradient-to-br from-brand to-amber-500 p-5 text-snow shadow-lg shadow-brand/25 active:scale-[0.99]">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-black/15"><GuideIcon icon={first.icon} size={22} /></span>
                    <p className="text-xs font-bold uppercase tracking-wider text-snow/80">{t('learn.beginners')}</p>
                    <p className="text-xl font-extrabold">{guideTitle(first)}</p>
                    <p className="mt-1 text-sm text-snow/90">{guideSummary(first)}</p>
                </Link>
            </Section>

            <Section title={t('learn.guides')}>
                <div className="card divide-y divide-line">
                    {rest.map(g => (
                        <Link key={g.id} to={`/aprende/${g.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-ink-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><GuideIcon icon={g.icon} /></span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-medium">{guideTitle(g)}</span>
                                <span className="block truncate text-xs text-white/50">{guideSummary(g)}</span>
                            </span>
                            <ChevronRight size={16} className="shrink-0 text-white/30" />
                        </Link>
                    ))}
                </div>
            </Section>

            <Section title={t('learn.more')}>
                <div className="space-y-2">
                    <Link to="/ejercicios" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                        <Dumbbell className="shrink-0 text-brand" />
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{t('routines.library')}</span>
                            <span className="block text-sm text-white/50">{tp('exercises.subtitle', EXERCISES.length)}</span>
                        </span>
                        <ChevronRight className="shrink-0 text-white/40" />
                    </Link>
                    <Link to="/programas" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                        <Layers className="shrink-0 text-brand" />
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{t('programs.title')}</span>
                            <span className="block text-sm text-white/50">{t('programs.count', { n: PROGRAMS.length, premium: PROGRAMS.filter(p => p.premium).length })}</span>
                        </span>
                        <ChevronRight className="shrink-0 text-white/40" />
                    </Link>
                </div>
            </Section>
        </div>
    );
}
