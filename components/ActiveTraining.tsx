import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { WorkoutRoutine } from '../data/workoutCatalog';
import confetti from 'canvas-confetti';

const ActiveTraining: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const workoutData = location.state?.workout as WorkoutRoutine | undefined;

    // Default fallback
    const title = workoutData?.title || "Quick Start Workout";
    const exercises = workoutData?.exercises || [
        { name: "Goblet Squat", sets: 3, reps: "12", rest: "60s" }
    ];

    // State
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [weight, setWeight] = useState(20);
    const [reps, setReps] = useState(12);
    
    // Rest Timer State
    const [isResting, setIsResting] = useState(false);
    const [restTime, setRestTime] = useState(60);
    const [timeLeft, setTimeLeft] = useState(60);

    const currentExercise = exercises[currentExerciseIndex];
    const totalSets = currentExercise.sets;
    const progress = ((currentExerciseIndex) / exercises.length) * 100;

    // Parse Rest Time from string (e.g. "60s" -> 60)
    useEffect(() => {
        const restString = currentExercise.rest || "60s";
        const parsed = parseInt(restString.replace(/\D/g, '')) || 60;
        setRestTime(parsed);
    }, [currentExerciseIndex]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (isResting && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsResting(false);
            // Optional sound effect here
        }
        return () => clearInterval(interval);
    }, [isResting, timeLeft]);

    const handleCompleteSet = () => {
        if (currentSet < totalSets) {
            // Next Set
            setCurrentSet(prev => prev + 1);
            setTimeLeft(restTime);
            setIsResting(true);
        } else {
            // Next Exercise
            if (currentExerciseIndex < exercises.length - 1) {
                setCurrentExerciseIndex(prev => prev + 1);
                setCurrentSet(1);
                setTimeLeft(restTime);
                setIsResting(true);
            } else {
                // Workout Complete
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                navigate('/achievements'); // Redirect to achievements or summary
            }
        }
    };

    const skipRest = () => {
        setIsResting(false);
    };

    const addTime = (seconds: number) => {
        setTimeLeft(prev => prev + seconds);
    };

    // Helper to get real action shot based on exercise name with RELIABLE URLs
    const getExerciseImage = (name: string) => {
        const lower = name.toLowerCase();
        
        // Squat / Legs
        if (lower.includes('squat') || lower.includes('leg') || lower.includes('lunge')) {
             return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop';
        }
        // Press / Chest / Push
        if (lower.includes('press') || lower.includes('push') || lower.includes('chest') || lower.includes('bench')) {
             return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop';
        }
        // Back / Pull / Row
        if (lower.includes('row') || lower.includes('pull') || lower.includes('back') || lower.includes('lat')) {
             return 'https://images.unsplash.com/photo-1603287681836-e60567a2d119?q=80&w=800&auto=format&fit=crop';
        }
        // Arms / Bicep / Tricep
        if (lower.includes('curl') || lower.includes('arm') || lower.includes('tricep')) {
             return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop';
        }
        // Abs / Core
        if (lower.includes('abs') || lower.includes('core') || lower.includes('plank')) {
             return 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=800&auto=format&fit=crop';
        }
        // Cardio / Run
        if (lower.includes('run') || lower.includes('cardio') || lower.includes('jump') || lower.includes('rope')) {
             return 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop';
        }
        
        // Generic Fallback (Gym interior)
        return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop';
    };

    // Component for list of upcoming exercises
    const UpNextList = ({ limit }: { limit?: number }) => {
        const remaining = exercises.slice(currentExerciseIndex + 1, limit ? currentExerciseIndex + 1 + limit : undefined);
        
        if (remaining.length === 0) {
            return (
                 <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                    <p className="text-green-500 font-bold text-sm">Last Exercise!</p>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                {remaining.map((ex, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white dark:bg-surface-dark p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 border border-slate-100 dark:border-white/5 flex items-center justify-center relative">
                            <img src={getExerciseImage(ex.name)} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            <span className="material-symbols-outlined text-white relative z-10 text-[20px]">fitness_center</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{ex.name}</p>
                            <p className="text-xs text-gray-500">{ex.sets} sets • {ex.reps}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        // Use h-dvh for dynamic viewport height on mobile browsers
        <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white h-dvh flex flex-col overflow-hidden relative">
            
            {/* Rest Timer Overlay */}
            {isResting && (
                <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-200 p-4 text-center">
                    <h2 className="text-3xl font-black mb-2">Rest & Recover</h2>
                    <p className="text-slate-400 mb-8">Next: Set {currentSet} of {totalSets}</p>
                    
                    <div className="relative size-64 mb-8">
                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path 
                                className="text-primary transition-all duration-1000 ease-linear" 
                                strokeDasharray={`${(timeLeft / restTime) * 100}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black tabular-nums">{timeLeft}</span>
                            <span className="text-sm font-bold uppercase tracking-widest text-primary">Seconds</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => addTime(15)} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition-colors">+15s</button>
                        <button onClick={skipRest} className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-dark font-bold text-white shadow-lg shadow-primary/30 transition-colors">Skip Rest</button>
                    </div>
                </div>
            )}

            <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-darker/50 backdrop-blur-sm z-50 shrink-0">
                <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 shrink-0"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <span className="font-bold text-lg tracking-tight truncate">{title}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
                            <span className="font-mono font-medium text-sm">Active</span>
                        </div>
                        <Link to="/training" className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors whitespace-nowrap">
                            End <span className="hidden sm:inline">Workout</span>
                        </Link>
                    </div>
                </div>
                {/* Mobile Progress Bar at bottom of header */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-800">
                     <div className="h-full bg-primary transition-all duration-500 ease-out" style={{width: `${progress}%`}}></div>
                </div>
            </header>

            <main className="flex-1 relative flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-2 sm:p-4 lg:p-6 gap-4 sm:gap-6 overflow-hidden">
                <section className="flex-1 flex flex-col min-h-0 h-full gap-2 sm:gap-4 overflow-y-auto lg:overflow-visible pb-safe">
                    <div className="shrink-0 flex flex-col gap-2 mb-1">
                        <h1 className="text-2xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white truncate">{currentExercise.name}</h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                <span className="material-symbols-outlined text-primary text-[16px] sm:text-[18px]">repeat</span>
                                <span className="text-xs sm:text-sm font-bold text-primary">Set {currentSet} / {totalSets}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <span className="material-symbols-outlined text-slate-500 text-[16px] sm:text-[18px]">fitness_center</span>
                                <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">Target: {currentExercise.reps}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl shadow-black/5 overflow-hidden flex flex-col relative group min-h-[500px] lg:min-h-0">
                        
                        {/* Dynamic Image Real Photo */}
                        <div className="relative h-1/3 sm:h-1/2 min-h-[180px] w-full overflow-hidden bg-slate-900">
                            <img 
                                src={getExerciseImage(currentExercise.name)} 
                                alt={currentExercise.name}
                                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000"
                                loading="eager"
                            />
                            {/* Gradient Overlay for Text Visibility */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                            
                             {currentExercise.tip && (
                                 <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 bg-black/60 backdrop-blur-md p-2 sm:p-3 rounded-xl border-l-4 border-primary">
                                     <p className="text-white text-xs sm:text-sm font-medium flex items-start gap-2">
                                         <span className="material-symbols-outlined text-primary text-sm sm:text-base mt-0.5">info</span>
                                         {currentExercise.tip}
                                     </p>
                                 </div>
                             )}
                        </div>

                        {/* Controls - Compact on mobile */}
                        <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-center">
                            <div className="grid grid-cols-2 gap-4 sm:gap-8 max-w-2xl mx-auto w-full">
                                <div className="flex flex-col gap-2 sm:gap-3 group/input">
                                    <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Weight (kg)</label>
                                    <div className="relative flex items-center">
                                        <button onClick={() => setWeight(w => w - 2.5)} className="absolute left-0 w-10 sm:w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-l-xl transition-colors">
                                            <span className="material-symbols-outlined">remove</span>
                                        </button>
                                        <input className="w-full bg-gray-100 dark:bg-surface-darker text-center text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white rounded-xl py-4 sm:py-6 focus:ring-2 focus:ring-primary focus:outline-none border-none" type="number" value={weight} readOnly/>
                                        <button onClick={() => setWeight(w => w + 2.5)} className="absolute right-0 w-10 sm:w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-r-xl transition-colors">
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 sm:gap-3">
                                    <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Reps</label>
                                    <div className="relative flex items-center">
                                        <button onClick={() => setReps(r => r - 1)} className="absolute left-0 w-10 sm:w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-l-xl transition-colors">
                                            <span className="material-symbols-outlined">remove</span>
                                        </button>
                                        <input className="w-full bg-gray-100 dark:bg-surface-darker text-center text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white rounded-xl py-4 sm:py-6 focus:ring-2 focus:ring-primary focus:outline-none border-none" type="number" value={reps} readOnly/>
                                        <button onClick={() => setReps(r => r + 1)} className="absolute right-0 w-10 sm:w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 rounded-r-xl transition-colors">
                                            <span className="material-symbols-outlined">add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800/50 flex justify-between items-center bg-gray-50 dark:bg-surface-darker/30 gap-2">
                            <button className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs sm:text-sm font-medium px-2 sm:px-4 py-2 rounded-lg hover:bg-white/5">
                                <span className="material-symbols-outlined text-[18px]">history</span>
                                <span className="hidden sm:inline">History</span>
                            </button>
                            <button 
                                onClick={handleCompleteSet}
                                className="flex-1 max-w-sm mx-auto bg-primary hover:bg-primary-dark text-white text-base sm:text-lg font-bold py-3 sm:py-4 px-4 sm:px-8 rounded-xl shadow-lg shadow-primary/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 sm:gap-3"
                            >
                                <span className="material-symbols-outlined filled">check_circle</span>
                                <span className="whitespace-nowrap">
                                    {currentSet >= totalSets && currentExerciseIndex === exercises.length - 1 ? 'Finish' : `Complete Set ${currentSet}`}
                                </span>
                            </button>
                            <button className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs sm:text-sm font-medium px-2 sm:px-4 py-2 rounded-lg hover:bg-white/5">
                                <span className="material-symbols-outlined text-[18px]">skip_next</span>
                                <span className="hidden sm:inline">Skip</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* MOBILE UP NEXT SECTION */}
                    <div className="lg:hidden mt-2 pb-10">
                        <div className="flex items-center gap-2 mb-3 px-1">
                             <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coming Up Next</span>
                             <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                        </div>
                        <UpNextList limit={3} />
                    </div>

                </section>

                <aside className="hidden lg:flex w-80 flex-col gap-6 shrink-0 lg:h-full lg:overflow-y-auto pb-20 lg:pb-0">
                    {/* Up Next Preview (Desktop Sidebar) */}
                     <div className="opacity-80">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Up Next</p>
                        <UpNextList limit={5} />
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default ActiveTraining;