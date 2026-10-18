import { Eye, Globe2, HeartHandshake, Lock, MessageSquareHeart, Rocket, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BackHeader, Photo, Section } from '../components/ui';
import { namedCover } from '../data/covers';
import { LANGS, t, type Key } from '../i18n';

const VALUES: [string, ReactNode][] = [
    ['simple', <Sparkles size={18} />],
    ['honest', <ShieldCheck size={18} />],
    ['privacy', <Lock size={18} />],
    ['community', <Users size={18} />],
    ['everyone', <Globe2 size={18} />],
];

// Ajustes → Sobre nosotros: who we are, our mission and our vision.
export default function AboutUs() {
    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('aboutUs.title')} subtitle={t('aboutUs.hint')} icon={<HeartHandshake size={20} />} />
            <Section>
                <div className="card relative overflow-hidden p-5 text-snow">
                    <Photo photo={{ ...namedCover('mujer-barra'), position: '59% 35%' }} />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
                    <p className="relative mt-16 text-2xl font-extrabold tracking-tight">Fitness Life</p>
                    <p className="relative mt-1 text-sm text-snow/85">{t('aboutUs.intro')}</p>
                </div>
            </Section>
            <Section>
                <div className="space-y-2">
                    <article className="card p-4">
                        <h2 className="mb-1.5 flex items-center gap-2 font-bold"><Target size={18} className="text-brand" /> {t('aboutUs.mission')}</h2>
                        <p className="text-sm leading-relaxed text-white/75">{t('aboutUs.missionText')}</p>
                    </article>
                    <article className="card p-4">
                        <h2 className="mb-1.5 flex items-center gap-2 font-bold"><Eye size={18} className="text-brand" /> {t('aboutUs.vision')}</h2>
                        <p className="text-sm leading-relaxed text-white/75">{t('aboutUs.visionText')}</p>
                    </article>
                </div>
            </Section>
            <Section title={t('aboutUs.values')}>
                <ul className="card divide-y divide-line">
                    {VALUES.map(([id, icon]) => (
                        <li key={id} className="flex gap-3 p-4">
                            <span className="mt-0.5 shrink-0 text-brand">{icon}</span>
                            <span>
                                <span className="block font-semibold">{t(`aboutUs.value.${id}` as Key)}</span>
                                <span className="block text-sm text-white/65">{t(`aboutUs.value.${id}.text` as Key)}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </Section>
            <Section>
                <div className="card flex items-center gap-3 p-4">
                    <Rocket size={20} className="shrink-0 text-brand" />
                    <p className="text-sm text-white/75">{t('aboutUs.today', { languages: LANGS.length })}</p>
                </div>
                <Link to="/comentarios" className="btn-primary mt-3 w-full"><MessageSquareHeart size={18} /> {t('aboutUs.write')}</Link>
            </Section>
        </div>
    );
}
