import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WORKOUT_CATALOG, GoalType, WorkoutRoutine, Exercise } from '../data/workoutCatalog';
import { useUser } from '../context/UserContext';
import confetti from 'canvas-confetti';

const WorkoutLibrary: React.FC = () => {
    const navigate = useNavigate();
    const { user, addCustomRoutine } = useUser();
    const [filter, setFilter] = useState<GoalType | 'All' | 'Custom'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Custom Routine State
    const [customTitle, setCustomTitle] = useState('');
    const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
    const [newExercise, setNewExercise] = useState<Exercise>({ name: '', sets: 3, reps: '12', rest: '60s' });

    const categories: { id: GoalType | 'Custom'; label: string; icon: string }[] = [
        { id: 'Custom', label: 'My Routines', icon: 'edit_square' },
        { id: 'Hypertrophy', label: 'Gym Mass', icon: 'fitness_center' },
        { id: 'Definition', label: 'Gym Cut', icon: 'local_fire_department' },
        { id: 'Home_Maintenance', label: 'Home (No Gear)', icon: 'home' },
        { id: 'Home_Weighted', label: 'Home (Min Gear)', icon: 'hardware' },
    ];

    const allWorkouts = [...user.customRoutines, ...WORKOUT_CATALOG];

    const filteredWorkouts = allWorkouts.filter(w => {
        if (filter === 'Custom') return user.customRoutines.includes(w);
        const matchesCategory = filter === 'All' || w.goal === filter;
        const matchesSearch = w.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleAddExercise = () => {
        if (!newExercise.name) return;
        setCustomExercises([...customExercises, newExercise]);
        setNewExercise({ name: '', sets: 3, reps: '12', rest: '60s' });
    };

    const handleSaveRoutine = () => {
        if (!customTitle || customExercises.length === 0) return;
        
        const newRoutine: WorkoutRoutine = {
            id: `CUSTOM_${Date.now()}`,
            title: customTitle,
            description: "Custom created routine.",
            goal: "Hypertrophy", // Default for custom
            level: "Intermediate",
            duration: `${customExercises.length * 5} min`,
            exercises: customExercises
        };

        addCustomRoutine(newRoutine);
        setIsCreating(false);
        setCustomTitle('');
        setCustomExercises([]);
        setFilter('Custom'); // Switch to custom tab
        confetti({ particleCount: 50, origin: { y: 0.6 } });
    };

    // Helper to get diverse real photos based on workout goal and index
    const getCoverImage = (goal: string, index: number) => {
        // Robust list of Gym/Training photos
        const gymImages = [
            'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop', // Muscular Back (Dark)
            'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop', // Man with Dumbbell
            'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop', // General Gym
            'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=800&auto=format&fit=crop', // Weights Rack
            'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop', // Deadlift Setup
        ];

        const hiitImages = [
            'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?q=80&w=800&auto=format&fit=crop', // Battle Ropes
            'https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=800&auto=format&fit=crop', // Running Track
            'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=800&auto=format&fit=crop'  // Pushups Home/Gym
        ];

        const homeImages = [
            'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop', // Pushup
            'https://images.unsplash.com/photo-1544367563-12123d8965cd?q=80&w=800&auto=format&fit=crop', // Yoga/Stretch
            'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=800&auto=format&fit=crop'  // Home Workout
        ];

        if (goal.includes('Home')) return homeImages[index % homeImages.length];
        if (goal === 'Definition') return hiitImages[index % hiitImages.length];
        
        // Default to Gym images
        return gymImages[index % gymImages.length];
    };

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6 pb-20 relative">
            <header className="flex flex-col gap-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Workout Library</h1>
                        <p className="text-slate-500">Select a blueprint or create your own.</p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setIsCreating(true)}
                            className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span className="hidden sm:inline">Create Routine</span>
                            <span className="sm:hidden">Create</span>
                        </button>
                        <button 
                            onClick={() => navigate('/ai-coach')}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-black/5"
                        >
                            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            <span className="hidden sm:inline">Generate with AI</span>
                            <span className="sm:hidden">AI Gen</span>
                        </button>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4 mt-2">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            type="text" 
                            placeholder="Search routine..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-100 dark:bg-white/5 focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <button 
                            onClick={() => setFilter('All')}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'All' ? 'bg-primary text-white' : 'bg-white dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setFilter(cat.id as any)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${filter === cat.id ? 'bg-primary text-white' : 'bg-white dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkouts.map((workout, index) => (
                    <div key={workout.id} className="group bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all flex flex-col h-full overflow-hidden relative">
                         {/* Card Image Real Photos */}
                         <div className="h-44 w-full rounded-xl mb-4 overflow-hidden relative bg-slate-100 dark:bg-white/5">
                             <img 
                                src={getCoverImage(workout.goal, index)} 
                                alt={workout.title}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                loading="lazy"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                             
                             <div className="absolute top-2 right-2 flex gap-1">
                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-black/50 text-white border border-white/10">
                                    {workout.goal.replace('_', ' ')}
                                </span>
                             </div>
                             
                             {/* Floating Icon on bottom left of image */}
                             <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                                    <span className="material-symbols-outlined text-white text-[18px]">
                                        {workout.goal.includes('Gym') ? 'fitness_center' : workout.goal.includes('Custom') ? 'edit' : 'home'}
                                    </span>
                                </div>
                             </div>
                        </div>

                        <div className="flex justify-between items-start mb-2">
                             <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{workout.title}</h3>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <span>{workout.duration}</span>
                            <span>•</span>
                            <span>{workout.level}</span>
                        </div>

                        <div className="mt-auto space-y-4">
                            <div className="flex flex-col gap-2">
                                {workout.exercises.slice(0, 3).map((ex, i) => (
                                    <div key={i} className="flex justify-between text-xs items-center border-b border-slate-50 dark:border-white/5 pb-1 last:border-0">
                                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[70%]">{ex.name}</span>
                                        <span className="text-slate-400">{ex.sets} x {ex.reps}</span>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={() => navigate('/training/active', { state: { workout } })}
                                className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white text-slate-900 dark:text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white"
                            >
                                <span className="material-symbols-outlined filled text-[18px]">play_arrow</span>
                                Start Routine
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Custom Modal (Mobile Optimized) */}
            {isCreating && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center sm:p-4">
                    <div className="bg-white dark:bg-surface-dark w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Create Custom Routine</h2>
                            <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-6 flex-1 overflow-y-auto pb-safe">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Routine Name</label>
                                <input 
                                    type="text" 
                                    value={customTitle} 
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-white/5 rounded-xl border-none p-3 text-slate-900 dark:text-white"
                                    placeholder="e.g. Saturday Abs & Cardio"
                                />
                            </div>

                            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Add Exercise</h3>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    <input placeholder="Name" className="col-span-2 bg-white dark:bg-surface-dark rounded-lg border-none text-sm p-2" value={newExercise.name} onChange={e => setNewExercise({...newExercise, name: e.target.value})} />
                                    <input placeholder="Sets" type="number" className="bg-white dark:bg-surface-dark rounded-lg border-none text-sm p-2" value={newExercise.sets} onChange={e => setNewExercise({...newExercise, sets: parseInt(e.target.value)})} />
                                    <input placeholder="Reps" className="bg-white dark:bg-surface-dark rounded-lg border-none text-sm p-2" value={newExercise.reps} onChange={e => setNewExercise({...newExercise, reps: e.target.value})} />
                                </div>
                                <button onClick={handleAddExercise} className="w-full py-3 bg-slate-200 dark:bg-white/10 hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors">
                                    + Add to List
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-slate-500">Exercises ({customExercises.length})</h3>
                                {customExercises.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic text-center py-4">No exercises added yet.</p>
                                ) : (
                                    customExercises.map((ex, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-lg">
                                            <span className="font-medium text-sm text-slate-900 dark:text-white truncate max-w-[60%]">{ex.name}</span>
                                            <span className="text-xs text-slate-500">{ex.sets} x {ex.reps}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        
                        <div className="pt-4 mt-auto shrink-0 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-white/5">
                            <button 
                                onClick={handleSaveRoutine}
                                disabled={!customTitle || customExercises.length === 0}
                                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">save</span>
                                Save Routine
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkoutLibrary;