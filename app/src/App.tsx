import { Apple, House, LineChart, ListChecks, Settings as SettingsIcon, Timer, Users } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AppGuide, guideSeen } from './components/AppGuide';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackHost, toast } from './components/feedback';
import { OfflineNotice } from './components/OfflineNotice';
import { UpdateBanner } from './components/UpdateBanner';
import { LaunchSplash } from './components/Welcome';
import { t } from './i18n';
import { localDay } from './lib/activity';
import { sessionName } from './lib/names';
import { useMealReminders } from './lib/mealplan';
import { useMovementSync } from './lib/movement';
import { usePush } from './lib/push';
import { useStreakAlerts } from './lib/streak';
import { useRecoveryAlerts } from './lib/recovery';
import { useTrainingReminders } from './lib/reminders';
import { useTracking } from './lib/tracker';
import { cancelRestAlert, initNative } from './lib/native';
import Achievements from './pages/Achievements';
import Activity from './pages/Activity';
import Cardio from './pages/Cardio';
import Move from './pages/Move';
import MemberProfile from './pages/MemberProfile';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ExerciseDetail from './pages/ExerciseDetail';
import Exercises from './pages/Exercises';
import GuideDetail from './pages/GuideDetail';
import Learn from './pages/Learn';
import Programs from './pages/Programs';
import Nutrition from './pages/Nutrition';
import Foods from './pages/Foods';
import Community from './pages/Community';
import Compare from './pages/Compare';
import AboutUs from './pages/AboutUs';
import Feedback from './pages/Feedback';
import FreePlans from './pages/FreePlans';
import Mom from './pages/Mom';
import TrainerApply from './pages/TrainerApply';
import TrainerAdmin from './pages/TrainerAdmin';
import TrainerChat from './pages/TrainerChat';
import TrainerPanel from './pages/TrainerPanel';
import Trainers from './pages/Trainers';
import Privacy from './pages/Privacy';
import AuthScreen, { PasswordRecovery } from './pages/Auth';
import { AUTH_LINK_FAILED_EVENT, authAvailable, initAuth } from './lib/auth';
import Premium from './pages/Premium';
import Onboarding from './pages/Onboarding';
import Progress from './pages/Progress';
import RoutineEditor from './pages/RoutineEditor';
import Routines from './pages/Routines';
import SessionDetail from './pages/SessionDetail';
import Settings from './pages/Settings';
import Today from './pages/Today';
import Trainer from './pages/Trainer';
import Women from './pages/Women';
import Wrapped from './pages/Wrapped';
import Workout from './pages/Workout';
import { actions, useStore } from './store/store';
import { showFemaleDemos } from './data/motion';

const TABS = [
    { to: '/', label: () => t('nav.today'), icon: House },
    { to: '/rutinas', label: () => t('nav.routines'), icon: ListChecks },
    { to: '/progreso', label: () => t('nav.progress'), icon: LineChart },
    { to: '/nutricion', label: () => t('nav.nutrition'), icon: Apple },
    { to: '/comunidad', label: () => t('nav.community'), icon: Users },
    { to: '/ajustes', label: () => t('nav.settings'), icon: SettingsIcon },
];

const BottomNav = () => (
    <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-lg">
            {TABS.map(({ to, label, icon: Icon }) => (
                <li key={to} className="flex-1">
                    <NavLink to={to} end={to === '/'}
                        className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-white/50 hover:text-white'}`}>
                        <Icon size={22} strokeWidth={1.75} />
                        <span className="max-w-full truncate px-0.5">{label()}</span>
                    </NavLink>
                </li>
            ))}
        </ul>
    </nav>
);

// Shown on every tab while a workout is running, so it is never lost.
const ActiveBanner = () => {
    const active = useStore(s => s.active);
    const navigate = useNavigate();
    if (!active) return null;
    return (
        <button onClick={() => navigate('/entreno')}
            className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-brand px-4 py-3 text-left text-ink shadow-lg shadow-black/40">
            <span className="flex items-center gap-2 font-semibold"><Timer size={18} /> {t('active.banner')}</span>
            <span className="text-sm font-medium">{sessionName(active)} →</span>
        </button>
    );
};

const Shell = ({ children }: { children: ReactNode }) => {
    const { pathname } = useLocation();
    const hasActive = useStore(s => s.active !== null);
    return (
        // Extra bottom room while the "workout in progress" banner is showing.
        <div className={`pt-safe mx-auto min-h-dvh max-w-lg ${hasActive ? 'pb-[calc(9rem+env(safe-area-inset-bottom))]' : 'pb-nav'}`}>
            <UpdateBanner className="relative z-10 mx-4 mt-3" />
            <OfflineNotice className="relative z-10 mx-4 mt-3" />
            <div key={pathname} className="animate-fade"><ErrorBoundary>{children}</ErrorBoundary></div>
            <ActiveBanner />
            <BottomNav />
        </div>
    );
};

const ScrollToTop = () => {
    const { pathname } = useLocation();
    // Braces matter: newer Chrome returns a Promise from scrollTo, and React
    // would take any returned value as the effect's cleanup and call it.
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

export default function App() {
    const [intro, setIntro] = useState(true);
    const splash = intro && <LaunchSplash onDone={() => setIntro(false)} />;
    const hasProfile = useStore(s => s.profile !== null);
    // Women see the women's version of the exercise demos that have one.
    showFemaleDemos(useStore(s => s.profile?.sex === 'mujer'));
    const lang = useStore(s => s.lang); // remount everything when the language changes
    const navigate = useNavigate();
    const askAccount = useStore(s => !s.account && !s.authPrompted) && authAvailable();
    // New users: the tour of the app, once, right after setting up their plan.
    const [tour, setTour] = useState(() => !guideSeen());
    const newUser = useStore(s => s.sessions.length === 0);
    useEffect(() => {
        initNative(() => navigate(-1));
    }, [navigate]);
    useEffect(initAuth, []);
    // A sign-in or reset link that can't be used (expired, already used).
    useEffect(() => {
        const failed = () => toast(t('auth.linkFailed'), 5000);
        window.addEventListener(AUTH_LINK_FAILED_EVENT, failed);
        return () => window.removeEventListener(AUTH_LINK_FAILED_EVENT, failed);
    }, []);
    useRecoveryAlerts();
    useMealReminders();
    useTrainingReminders();
    useMovementSync();
    useTracking();
    usePush();
    useStreakAlerts();
    // A finished or discarded workout has no rest left to announce (the
    // workout page unmounts before it could cancel the alert itself).
    const workoutOpen = useStore(s => s.active !== null);
    useEffect(() => {
        if (!workoutOpen) void cancelRestAlert();
    }, [workoutOpen]);
    // "Your activity": one mark per day the app is used.
    useEffect(() => {
        const mark = () => { if (document.visibilityState === 'visible') actions.markActiveToday(localDay(new Date())); };
        mark();
        document.addEventListener('visibilitychange', mark);
        return () => document.removeEventListener('visibilitychange', mark);
    }, []);
    if (!hasProfile) return <><Onboarding /><FeedbackHost /><PasswordRecovery />{splash}</>;
    // People who used the app before accounts existed: offer one, once.
    if (askAccount) {
        const done = () => actions.setAuthPrompted();
        return <><AuthScreen onDone={done} onSkip={done} /><FeedbackHost />{splash}</>;
    }
    return (
        <>
            <ScrollToTop />
            <FeedbackHost />
            <PasswordRecovery />
            {splash}
            {tour && newUser && <AppGuide onClose={() => setTour(false)} />}
            <Routes key={lang}>
                <Route path="/entreno" element={<ErrorBoundary><Workout /></ErrorBoundary>} />
                <Route path="/cardio" element={<ErrorBoundary><Cardio /></ErrorBoundary>} />
                <Route path="/guia" element={<AppGuide page onClose={() => navigate(-1)} />} />
                <Route path="/cuenta" element={<AuthScreen initialMode="signIn" onDone={() => navigate('/ajustes', { replace: true })} onBack={() => navigate(-1)} />} />
                <Route path="/" element={<Shell><Today /></Shell>} />
                <Route path="/rutinas" element={<Shell><Routines /></Shell>} />
                <Route path="/rutinas/:id" element={<Shell><RoutineEditor /></Shell>} />
                <Route path="/progreso" element={<Shell><Progress /></Shell>} />
                <Route path="/sesion/:id" element={<Shell><SessionDetail /></Shell>} />
                <Route path="/ejercicios" element={<Shell><Exercises /></Shell>} />
                <Route path="/ejercicios/:id" element={<Shell><ExerciseDetail /></Shell>} />
                <Route path="/aprende" element={<Shell><Learn /></Shell>} />
                <Route path="/aprende/:id" element={<Shell><GuideDetail /></Shell>} />
                <Route path="/programas" element={<Shell><Programs /></Shell>} />
                <Route path="/entrenador" element={<Shell><Trainer /></Shell>} />
                <Route path="/nutricion" element={<Shell><Nutrition /></Shell>} />
                <Route path="/nutricion/planes" element={<Shell><FreePlans /></Shell>} />
                <Route path="/nutricion/alimentos" element={<Shell><Foods /></Shell>} />
                <Route path="/premium" element={<Shell><Premium /></Shell>} />
                <Route path="/comunidad" element={<Shell><Community /></Shell>} />
                <Route path="/comunidad/u/:id" element={<Shell><MemberProfile /></Shell>} />
                <Route path="/ajustes" element={<Shell><Settings /></Shell>} />
                <Route path="/mama" element={<Shell><Mom /></Shell>} />
                <Route path="/entrenadores" element={<Shell><Trainers /></Shell>} />
                <Route path="/entrenadores/aplicar" element={<Shell><TrainerApply /></Shell>} />
                <Route path="/entrenadores/admin" element={<Shell><TrainerAdmin /></Shell>} />
                <Route path="/entrenadores/panel" element={<Shell><TrainerPanel /></Shell>} />
                <Route path="/entrenadores/chat/:id" element={<ErrorBoundary><TrainerChat /></ErrorBoundary>} />
                <Route path="/sobre-nosotros" element={<Shell><AboutUs /></Shell>} />
                <Route path="/privacidad" element={<Shell><Privacy /></Shell>} />
                <Route path="/comentarios" element={<Shell><Feedback /></Shell>} />
                <Route path="/logros" element={<Shell><Achievements /></Shell>} />
                <Route path="/actividad" element={<Shell><Activity /></Shell>} />
                <Route path="/movimiento" element={<Shell><Move /></Shell>} />
                <Route path="/mujeres" element={<Shell><Women /></Shell>} />
                <Route path="/wrapped" element={<Shell><Wrapped /></Shell>} />
                <Route path="/antes-despues" element={<Shell><Compare /></Shell>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
