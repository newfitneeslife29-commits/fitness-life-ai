import { CalendarDays, Dumbbell, LineChart, ListChecks, Settings as SettingsIcon, Timer } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ExerciseDetail from './pages/ExerciseDetail';
import Exercises from './pages/Exercises';
import Onboarding from './pages/Onboarding';
import Progress from './pages/Progress';
import RoutineEditor from './pages/RoutineEditor';
import Routines from './pages/Routines';
import SessionDetail from './pages/SessionDetail';
import Settings from './pages/Settings';
import Today from './pages/Today';
import Workout from './pages/Workout';
import { useStore } from './store/store';

const TABS = [
    { to: '/', label: 'Hoy', icon: CalendarDays },
    { to: '/rutinas', label: 'Rutinas', icon: ListChecks },
    { to: '/progreso', label: 'Progreso', icon: LineChart },
    { to: '/ejercicios', label: 'Ejercicios', icon: Dumbbell },
    { to: '/ajustes', label: 'Ajustes', icon: SettingsIcon },
];

const BottomNav = () => (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-lg">
            {TABS.map(({ to, label, icon: Icon }) => (
                <li key={to} className="flex-1">
                    <NavLink to={to} end={to === '/'}
                        className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-white/50 hover:text-white'}`}>
                        <Icon size={22} strokeWidth={1.75} />
                        {label}
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
            <span className="flex items-center gap-2 font-semibold"><Timer size={18} /> Entreno en curso</span>
            <span className="text-sm font-medium">{active.routineName} →</span>
        </button>
    );
};

const Shell = ({ children }: { children: ReactNode }) => (
    <div className="pt-safe pb-nav mx-auto min-h-dvh max-w-lg">
        {children}
        <ActiveBanner />
        <BottomNav />
    </div>
);

const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => window.scrollTo(0, 0), [pathname]);
    return null;
};

export default function App() {
    const hasProfile = useStore(s => s.profile !== null);
    if (!hasProfile) return <Onboarding />;
    return (
        <>
            <ScrollToTop />
            <Routes>
                <Route path="/entreno" element={<Workout />} />
                <Route path="/" element={<Shell><Today /></Shell>} />
                <Route path="/rutinas" element={<Shell><Routines /></Shell>} />
                <Route path="/rutinas/:id" element={<Shell><RoutineEditor /></Shell>} />
                <Route path="/progreso" element={<Shell><Progress /></Shell>} />
                <Route path="/sesion/:id" element={<Shell><SessionDetail /></Shell>} />
                <Route path="/ejercicios" element={<Shell><Exercises /></Shell>} />
                <Route path="/ejercicios/:id" element={<Shell><ExerciseDetail /></Shell>} />
                <Route path="/ajustes" element={<Shell><Settings /></Shell>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}
