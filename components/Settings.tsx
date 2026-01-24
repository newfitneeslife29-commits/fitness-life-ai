import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import confetti from 'canvas-confetti';

const Settings: React.FC = () => {
    const { user, setUser, updateProfile, theme, toggleTheme, language, setLanguage, notifications } = useUser();
    const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'notifications'>('account');

    // Local state for Account editing
    const [formData, setFormData] = useState({
        name: user.name,
        weight: user.weight,
        height: user.height,
        age: user.age,
        goal: user.goal,
        experience: user.experience
    });

    useEffect(() => {
        setFormData({
            name: user.name,
            weight: user.weight,
            height: user.height,
            age: user.age,
            goal: user.goal,
            experience: user.experience
        });
    }, [user]);

    const handleSaveAccount = async () => {
        await updateProfile(formData);
        confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#ea580c', '#ffffff']
        });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                updateProfile({ avatar: result });
            };
            reader.readAsDataURL(file);
        }
    };

    // Helper Functions for Units
    const getDisplayWeight = () => {
        if (user.weight_unit === 'lbs') {
            return Math.round(formData.weight * 2.20462);
        }
        return formData.weight;
    };

    const handleWeightChange = (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;
        if (user.weight_unit === 'lbs') {
            setFormData({ ...formData, weight: num / 2.20462 });
        } else {
            setFormData({ ...formData, weight: num });
        }
    };

    const getDisplayHeightFeet = () => Math.floor((formData.height / 2.54) / 12);
    const getDisplayHeightInches = () => Math.round((formData.height / 2.54) % 12);

    const handleHeightFeetChange = (ftStr: string) => {
        const ft = parseFloat(ftStr) || 0;
        const currentInches = getDisplayHeightInches();
        const totalInches = (ft * 12) + currentInches;
        setFormData({ ...formData, height: totalInches * 2.54 });
    };

    const handleHeightInchesChange = (inStr: string) => {
        const inches = parseFloat(inStr) || 0;
        const currentFeet = getDisplayHeightFeet();
        const totalInches = (currentFeet * 12) + inches;
        setFormData({ ...formData, height: totalInches * 2.54 });
    };

    return (
        <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 flex flex-col gap-8 pb-20 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Configuración</h1>
                <p className="text-slate-500 dark:text-slate-400">Gestiona tu cuenta y preferencias de la aplicación.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation for Settings */}
                <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'account' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-surface-dark text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                        <span className="material-symbols-outlined">manage_accounts</span>
                        Cuenta
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'appearance' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-surface-dark text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                        <span className="material-symbols-outlined">palette</span>
                        Apariencia
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'notifications' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-surface-dark text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        Notificaciones
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white dark:bg-surface-dark rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-white/5 shadow-sm">

                    {/* --- ACCOUNT TAB --- */}
                    {activeTab === 'account' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-white/5 pb-4">Perfil de Usuario</h2>

                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative group">
                                        <div className="size-24 rounded-full bg-cover bg-center border-4 border-slate-100 dark:border-white/5" style={{ backgroundImage: `url(${user.avatar})` }}></div>
                                        <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <span className="material-symbols-outlined text-white">photo_camera</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                        </label>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{user.name}</h3>
                                        <p className="text-sm text-slate-500">Nivel {Math.floor((user.xp || 0) / 1000) + 1} • {user.experience}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Edad</label>
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                                            className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                            Peso ({user.weight_unit === 'lbs' ? 'lbs' : 'kg'})
                                        </label>
                                        <input
                                            type="number"
                                            value={getDisplayWeight()}
                                            onChange={e => handleWeightChange(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                            Altura ({user.height_unit === 'ft' ? 'ft/in' : 'cm'})
                                        </label>
                                        {user.height_unit === 'ft' ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={getDisplayHeightFeet()}
                                                        onChange={e => handleHeightFeetChange(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">ft</span>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={getDisplayHeightInches()}
                                                        onChange={e => handleHeightInchesChange(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">in</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <input
                                                type="number"
                                                value={Math.round(formData.height)}
                                                onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                                                className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Objetivo Principal</label>
                                        <select
                                            value={formData.goal}
                                            onChange={e => setFormData({ ...formData, goal: e.target.value as any })}
                                            className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="Lose Weight">Lose Weight</option>
                                            <option value="Build Muscle">Build Muscle</option>
                                            <option value="Keep Fit">Keep Fit</option>
                                            <option value="Athletic Performance">Athletic Performance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Experiencia</label>
                                        <select
                                            value={formData.experience}
                                            onChange={e => setFormData({ ...formData, experience: e.target.value as any })}
                                            className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                                <button
                                    onClick={handleSaveAccount}
                                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">save</span>
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- APPEARANCE TAB --- */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-white/5 pb-4">Personalización</h2>

                                {/* Theme */}
                                <div className="flex items-center justify-between py-4 border-b border-slate-50 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                            <span className="material-symbols-outlined">dark_mode</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">Modo Oscuro</h4>
                                            <p className="text-xs text-slate-500">Reduce la fatiga visual en ambientes oscuros.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className={`w-14 h-8 rounded-full p-1 transition-colors relative ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`size-6 bg-white rounded-full shadow-md transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>

                                {/* Language */}
                                <div className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                            <span className="material-symbols-outlined">translate</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">Idioma de la Aplicación</h4>
                                            <p className="text-xs text-slate-500">Selecciona tu idioma preferido.</p>
                                        </div>
                                    </div>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as any)}
                                        className="bg-slate-50 dark:bg-white/5 border-none rounded-lg px-4 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="EN">English</option>
                                        <option value="ES">Español</option>
                                        <option value="FR">Français</option>
                                        <option value="PT">Português</option>
                                        <option value="DE">Deutsch</option>
                                    </select>
                                </div>

                                {/* Weight Unit */}
                                <div className="flex items-center justify-between py-4 border-t border-slate-50 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                                            <span className="material-symbols-outlined">monitor_weight</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">Unidad de Peso</h4>
                                            <p className="text-xs text-slate-500">Selecciona entre kilogramos o libras.</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                                        <button
                                            onClick={() => updateProfile({ weight_unit: 'kg' })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.weight_unit === 'kg' ? 'bg-white dark:bg-surface-dark shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                        >KG</button>
                                        <button
                                            onClick={() => updateProfile({ weight_unit: 'lbs' })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.weight_unit === 'lbs' ? 'bg-white dark:bg-surface-dark shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                        >LBS</button>
                                    </div>
                                </div>

                                {/* Height Unit */}
                                <div className="flex items-center justify-between py-4 border-t border-slate-50 dark:border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                            <span className="material-symbols-outlined">height</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">Unidad de Altura</h4>
                                            <p className="text-xs text-slate-500">Selecciona entre centímetros o pies.</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                                        <button
                                            onClick={() => updateProfile({ height_unit: 'cm' })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.height_unit === 'cm' ? 'bg-white dark:bg-surface-dark shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                        >CM</button>
                                        <button
                                            onClick={() => updateProfile({ height_unit: 'ft' })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.height_unit === 'ft' ? 'bg-white dark:bg-surface-dark shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                        >FT</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- NOTIFICATIONS TAB --- */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-white/5 pb-4">Preferencias de Alerta</h2>

                                <div className="space-y-6">
                                    {[
                                        { title: 'Recordatorios de Entrenamiento', desc: 'Recibe alertas para no perder tu racha.', icon: 'fitness_center', color: 'text-orange-500 bg-orange-100' },
                                        { title: 'Consejos de Nutrición', desc: 'Sugerencias diarias de comidas y macros.', icon: 'restaurant', color: 'text-green-500 bg-green-100' },
                                        { title: 'Comunidad y Amigos', desc: 'Cuando alguien comenta o te sigue.', icon: 'group', color: 'text-blue-500 bg-blue-100' },
                                        { title: 'Logros y Premios', desc: 'Notificaciones al subir de nivel.', icon: 'emoji_events', color: 'text-yellow-500 bg-yellow-100' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`size-10 rounded-full flex items-center justify-center ${item.color} dark:bg-opacity-20`}>
                                                    <span className="material-symbols-outlined">{item.icon}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                                    <p className="text-xs text-slate-500">{item.desc}</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Settings;