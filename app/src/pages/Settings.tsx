import { BookOpen, Flame, Gift, Info, UserPlus, Camera, ChevronRight, MessageSquareHeart, RefreshCw, ShieldCheck, Cloud, CloudOff, Crown, BatteryCharging, BellRing, CalendarRange, Download, ImageIcon, Layers, LogOut, Mic, Monitor, Moon, RotateCcw, Sun, Trash2, Upload, UserRound } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { confirm, toast } from '../components/feedback';
import { Avatar } from '../components/Avatar';
import { LanguageRow } from '../components/LanguagePicker';
import { TrainingReminder } from '../components/TrainingReminder';
import { detailsMissing, HomeGearChips, ProfileDetailsSheet } from '../components/ProfileForm';
import { Chips, PageBackdrop, PageHeader, Section, Sheet } from '../components/ui';
import { programName } from '../data/programs';
import { programFor } from '../lib/plan';
import { locale, t, tp } from '../i18n';
import { authAvailable, deleteAccount, signOut } from '../lib/auth';
import { ACHIEVEMENTS } from '../lib/achievements';
import { useUnlocked } from '../lib/useAchievements';
import { fmtDate, fmtWeight } from '../lib/format';
import { ageOf } from '../lib/nutrition';
import { speak, spokenTime, voiceAvailable } from '../lib/voice';
import { useCloudStatus } from '../lib/useOnline';
import { blobToDataUrl, pickImage, resizeImage } from '../lib/image';
import { streakWeeks } from '../lib/stats';
import { planName } from '../lib/names';
import type { Theme } from '../lib/theme';
import { appIconTiming, getAppIcon, setAppIcon } from '../lib/appIcon';
import { APP_ICONS, appIconUrl, type AppIconId } from '../lib/appIcons';
import { fallbackPlan, premiumAvailable, refreshPremium, usePremiumActive } from '../lib/premium';
import { primeSound, restOver, saveFile } from '../lib/native';
import { appVersion, checkForUpdate, useUpdate } from '../lib/updates';
import { actions, getSaveError, getState, useStore } from '../store/store';
import { errorText } from '../lib/errorText';
import type { Goal, Level, Setup } from '../store/types';
import { PauseRow } from '../components/PauseCard';
import { handsFreeSupported } from '../lib/voiceCommands';

const ToggleRow = ({ icon, title, hint, on, onChange, test }: {
    icon: ReactNode; title: string; hint: string; on: boolean; onChange: (on: boolean) => void; test?: { label: string; run: () => void };
}) => (
    <div className="flex items-center gap-3 p-4">
        <span className="shrink-0 text-brand">{icon}</span>
        <div className="min-w-0 flex-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-white/55">{hint}</p>
            {test && <button onClick={test.run} className="mt-1 text-sm font-semibold text-brand">{test.label}</button>}
        </div>
        <button role="switch" aria-checked={on} aria-label={title} onClick={() => onChange(!on)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-ink-4'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
        </button>
    </div>
);

export default function Settings() {
    const profile = useStore(s => s.profile)!;
    // Premium switches open Premium for free users.
    const premium = usePremiumActive();
    const navigate = useNavigate();
    const premiumSwitch = (apply: (on: boolean) => void) => (on: boolean) => (premium ? apply(on) : navigate('/premium'));
    const plan = useStore(s => s.plan);
    const sessionsCount = useStore(s => s.sessions.length);
    const theme = useStore(s => s.theme ?? 'system');
    const fileRef = useRef<HTMLInputElement>(null);

    const proposed = programFor(profile);
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
        if (!ok) return;
        // Signed in: signing out clears this device and keeps the account's
        // copy (resetting while signed in would send the empty data to it).
        if (getState().account) await signOut();
        else actions.resetAll();
    };

    return (
        <div className="relative">
        <PageBackdrop src="./covers/espalda-3.webp" position="51% 30%" />
        <div className="relative space-y-6">
            <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />

            <ProfileHero />
            {authAvailable() && <AccountCard />}
            <PremiumCard />

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
                            options={(['musculo', 'grasa', 'fuerza', 'salud'] as const).map(g => ({ value: g, label: t(`goal.${g}.short`) }))} />
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
                    {profile.setup !== 'gimnasio' && (
                        <div>
                            <p className="label mb-2">{t('gear.question')}</p>
                            <HomeGearChips value={profile.homeGear ?? []} onChange={homeGear => {
                                actions.updateProfile({ homeGear });
                                actions.regeneratePlan();
                                toast(t('gear.updated'));
                            }} />
                        </div>
                    )}
                    <div>
                        <p className="label mb-2">{t('settings.units')}</p>
                        <Chips label={t('settings.units')} value={profile.unit} onChange={unit => actions.updateProfile({ unit })}
                            options={[{ value: 'kg', label: 'kg' }, { value: 'lbs', label: 'lb' }]} />
                    </div>
                </div>
            </Section>

            <Section title={t('profileDetails.title')}>
                <DetailsCard />
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
                    <Link to="/programas" className="btn-ghost mt-2 w-full"><Layers size={16} /> {t('programs.seeAll')}</Link>
                </div>
            </Section>

            <Section title={t('settings.workout')}>
                <div className="card divide-y divide-line">
                    <TrainingReminder />
                    <PauseRow />
                    <ToggleRow icon={<BellRing size={20} />} title={t('settings.restSound')} hint={t('settings.restSoundHint')}
                        on={profile.restSound !== false} onChange={on => actions.updateProfile({ restSound: on })}
                        test={{ label: t('settings.restSoundTest'), run: () => { primeSound(); restOver(true); } }} />
                    <ToggleRow icon={<Flame size={20} />} title={t('settings.streakReminder')} hint={t('settings.streakReminderHint')}
                        on={profile.streakReminder !== false} onChange={on => actions.updateProfile({ streakReminder: on })} />
                    <ToggleRow icon={<CalendarRange size={20} />} title={`${t('settings.weeklySummary')}${premium ? '' : ' · Premium'}`} hint={t('settings.weeklySummaryHint')}
                        on={premium && profile.weeklySummary !== false} onChange={premiumSwitch(on => actions.updateProfile({ weeklySummary: on }))} />
                    <ToggleRow icon={<BatteryCharging size={20} />} title={t('settings.recoveryAlerts')} hint={t('settings.recoveryAlertsHint')}
                        on={profile.recoveryAlerts !== false} onChange={on => actions.updateProfile({ recoveryAlerts: on })} />
                    {handsFreeSupported() && (
                        <ToggleRow icon={<Mic size={20} />} title={`${t('handsFree.title')}${premium ? '' : ' · Premium'}`} hint={t('handsFree.hint')}
                            on={premium && profile.handsFree === true} onChange={premiumSwitch(on => actions.updateProfile({ handsFree: on }))} />
                    )}
                    {voiceAvailable() && (
                        <ToggleRow icon={<Mic size={20} />} title={t('settings.voice')} hint={t('settings.voiceHint')}
                            on={profile.voice !== false} onChange={on => actions.updateProfile({ voice: on })}
                            test={{ label: t('settings.voiceTest'), run: () => void speak(spokenTime(30)) }} />
                    )}
                </div>
            </Section>

            <Section title={t('settings.language')}>
                <LanguageRow />
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

            <AppIconPicker />

            <HelpSection />

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
        </div>
    );
}

// Picture, name and the numbers that matter, at the top of Ajustes.
// Sex, age, height, weight, activity, aches and weight goal.
const DetailsCard = () => {
    const profile = useStore(s => s.profile)!;
    const weightKg = useStore(s => s.bodyWeights[0]?.weightKg);
    const [open, setOpen] = useState(false);
    const missing = detailsMissing(profile);
    const height = profile.heightCm
        ? profile.unit === 'lbs' ? `${Math.floor(profile.heightCm / 30.48)}′${Math.round((profile.heightCm % 30.48) / 2.54)}″` : `${profile.heightCm} cm`
        : '';
    const limits = profile.limitations ?? [];
    return (
        <>
            <button onClick={() => setOpen(true)} className="card flex w-full items-center gap-3 p-4 text-left hover:bg-ink-3">
                <UserRound size={20} className="shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                    {missing ? (
                        <>
                            <span className="block font-semibold">{t('profileDetails.incomplete')}</span>
                            <span className="block text-sm text-white/55">{t('profileDetails.incompleteHint')}</span>
                        </>
                    ) : (
                        <>
                            <span className="block font-medium">{t('profileDetails.summary', { age: ageOf(profile.birthYear!), height, weight: weightKg ? fmtWeight(weightKg, profile.unit) : '—' })}</span>
                            <span className="block text-sm text-white/55">
                                {t(`activity.${profile.activity ?? 'ligero'}.hint`)}
                                {limits.length > 0 && ` · ${limits.map(l => t(`limits.${l}`)).join(', ')}`}
                                {profile.weightGoal && ` · ${t('weightGoal.title')}: ${fmtWeight(profile.weightGoal.targetKg, profile.unit)}`}
                            </span>
                        </>
                    )}
                </span>
                <ChevronRight className="shrink-0 text-white/40" />
            </button>
            <ProfileDetailsSheet open={open} onClose={() => setOpen(false)} />
        </>
    );
};

const ProfileHero = () => {
    const profile = useStore(s => s.profile)!;
    const sessions = useStore(s => s.sessions);
    const email = useStore(s => s.account?.email);
    const [choosing, setChoosing] = useState(false);
    const medals = useUnlocked().size;

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
    const cloud = useCloudStatus();
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
        try {
            if (await signOut()) toast(t('account.signedOut'));
        } catch {
            toast(t('auth.err.failed'));
        }
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
    const provider = ['google', 'apple', 'facebook'].includes(account.provider) ? account.provider : 'email';
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
                {cloud === 'synced' ? (
                    <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
                        <Cloud size={14} className="text-good" />
                        {syncedAt ? t('account.synced', { when: new Date(syncedAt).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' }) }) : t('account.syncPending')}
                    </p>
                ) : (
                    <p className="mt-3 flex items-center gap-2 text-xs text-white/60">
                        <CloudOff size={14} className="shrink-0 text-brand" /> {t(cloud === 'offline' ? 'account.syncOffline' : 'account.syncWaiting')}
                    </p>
                )}
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
    const active = usePremiumActive();
    useEffect(() => {
        if (premiumAvailable()) refreshPremium().catch(() => {});
    }, []);
    return (
        <Section title="Premium">
            <Link to="/premium" className="card flex items-center gap-3 p-4 hover:bg-ink-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-300 text-ink"><Crown size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{active ? t('premium.active') : 'Fitness Life Premium'}</p>
                    <p className="text-sm text-white/55">
                        {active
                            ? premium?.expiresAt ? t(premium.willRenew ? 'premium.renews' : 'premium.endsOn', { date: fmtDate(premium.expiresAt) }) : t('premium.noExpiry')
                            : t('settings.premiumPitch', { price: fallbackPlan('annual').perMonth })}
                    </p>
                </div>
                <ChevronRight className="shrink-0 text-white/40" />
            </Link>
            <Link to="/invitar" className="card mt-2 flex items-center gap-3 p-4 hover:bg-ink-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-brand text-snow"><Gift size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t('invite.title')}</p>
                    <p className="text-sm text-white/55">{t('invite.subtitle')}</p>
                </div>
                <ChevronRight className="shrink-0 text-white/40" />
            </Link>
        </Section>
    );
};

// The color of the app icon on the phone (or of the browser tab on the web).
function AppIconPicker() {
    const [current, setCurrent] = useState<AppIconId | null>(null);
    useEffect(() => {
        let live = true;
        void getAppIcon().then(id => live && setCurrent(id));
        return () => {
            live = false;
        };
    }, []);
    const choose = async (id: AppIconId) => {
        if (id === current) return;
        try {
            await setAppIcon(id);
            setCurrent(id);
            toast(t(`appIcon.changed.${appIconTiming}`, { name: t(`appIcon.name.${id}`) }), 4000);
        } catch (e) {
            toast(`${t('appIcon.failed')} (${errorText(e)})`, 6000);
        }
    };
    return (
        <Section title={t('appIcon.title')}>
            <div className="card p-3">
                <div className="grid grid-cols-5 gap-x-1 gap-y-3" role="radiogroup" aria-label={t('appIcon.title')}>
                    {APP_ICONS.map(icon => (
                        <button key={icon.id} role="radio" aria-checked={current === icon.id} onClick={() => void choose(icon.id)}
                            className="flex flex-col items-center gap-1 text-[11px] font-medium text-white/60">
                            <img src={appIconUrl(icon)} alt="" width={48} height={48}
                                className={`h-12 w-12 rounded-[11px] ring-offset-2 ring-offset-ink-2 transition ${current === icon.id ? 'ring-2 ring-brand' : 'ring-1 ring-white/10'}`} />
                            <span className={current === icon.id ? 'text-brand-strong' : ''}>{t(`appIcon.name.${icon.id}`)}</span>
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-xs text-white/50">{t(`appIcon.hint.${appIconTiming}`)}</p>
            </div>
        </Section>
    );
}

const NavRow = ({ to, icon, title, hint }: { to: string; icon: ReactNode; title: string; hint: string }) => (
    <Link to={to} className="flex items-center gap-3 p-4 hover:bg-ink-3">
        <span className="shrink-0 text-brand">{icon}</span>
        <span className="min-w-0 flex-1">
            <span className="block font-medium">{title}</span>
            <span className="block text-sm text-white/55">{hint}</span>
        </span>
        <ChevronRight className="shrink-0 text-white/40" />
    </Link>
);

// The guide, feedback, privacy, and which version this is (with a check for a newer one).
function HelpSection() {
    const update = useUpdate();
    const [version, setVersion] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    useEffect(() => {
        let live = true;
        void appVersion().then(v => live && setVersion(v));
        return () => { live = false; };
    }, []);
    const check = async () => {
        setChecking(true);
        const found = await checkForUpdate(true);
        setChecking(false);
        if (!found) toast(t('update.upToDate'));
    };
    return (
        <Section title={t('settings.help')}>
            <div className="card divide-y divide-line overflow-hidden">
                <NavRow to="/guia" icon={<BookOpen size={20} />} title={t('guide.title')} hint={t('guide.hint')} />
                <NavRow to="/comentarios" icon={<MessageSquareHeart size={20} />} title={t('feedback.title')} hint={t('feedback.hint')} />
                <NavRow to="/entrenadores/aplicar" icon={<UserPlus size={20} />} title={t('settings.trainer')} hint={t('trainers.applyTitle')} />
                <NavRow to="/sobre-nosotros" icon={<Info size={20} />} title={t('aboutUs.title')} hint={t('aboutUs.hint')} />
                <NavRow to="/privacidad" icon={<ShieldCheck size={20} />} title={t('privacy.title')} hint={t('privacy.hint')} />
                <div className="flex items-center gap-3 p-4">
                    <RefreshCw size={20} className="shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                        <p className="font-medium">{version ? t('update.version', { version }) : 'Fitness Life'}</p>
                        <p className="text-sm text-white/55">{update ? t('update.title') : t('update.hint')}</p>
                    </div>
                    {update ? (
                        <button onClick={() => void update.apply().catch(() => toast(t('update.failed'), 4000))} className="btn-primary shrink-0 px-4 py-2 text-sm">{t('update.now')}</button>
                    ) : (
                        <button onClick={() => void check()} disabled={checking} className="btn-ghost shrink-0 px-3 py-2 text-sm">
                            {checking ? t('update.checking') : t('update.check')}
                        </button>
                    )}
                </div>
            </div>
        </Section>
    );
}
