import { Camera, ChevronRight, Cloud, Crown, Download, ImageIcon, Languages, LogOut, Monitor, Moon, RotateCcw, Sun, Trash2, Upload, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { Avatar } from '../components/Avatar';
import { Chips, PageHeader, Section, Sheet } from '../components/ui';
import { pickProgram, programName } from '../data/programs';
import { getLang, LANGS, locale, t, tp, type Lang } from '../i18n';
import { authAvailable, deleteAccount, signOut } from '../lib/auth';
import { ACHIEVEMENTS, unlockedAchievements } from '../lib/achievements';
import { fmtDate } from '../lib/format';
import { blobToDataUrl, pickImage, resizeImage } from '../lib/image';
import { streakWeeks } from '../lib/stats';
import { planName } from '../lib/names';
import type { Theme } from '../lib/theme';
import { fallbackPlan, premiumAvailable, refreshPremium } from '../lib/premium';
import { saveFile } from '../lib/native';
import { actions, getSaveError, useStore } from '../store/store';
import type { Goal, Level, Setup } from '../store/types';

export default function Settings() {
    const profile = useStore(s => s.profile)!;
    const plan = useStore(s => s.plan);
    const sessionsCount = useStore(s => s.sessions.length);
    const theme = useStore(s => s.theme ?? 'system');
    const fileRef = useRef<HTMLInputElement>(null);

    const proposed = pickProgram(profile.setup, profile.daysPerWeek);
    const proposedName = programName(proposed);
    const planChanged = plan?.programId !== proposed.id;

    const download = async () => {
        try {
            await saveFile(`fitness-life-${new Date().toISOString().slice(0, 10)}.json`, actions.exportData());
            toast(t('settings.exported'));
        } catch {
            toast(t('settings.exportFailed'));
        }
    };

    const restore = async (file: File) => {
        const ok = await confirm({ title: t('settings.restore.title'), message: t('settings.restore.message'), confirmLabel: t('settings.restore.confirm'), danger: true });
        if (!ok) return;
        try {
            actions.importData(await file.text());
            toast(t('settings.restored'));
        } catch (e) {
            toast(e instanceof Error ? e.message : t('backup.invalid'));
        }
    };

    const regenerate = async () => {
        const ok = await confirm({ title: t('settings.newPlan.title', { name: proposedName }), message: t('settings.newPlan.message'), confirmLabel: t('settings.newPlan.confirm') });
        if (!ok) return;
        actions.regeneratePlan();
        toast(t('settings.planUpdated', { name: proposedName }));
    };

    const reset = async () => {
        const ok = await confirm({ title: t('settings.reset.title'), message: t('settings.reset.message'), confirmLabel: t('settings.reset.confirm'), danger: true });
        if (ok) actions.resetAll();
    };

    return (
        <div className="space-y-6">
            <PageHeader title={t('nav.settings')} />

            <ProfileHero />
            {authAvailable() && <AccountCard />}
            <PremiumCard />

            <Section title={t('settings.language')}>
                <div className="card flex items-center gap-3 p-4">
                    <Languages size={20} className="shrink-0 text-brand" />
                    <Chips<Lang> label={t('settings.language')} value={getLang()} onChange={lang => actions.setLanguage(lang)}
                        options={LANGS.map(l => ({ value: l.code, label: l.label }))} />
                </div>
            </Section>

            <Section title={t('settings.appearance')}>
                <div className="card grid grid-cols-3 gap-1 p-1" role="radiogroup" aria-label={t('settings.appearance')}>
                    {([['system', Monitor], ['light', Sun], ['dark', Moon]] as const).map(([value, Icon]) => (
                        <button key={value} role="radio" aria-checked={theme === value} onClick={() => actions.setTheme(value as Theme)}
                            className={`flex flex-col items-center gap-1 rounded-xl py-3 text-sm font-medium transition ${theme === value ? 'bg-brand-soft text-brand-strong' : 'text-white/60 hover:text-white'}`}>
                            <Icon size={20} />
                            {t(`theme.${value}`)}
                        </button>
                    ))}
                </div>
            </Section>

            <Section title={t('settings.profile')}>
                <div className="card space-y-5 p-4">
                    <label className="block">
                        <span className="label mb-2 block">{t('settings.name')}</span>
                        <input value={profile.name} onChange={e => actions.updateProfile({ name: e.target.value })} placeholder={t('onboarding.namePlaceholder')}
                            className="w-full rounded-xl border border-line bg-ink px-3 py-2.5 outline-none focus:border-brand" />
                    </label>
                    <div>
                        <p className="label mb-2">{t('settings.goal')}</p>
                        <Chips<Goal> label={t('settings.goal')} value={profile.goal} onChange={goal => actions.updateProfile({ goal })}
                            options={[{ value: 'musculo', label: t('goal.musculo.short') }, { value: 'fuerza', label: t('goal.fuerza.short') }, { value: 'salud', label: t('goal.salud.short') }]} />
                    </div>
                    <div>
                        <p className="label mb-2">{t('settings.level')}</p>
                        <Chips<Level> label={t('settings.level')} value={profile.level} onChange={level => actions.updateProfile({ level })}
                            options={[{ value: 'principiante', label: t('level.principiante') }, { value: 'intermedio', label: t('level.intermedio') }, { value: 'avanzado', label: t('level.avanzado') }]} />
                    </div>
                    <div>
                        <p className="label mb-2">{t('settings.days')}</p>
                        <Chips<number> label={t('settings.days')} value={profile.daysPerWeek} onChange={daysPerWeek => actions.updateProfile({ daysPerWeek })}
                            options={[2, 3, 4, 5, 6].map(d => ({ value: d, label: String(d) }))} />
                    </div>
                    <div>
                        <p className="label mb-2">{t('settings.setup')}</p>
                        <Chips<Setup> label={t('settings.setup')} value={profile.setup} onChange={setup => actions.updateProfile({ setup })}
                            options={[{ value: 'gimnasio', label: t('setup.gimnasio.short') }, { value: 'mancuernas', label: t('setup.mancuernas.short') }, { value: 'casa', label: t('setup.casa.short') }]} />
                    </div>
                    <div>
                        <p className="label mb-2">{t('settings.units')}</p>
                        <Chips label={t('settings.units')} value={profile.unit} onChange={unit => actions.updateProfile({ unit })}
                            options={[{ value: 'kg', label: 'kg' }, { value: 'lbs', label: 'lb' }]} />
                    </div>
                </div>
            </Section>

            <Section title={t('settings.plan')}>
                <div className="card p-4">
                    <p className="font-semibold">{plan ? planName(plan) : t('settings.noPlan')}</p>
                    <p className="mb-3 text-sm text-white/55">
                        {planChanged ? t('settings.planFits', { name: proposedName }) : t('settings.planAdjusts')}
                    </p>
                    <button onClick={regenerate} className={planChanged ? 'btn-primary w-full' : 'btn-ghost w-full'}>
                        <RotateCcw size={16} /> {planChanged ? t('settings.switchTo', { name: proposedName }) : t('settings.regenerate')}
                    </button>
                </div>
            </Section>

            <Section title={t('settings.data')}>
                <div className="card space-y-3 p-4">
                    <p className="text-sm text-white/60">{tp('settings.dataInfo', sessionsCount)}</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={download} className="btn-ghost"><Download size={16} /> {t('settings.export')}</button>
                        <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload size={16} /> {t('settings.import')}</button>
                    </div>
                    <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
                    <button onClick={reset} className="btn-danger w-full">{t('settings.reset')}</button>
                </div>
                {getSaveError() && (
                    <p role="alert" className="mt-2 text-sm text-red-400">{t('settings.saveError', { error: getSaveError() ?? '' })}</p>
                )}
            </Section>

            <div className="space-y-1 px-4 pb-4 text-center text-xs text-white/30">
                <p>{t('settings.footer')}</p>
                <p>{t('settings.photoCredit')}</p>
            </div>
        </div>
    );
}

// Picture, name and the numbers that matter, at the top of Ajustes.
const ProfileHero = () => {
    const profile = useStore(s => s.profile)!;
    const sessions = useStore(s => s.sessions);
    const email = useStore(s => s.account?.email);
    const [choosing, setChoosing] = useState(false);
    const medals = useMemo(() => unlockedAchievements(sessions, profile.daysPerWeek).size, [sessions, profile.daysPerWeek]);

    const choose = async (camera: boolean) => {
        setChoosing(false);
        const file = await pickImage({ camera });
        if (!file) return;
        try {
            // 320 px square: sharp on any screen, light enough to keep on the phone.
            actions.updateProfile({ avatar: await blobToDataUrl(await resizeImage(file, 320, { square: true, quality: 0.85 })) });
            toast(t('profile.photoSaved'));
        } catch {
            toast(t('meal.photoFailed'));
        }
    };

    const stats: [number, string][] = [
        [sessions.length, t('profile.workouts')],
        [streakWeeks(sessions), t('profile.streak')],
        [medals, t('profile.medals', { total: ACHIEVEMENTS.length })],
    ];
    return (
        <Section>
            <div className="card relative overflow-hidden p-5">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(80%_100%_at_50%_0%,rgb(var(--brand)/0.28),transparent_75%)]" />
                <div className="relative flex flex-col items-center text-center">
                    <button onClick={() => setChoosing(true)} aria-label={t('profile.changePhoto')} className="relative rounded-full p-1 transition active:scale-95"
                        style={{ background: 'linear-gradient(135deg, rgb(var(--brand)), #fbbf24)' }}>
                        <Avatar src={profile.avatar} name={profile.name || email} size={96} className="border-4 border-ink-2" />
                        <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-2 bg-brand text-snow shadow-lg"><Camera size={15} /></span>
                    </button>
                    <p className="mt-3 text-xl font-bold tracking-tight">{profile.name || t('profile.noName')}</p>
                    <p className="text-sm text-white/55">{email ?? `${t(`goal.${profile.goal}`)} · ${t(`level.${profile.level}`)}`}</p>
                </div>
                <dl className="relative mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl bg-ink-3/60 py-3 text-center">
                    {stats.map(([value, label]) => (
                        <div key={label}>
                            <dd className="text-xl font-bold tabular-nums">{value}</dd>
                            <dt className="text-[11px] text-white/55">{label}</dt>
                        </div>
                    ))}
                </dl>
            </div>
            <Sheet open={choosing} onClose={() => setChoosing(false)} title={t('profile.changePhoto')}>
                <div className="space-y-2">
                    <button className="btn-primary w-full" onClick={() => choose(true)}><Camera size={18} /> {t('meal.photo')}</button>
                    <button className="btn-ghost w-full" onClick={() => choose(false)}><ImageIcon size={18} /> {t('profile.fromGallery')}</button>
                    {profile.avatar && (
                        <button className="btn-ghost w-full text-red-500" onClick={() => { actions.updateProfile({ avatar: undefined }); setChoosing(false); }}>
                            <Trash2 size={18} /> {t('profile.removePhoto')}
                        </button>
                    )}
                </div>
            </Sheet>
        </Section>
    );
};

const AccountCard = () => {
    const account = useStore(s => s.account);
    const syncedAt = useStore(s => s.cloudSyncedAt);
    if (!account) {
        return (
            <Section title={t('account.section')}>
                <Link to="/cuenta" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><UserRound size={20} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold">{t('account.cta')}</p>
                        <p className="text-sm text-white/55">{t('account.ctaHint')}</p>
                    </div>
                    <ChevronRight className="shrink-0 text-white/40" />
                </Link>
            </Section>
        );
    }
    const out = async () => {
        if (!(await confirm({ title: t('account.signOutTitle'), message: t('account.signOutMessage'), confirmLabel: t('account.signOut') }))) return;
        await signOut().catch(() => {});
        toast(t('account.signedOut'));
    };
    const remove = async () => {
        if (!(await confirm({ title: t('account.deleteTitle'), message: t('account.deleteMessage'), confirmLabel: t('account.delete'), danger: true }))) return;
        try {
            await deleteAccount();
            actions.resetAll();
            toast(t('account.deleted'));
        } catch {
            toast(t('auth.err.failed'));
        }
    };
    const provider = ['google', 'apple'].includes(account.provider) ? account.provider : 'email';
    return (
        <Section title={t('account.section')}>
            <div className="card p-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold uppercase text-snow">
                        {(account.email ?? '?').slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{account.email}</p>
                        <p className="text-sm text-white/55">{t('account.signedIn', { provider: t(`account.via.${provider}` as 'account.via.email') })}</p>
                    </div>
                </div>
                <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
                    <Cloud size={14} className="text-good" />
                    {syncedAt ? t('account.synced', { when: new Date(syncedAt).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }) }) : t('account.syncPending')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="btn-ghost" onClick={out}><LogOut size={16} /> {t('account.signOut')}</button>
                    <button className="btn-ghost text-red-500" onClick={remove}><Trash2 size={16} /> {t('account.delete')}</button>
                </div>
            </div>
        </Section>
    );
};

const PremiumCard = () => {
    const premium = useStore(s => s.premium);
    useEffect(() => {
        if (premiumAvailable()) refreshPremium().catch(() => {});
    }, []);
    return (
        <Section title="Premium">
            <Link to="/premium" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-300 text-ink"><Crown size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{premium?.active ? t('premium.active') : 'Fitness Life Premium'}</p>
                    <p className="text-sm text-white/55">
                        {premium?.active
                            ? premium.expiresAt ? t(premium.willRenew ? 'premium.renews' : 'premium.endsOn', { date: fmtDate(premium.expiresAt) }) : t('premium.noExpiry')
                            : t('settings.premiumPitch', { price: fallbackPlan('annual').perMonth })}
                    </p>
                </div>
                <ChevronRight className="shrink-0 text-white/40" />
            </Link>
        </Section>
    );
};
