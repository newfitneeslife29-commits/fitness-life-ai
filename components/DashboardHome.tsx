import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useUser } from '../context/UserContext';
import { analyzeImage } from '../services/geminiService';

const DashboardHome: React.FC = () => {
    const { user } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // --- 1. Hydration Logic ---
    // Target: 35ml per kg of body weight
    const hydrationTarget = Math.round(user.weight * 35);
    const [hydrationCurrent, setHydrationCurrent] = useState(1250); // Start with some water
    const hydrationProgress = Math.min((hydrationCurrent / hydrationTarget) * 100, 100);

    const addWater = () => {
        setHydrationCurrent(prev => {
            const newVal = prev + 250;
            if (newVal >= hydrationTarget) triggerConfetti();
            return newVal;
        });
    };

    // --- 2. Macro Logic ---
    // Calculate targets based on User Goal
    const targets = useMemo(() => {
        let t = { calories: 2000, protein: 150, carbs: 200, fats: 60 };
        if (user.goal === 'Build Muscle') {
            t = { calories: 2800, protein: 200, carbs: 300, fats: 80 };
        } else if (user.goal === 'Lose Weight') {
            t = { calories: 1800, protein: 160, carbs: 120, fats: 50 };
        }
        return t;
    }, [user.goal]);

    // State for daily progress (Simulating some initial data + whatever we scan)
    const [dailyStats, setDailyStats] = useState({
        calories: 1200,
        protein: 90,
        carbs: 140,
        fats: 35
    });

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#3b82f6', '#ffffff']
        });
    };

    // --- 3. AI Meal Scanning ---
    const handleQuickLogClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                
                // Prompt specifically for JSON numbers to add to stats
                const prompt = "Analyze this food image. Return a JSON object with keys: 'calories' (number), 'protein' (number, grams), 'carbs' (number, grams), 'fats' (number, grams). Estimate based on standard portion sizes.";
                
                const response = await analyzeImage(base64, prompt);
                
                // Parse JSON
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0]);
                    
                    // Update State
                    setDailyStats(prev => ({
                        calories: prev.calories + (data.calories || 0),
                        protein: prev.protein + (data.protein || 0),
                        carbs: prev.carbs + (data.carbs || 0),
                        fats: prev.fats + (data.fats || 0)
                    }));
                    
                    triggerConfetti();
                }
            };
        } catch (error) {
            console.error("Error analyzing meal:", error);
            alert("Could not analyze image. Try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentDay = 'Wed';

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 pb-20">
            {/* Header & Calendar */}
            <div className="flex flex-col gap-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black tracking-tight">Hello, {user.name.split(' ')[0]}.</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">Goal: <span className="text-primary font-bold">{user.goal}</span></p>
                    </div>
                    <div className="flex gap-2">
                        {days.map((day, i) => (
                            <div key={day} className={`flex flex-col items-center justify-center w-10 h-14 md:w-12 md:h-16 rounded-2xl border transition-all ${day === currentDay ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 text-slate-400'}`}>
                                <span className="text-[10px] font-bold uppercase">{day}</span>
                                <span className="text-lg font-bold">{12 + i}</span>
                                {i < 2 && <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1"></div>}
                            </div>
                        ))}
                    </div>
                </header>

                {/* Main Action Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Hero Workout */}
                    <div className="lg:col-span-8">
                        <div className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-surface-dark shadow-2xl shadow-primary/10 group h-full min-h-[400px] flex flex-col justify-end">
                            <div className="absolute inset-0">
                                <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="Workout" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                            </div>
                            
                            <div className="relative z-10 p-8 flex flex-col gap-4 items-start">
                                <div className="flex gap-2 mb-2">
                                    <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Today's Focus</span>
                                    <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Hypertrophy</span>
                                </div>
                                <h3 className="text-4xl md:text-5xl font-black text-white leading-none">Upper Body <br/> Power Builder</h3>
                                <p className="text-slate-300 max-w-lg">Designed by Fitness Life AI based on your 2-day rest period. High volume chest and back focus.</p>
                                
                                <div className="w-full h-px bg-white/10 my-2"></div>
                                
                                <div className="flex flex-col sm:flex-row gap-4 w-full">
                                    <Link to="/training" className="flex-1 bg-primary hover:bg-primary-dark text-white text-lg font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 animate-pulse-slow">
                                        <span className="material-symbols-outlined filled">play_circle</span>
                                        START WORKOUT
                                    </Link>
                                    <div className="flex gap-4 items-center px-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-xs font-bold uppercase">Duration</span>
                                            <span className="text-white font-bold">55 Min</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/20"></div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-xs font-bold uppercase">Intensity</span>
                                            <span className="text-primary font-bold">High</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: BMR & Macros & Hydration */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Daily Macros Card */}
                        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-surface-dark/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-primary font-bold text-sm animate-pulse">Analyzing Meal...</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Daily Macros</h3>
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                                    {dailyStats.calories} / {targets.calories} kcal
                                </span>
                            </div>
                            
                            {/* Macro Progress Bars */}
                            <div className="flex flex-col gap-4">
                                <div className="relative pt-2">
                                    <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        <span>Protein</span>
                                        <span>{dailyStats.protein}g / {targets.protein}g</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000"
                                            style={{ width: `${Math.min((dailyStats.protein / targets.protein) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="relative pt-2">
                                    <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        <span>Carbs</span>
                                        <span>{dailyStats.carbs}g / {targets.carbs}g</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min((dailyStats.carbs / targets.carbs) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="relative pt-2">
                                    <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        <span>Fats</span>
                                        <span>{dailyStats.fats}g / {targets.fats}g</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-yellow-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min((dailyStats.fats / targets.fats) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            <button 
                                onClick={handleQuickLogClick}
                                disabled={isAnalyzing}
                                className="mt-6 w-full py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors text-sm font-bold flex items-center justify-center gap-2 group"
                            >
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_a_photo</span>
                                Quick Log Meal
                            </button>
                        </div>

                        {/* Hydration Card */}
                        <div className="flex-1 bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-6 text-white relative overflow-hidden flex flex-col justify-center shadow-lg shadow-primary/20">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full pointer-events-none"></div>
                             
                             <div className="flex items-start justify-between mb-2">
                                <span className="material-symbols-outlined text-4xl">water_drop</span>
                                <div className="text-right">
                                    <p className="text-orange-100 text-xs font-bold uppercase">Daily Goal</p>
                                    <p className="font-black text-xl">{hydrationTarget}ml</p>
                                </div>
                             </div>
                             
                             <h3 className="text-2xl font-black mb-1">Hydration</h3>
                             <p className="text-orange-100 mb-4 text-sm opacity-90">Based on {user.weight}kg bodyweight</p>
                             
                             <div className="flex justify-between text-xs font-bold mb-1 opacity-80">
                                <span>{hydrationCurrent}ml consumed</span>
                                <span>{Math.round(hydrationProgress)}%</span>
                             </div>
                             
                             <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-white rounded-full transition-all duration-500 ease-out" style={{width: `${hydrationProgress}%`}}></div>
                             </div>
                             
                             <button 
                                className="bg-white text-primary font-bold py-3 rounded-xl shadow-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 active:scale-95 transform" 
                                onClick={addWater}
                             >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Log 250ml
                             </button>
                        </div>
                    </div>
                </div>

                {/* Recent Achievements */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {[
                         { icon: 'local_fire_department', label: '12 Day Streak', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
                         { icon: 'fitness_center', label: '10.5 Tons Lifted', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                         { icon: 'timer', label: '14h Active', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                         { icon: 'emoji_events', label: 'Top 5% Rank', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' }
                     ].map((stat, i) => (
                         <div key={i} className={`p-4 rounded-2xl ${stat.bg} flex items-center gap-3 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-colors`}>
                             <span className={`material-symbols-outlined ${stat.color} text-2xl`}>{stat.icon}</span>
                             <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{stat.label}</span>
                         </div>
                     ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;