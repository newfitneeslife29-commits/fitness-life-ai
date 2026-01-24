import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser, Language } from '../context/UserContext';

interface SidebarProps {
    isOpen?: boolean;
    setIsOpen?: (v: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, notifications, markAsRead, clearNotifications, logout, language, toggleLanguage } = useUser();
    const [showNotifications, setShowNotifications] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const unreadCount = notifications.filter(n => !n.read).length;

    const containerClasses = `
        fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs md:w-72 bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-white/5 
        transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col justify-between p-6 shadow-2xl md:shadow-none
    `;

    const t = {
        EN: {
            dashboard: "Dashboard",
            workouts: "Workouts",
            nutrition: "Nutrition",
            aiCoach: "AI Coach",
            community: "Community",
            achievements: "Achievements",
            profile: "Profile",
            settings: "Settings",
            aboutUs: "About Us",
            signOut: "Sign Out",
            notifications: "Notifications",
            clearAll: "Clear All",
            noAlerts: "No new alerts.",
            viewProfile: "View Profile",
            trainer: "Trainer"
        },
        ES: {
            dashboard: "Panel Principal",
            workouts: "Entrenamientos",
            nutrition: "Nutrición",
            aiCoach: "Entrenador IA",
            community: "Comunidad",
            achievements: "Logros",
            profile: "Perfil",
            settings: "Ajustes",
            aboutUs: "Sobre Nosotros",
            signOut: "Cerrar Sesión",
            notifications: "Notificaciones",
            clearAll: "Borrar Todo",
            noAlerts: "Sin alertas nuevas.",
            viewProfile: "Ver Perfil",
            trainer: "Entrenador"
        }
    };

    const text = language === 'ES' ? t.ES : t.EN;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsOpen && setIsOpen(false)}
                />
            )}

            <nav className={containerClasses}>
                <div className="flex flex-col gap-6">
                    {/* Brand & Mobile Close */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="relative flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20">
                                <span className="font-black text-white text-xl">FIT</span>
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-slate-900 dark:text-white text-xl font-black leading-tight tracking-tight">Fitness Life</h1>
                                <p className="text-primary font-bold text-xs uppercase tracking-widest">{text.trainer}</p>
                            </div>
                        </div>
                        {/* Close Button (Mobile Only) */}
                        <button
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className="md:hidden p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Nav Links - Reordered */}
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] md:max-h-none -mx-2 px-2">
                        <Link
                            to="/"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/') ? 'filled' : ''}`}>dashboard</span>
                            <span className="text-sm font-bold">{text.dashboard}</span>
                        </Link>

                        <Link
                            to="/training"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/training') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/training') ? 'filled' : ''}`}>exercise</span>
                            <span className="text-sm font-bold">{text.workouts}</span>
                        </Link>

                        <Link
                            to="/nutrition"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/nutrition') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/nutrition') ? 'filled' : ''}`}>restaurant</span>
                            <span className="text-sm font-bold">{text.nutrition}</span>
                        </Link>

                        <Link
                            to="/ai-coach"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/ai-coach') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/ai-coach') ? 'filled' : ''}`}>smart_toy</span>
                            <span className="text-sm font-bold">{text.aiCoach}</span>
                        </Link>

                        <Link
                            to="/community"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/community') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/community') ? 'filled' : ''}`}>social_leaderboard</span>
                            <span className="text-sm font-bold">{text.community}</span>
                        </Link>

                        <Link
                            to="/achievements"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/achievements') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/achievements') ? 'filled' : ''}`}>emoji_events</span>
                            <span className="text-sm font-bold">{text.achievements}</span>
                        </Link>

                        <Link
                            to="/profile"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/profile') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/profile') ? 'filled' : ''}`}>person</span>
                            <span className="text-sm font-bold">{text.profile}</span>
                        </Link>

                        <Link
                            to="/settings"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/settings') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/settings') ? 'filled' : ''}`}>settings</span>
                            <span className="text-sm font-bold">{text.settings}</span>
                        </Link>

                        <Link
                            to="/about"
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive('/about') ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${isActive('/about') ? 'filled' : ''}`}>info</span>
                            <span className="text-sm font-bold">{text.aboutUs}</span>
                        </Link>

                        <button
                            onClick={() => {
                                if (setIsOpen) setIsOpen(false);
                                logout();
                                navigate('/');
                            }}
                            className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all group text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-300 mt-2"
                        >
                            <span className="material-symbols-outlined">logout</span>
                            <span className="text-sm font-bold">{text.signOut}</span>
                        </button>
                    </div>
                </div>

                {/* Bottom Settings */}
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                        {/* Notifications Row */}
                        <div className="flex-1 flex items-center justify-between p-2 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 relative">
                            {/* Notification Bell */}
                            <div className="relative w-full">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-colors relative ${showNotifications ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-primary'}`}
                                >
                                    <span className={`material-symbols-outlined ${showNotifications ? 'filled' : ''}`}>notifications</span>
                                    {unreadCount > 0 && (
                                        <span className="ml-2 size-5 flex items-center justify-center bg-red-500 text-white text-[10px] rounded-full">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <div className="absolute bottom-full mb-3 left-0 w-64 bg-white dark:bg-surface-dark rounded-xl shadow-2xl border border-slate-100 dark:border-white/10 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <div className="p-3 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">{text.notifications}</h4>
                                            <button onClick={clearNotifications} className="text-[10px] text-slate-500 hover:text-red-500 font-bold">{text.clearAll}</button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-slate-400 text-xs italic">{text.noAlerts}</div>
                                            ) : (
                                                notifications.map(note => (
                                                    <div
                                                        key={note.id}
                                                        onClick={() => markAsRead(note.id)}
                                                        className={`p-3 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${!note.read ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''}`}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className={`mt-1 size-2 rounded-full shrink-0 ${note.type === 'info' ? 'bg-blue-500' :
                                                                note.type === 'success' ? 'bg-green-500' : 'bg-orange-500'
                                                                }`}></div>
                                                            <div>
                                                                <p className={`text-xs font-bold mb-0.5 ${!note.read ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                    {note.title}
                                                                </p>
                                                                <p className="text-xs text-slate-500 leading-snug mb-1">{note.message}</p>
                                                                <p className="text-[10px] text-slate-400">{note.time}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center justify-center size-[42px] rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm text-slate-500 font-bold text-xs hover:text-primary hover:border-primary transition-colors"
                        >
                            {language}
                        </button>
                    </div>

                    <Link to="/profile" onClick={() => setIsOpen && setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm hover:border-primary transition-colors relative overflow-hidden group">
                        {user.is_premium && <div className="absolute top-0 right-0 w-2 h-full bg-yellow-400"></div>}
                        <div className="size-10 rounded-full bg-cover bg-center ring-2 ring-primary/20 relative" style={{ backgroundImage: `url(${user.avatar})` }}>
                            {user.is_premium && <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[8px] font-black px-1 rounded-sm border border-black shadow-sm">PRO</div>}
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{user.name}</p>
                            <p className="text-xs text-primary font-medium">{text.viewProfile}</p>
                        </div>
                    </Link>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;