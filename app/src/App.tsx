import { Apple, House, LineChart, ListChecks, Settings as SettingsIcon, Timer, Users } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackHost } from './components/feedback';
import { LaunchSplash } from './components/Welcome';
import { t } from './i18n';
import { sessionName } from './lib/names';
import { initNative } from './lib/native';
import Achievements from './pages/Achievements';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ExerciseDetail from './pages/ExerciseDetail';
import Exercises from './pages/Exercises';
import Nutrition from './pages/Nutrition';
import Foods from './pages/Foods';
import Community from './pages/Community';
import AuthScreen, { PasswordRecovery } from './pages/Auth';
import { authAvailable, initAuth } from './lib/auth';
import Premium from './pages/Premium';
import Onboarding from './pages/Onboarding';
import Progress from './pages/Progress';
import RoutineEditor from './pages/RoutineEditor';
import Routines from './pages/Routines';
import SessionDetail from './pages/SessionDetail';
import Settings from './pages/Settings';
import Today from './pages/Today';
import Workout from './pages/Workout';
import { actions, useStore } from './store/store';

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
            <div key={pathname} className="animate-fade"><ErrorBoundary>{children}</ErrorBoundary></div>
            <ActiveBanner />
            <BottomNav />
        </div>
    );
};

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => window.scrollTo(0, 0), [pathname]);
    return null;
};

export default function App() {
    const [intro, setIntro] = useState(true);
    const splash = intro && <LaunchSplash onDone={() => setIntro(false)} />;
    const hasProfile = useStore(s => s.profile !== null);
    const lang = useStore(s => s.lang); // remount everything when the language changes
    const navigate = useNavigate();
    const askAccount = useStore(s => !s.account && !s.authPrompted) && authAvailable();
    useEffect(() => initNative(() => navigate(-1)), [navigate]);
    useEffect(initAuth, []);
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
            <Routes key={lang}>
                <Route path="/entreno" element={<ErrorBoundary><Workout /></ErrorBoundary>} />
                <Route path="/cuenta" element={<AuthScreen initialMode="signIn" onDone={() => navigate('/ajustes', { replace: true })} onBack={() => navigate(-1)} />} />
                <Route path="/" element={<Shell><Today /></Shell>} />
                <Route path="/rutinas" element={<Shell><Routines /></Shell>} />
                <Route path="/rutinas/:id" element={<Shell><RoutineEditor /></Shell>} />
                <Route path="/progreso" element={<Shell><Progress /></Shell>} />
                <Route path="/sesion/:id" element={<Shell><SessionDetail /></Shell>} />
                <Route path="/ejercicios" element={<Shell><Exercises /></Shell>} />
                <Route path="/ejercicios/:id" element={<Shell><ExerciseDetail /></Shell>} />
                <Route path="/nutricion" element={<Shell><Nutrition /></Shell>} />
                <Route path="/nutricion/alimentos" element={<Shell><Foods /></Shell>} />
                <Route path="/premium" element={<Shell><Premium /></Shell>} />
                <Route path="/comunidad" element={<Shell><Community /></Shell>} />
                <Route path="/ajustes" element={<Shell><Settings /></Shell>} />
                <Route path="/logros" element={<Shell><Achievements /></Shell>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
