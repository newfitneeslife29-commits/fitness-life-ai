import { Activity, Bot, Dumbbell, CircleSlash, CreditCard, ExternalLink, Mail, MessageSquareHeart, ShieldCheck, Smartphone, Trash2, UsersRound, Cloud } from 'lucide-react';
import type { ReactNode } from 'react';
import { BackHeader, Section } from '../components/ui';
import { getLang, t, type Key } from '../i18n';
import { LEGAL_URL } from '../lib/premium';

const SECTIONS: [number, ReactNode][] = [
    [1, <Smartphone size={18} />], [2, <Cloud size={18} />], [3, <Bot size={18} />], [4, <UsersRound size={18} />],
    [5, <MessageSquareHeart size={18} />], [6, <Activity size={18} />], [7, <CreditCard size={18} />],
    [8, <CircleSlash size={18} />], [11, <Dumbbell size={18} />], [9, <Trash2 size={18} />], [10, <Mail size={18} />],
];
const ANCHOR = { es: 'privacidad', pt: 'privacidade' } as Record<string, string>;

// The privacy policy, in plain words, inside the app (Ajustes → Privacidad).
export default function Privacy() {
    return (
        <div className="space-y-5 pb-4">
            <BackHeader title={t('privacy.title')} subtitle={t('privacy.updated')} icon={<ShieldCheck size={20} />} />
            <Section>
                <p className="card p-4 text-[15px] leading-relaxed text-white/80">{t('privacy.intro')}</p>
            </Section>
            <Section>
                <div className="space-y-2">
                    {SECTIONS.map(([n, icon]) => (
                        <article key={n} className="card p-4">
                            <h2 className="mb-1.5 flex items-center gap-2 font-semibold"><span className="text-brand">{icon}</span>{t(`privacy.s${n}.title` as Key)}</h2>
                            <p className="text-sm leading-relaxed text-white/70">{t(`privacy.s${n}.body` as Key)}</p>
                        </article>
                    ))}
                </div>
            </Section>
            <Section>
                <a href={`${LEGAL_URL}#${ANCHOR[getLang()] ?? 'privacy'}`} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">
                    <ExternalLink size={16} /> {t('privacy.full')}
                </a>
            </Section>
        </div>
    );
}
