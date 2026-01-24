import React, { useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardHome from './components/DashboardHome';
import ActiveTraining from './components/ActiveTraining';
import WorkoutLibrary from './components/WorkoutLibrary';
import Community from './components/Community';
import AICoach from './components/AICoach';
import Nutrition from './components/Nutrition';
import Achievements from './components/Achievements';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';
import AboutUs from './components/AboutUs';
import Settings from './components/Settings';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { UserProvider, useUser } from './context/UserContext';

const AppContent: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnboarded, isAuthenticated, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check authentication first
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  }

  // If authenticated but not onboarded (no profile), show Onboarding
  if (!isOnboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  // Routes where sidebar is completely hidden (Active Training Player)
  const isTrainingPlayer = location.pathname === '/training/active';

  return (
    <div className="relative flex min-h-screen w-full flex-row overflow-hidden bg-background-light dark:bg-background-dark">
      {!isTrainingPlayer && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />}

      <main className="flex-1 flex flex-col h-screen relative overflow-y-auto w-full scroll-smooth">
        {/* Mobile Header Toggle */}
        {!isTrainingPlayer && (
          <div className="md:hidden flex items-center justify-start p-4 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0 z-30 gap-4 transition-colors">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
              <span className="material-symbols-outlined text-2xl block">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-black text-primary text-xl tracking-tight">FIT</span>
              <span className="font-bold text-slate-900 dark:text-white text-lg">Fitness Life</span>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/training" element={<WorkoutLibrary />} />
          <Route path="/training/active" element={<ActiveTraining />} />
          <Route path="/community" element={<Community />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<AboutUs />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </UserProvider>
  );
};

export default App;