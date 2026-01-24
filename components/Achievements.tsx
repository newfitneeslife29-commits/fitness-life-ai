import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useUser } from '../context/UserContext';

const Achievements: React.FC = () => {
    const { user, addXP } = useUser();
    
    // Level Logic: 1000 XP per level
    const currentXP = user.xp || 0;
    const currentLevel = Math.floor(currentXP / 1000) + 1;
    const nextLevelXP = currentLevel * 1000;
    const progress = ((currentXP % 1000) / 1000) * 100;
    const xpToNext = 1000 - (currentXP % 1000);

    // Local state for completed daily objectives (to prevent spamming)
    const [completedObjectives, setCompletedObjectives] = useState<number[]>([]);

    const badges = [
        { id: 1, name: "Early Bird", desc: "Completed 5 workouts before 8 AM", icon: "wb_sunny", unlocked: true, color: "text-yellow-500 bg-yellow-100" },
        { id: 2, name: "Streak Master", desc: "7 Day Workout Streak", icon: "local_fire_department", unlocked: true, color: "text-orange-500 bg-orange-100" },
        { id: 3, name: "Heavy Lifter", desc: "Lifted 1000kg Total Volume", icon: "fitness_center", unlocked: false, color: "text-slate-400 bg-slate-100 dark:bg-white/5" },
        { id: 4, name: "Nutritionist", desc: "Logged meals for 30 days", icon: "restaurant", unlocked: false, color: "text-slate-400 bg-slate-100 dark:bg-white/5" },
        { id: 5, name: "Social Butterfly", desc: "Added 10 friends", icon: "group", unlocked: true, color: "text-blue-500 bg-blue-100" },
        { id: 6, name: "Zen Master", desc: "Completed 10 Yoga sessions", icon: "self_improvement", unlocked: false, color: "text-slate-400 bg-slate-100 dark:bg-white/5" },
    ];

    const handleBadgeClick = (unlocked: boolean) => {
        if(unlocked) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500']
            });
        }
    };

    const handleObjectiveClick = (id: number, pts: number) => {
        if (completedObjectives.includes(id)) return;
        
        addXP(pts);
        setCompletedObjectives(prev => [...prev, id]);
        
        // Small confetti for objective
        confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.7 },
            colors: ['#22c55e'] // Green
        });
    };

    const objectives = [
        { id: 1, title: "Hydrate", desc: "Drink 3L of water", pts: 50 },
        { id: 2, title: "Active Recovery", desc: "15 min Stretching", pts: 100 },
        { id: 3, title: "Community", desc: "Comment on 3 posts", pts: 30 },
    ];

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 pb-20">
             <header>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">My Achievements</h1>
                <p className="text-slate-500">Level up your fitness journey.</p>
            </header>

            {/* Level Card */}
            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-primary/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="size-24 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center relative group">
                            <span className="material-symbols-outlined text-5xl group-hover:scale-110 transition-transform">military_tech</span>
                            <div className="absolute -bottom-2 bg-white text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                +XP
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black">Level {currentLevel}</h2>
                            <p className="text-orange-100 font-medium">
                                {currentLevel < 5 ? "Rookie" : currentLevel < 10 ? "Athlete" : "Elite Spartan"}
                            </p>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-1/2 flex flex-col gap-2">
                        <div className="flex justify-between text-sm font-bold">
                            <span>{currentXP} XP</span>
                            <span>{nextLevelXP} XP</span>
                        </div>
                        <div className="h-4 w-full bg-black/20 rounded-full overflow-hidden relative">
                            <div className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" style={{width: `${progress}%`}}></div>
                        </div>
                        <p className="text-xs text-right text-orange-100 mt-1">{xpToNext} XP to Level {currentLevel + 1}</p>
                    </div>
                </div>
            </div>

            {/* Badges Grid */}
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Badges Collection</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {badges.map(badge => (
                        <div 
                            key={badge.id} 
                            onClick={() => handleBadgeClick(badge.unlocked)}
                            className={`p-6 rounded-2xl border ${badge.unlocked ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark cursor-pointer' : 'border-dashed border-slate-300 dark:border-white/5 bg-slate-50 dark:bg-transparent opacity-60'} flex items-start gap-4 transition-all hover:scale-[1.02]`}
                        >
                            <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${badge.color}`}>
                                <span className="material-symbols-outlined text-2xl">{badge.icon}</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{badge.name}</h4>
                                <p className="text-sm text-slate-500 mt-1">{badge.desc}</p>
                                {!badge.unlocked && <span className="text-xs font-bold text-slate-400 mt-2 block uppercase tracking-wide">Locked</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Objectives List */}
             <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Daily Objectives <span className="text-sm font-normal text-slate-400 ml-2">(Tap to complete)</span></h3>
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-100 dark:border-white/5 space-y-4">
                    {objectives.map((obj) => {
                        const isDone = completedObjectives.includes(obj.id);
                        return (
                            <div 
                                key={obj.id} 
                                onClick={() => handleObjectiveClick(obj.id, obj.pts)}
                                className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${isDone ? 'bg-green-50 dark:bg-green-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                            >
                                 <div className="flex items-center gap-4">
                                    <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-white/20'}`}>
                                        {isDone && <span className="material-symbols-outlined text-sm animate-in zoom-in">check</span>}
                                    </div>
                                    <div>
                                        <p className={`font-bold transition-colors ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{obj.title}</p>
                                        <p className="text-xs text-slate-500">{obj.desc}</p>
                                    </div>
                                 </div>
                                 <div className={`text-xs font-bold transition-colors ${isDone ? 'text-green-500' : 'text-primary'}`}>
                                    {isDone ? 'Claimed' : `+${obj.pts} XP`}
                                 </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Achievements;