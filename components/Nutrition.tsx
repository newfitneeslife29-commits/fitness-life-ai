import React, { useState, useMemo } from 'react';
import { FOOD_DATABASE, FoodItem } from '../data/foodDatabase';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getChatResponse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';

const Nutrition: React.FC = () => {
    const navigate = useNavigate();
    const { user, dailyLog, addToLog, removeFromLog } = useUser();
    const [activeTab, setActiveTab] = useState<'Tracker' | 'Planner'>('Tracker');
    
    // Tracker State
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'All' | 'Protein' | 'Carbs' | 'Fats' | 'Vegetables'>('All');

    // Planner State
    const [planLoading, setPlanLoading] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<any>(null);

    const handleAdd = (item: FoodItem) => {
        addToLog(item);
        // Visual feedback
        confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.7 },
            colors: ['#22c55e', '#ffffff'] // Green and white
        });
    };

    const totals = useMemo(() => {
        return dailyLog.reduce((acc, item) => ({
            calories: acc.calories + item.calories,
            protein: acc.protein + item.protein,
            carbs: acc.carbs + item.carbs,
            fats: acc.fats + item.fats
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    }, [dailyLog]);

    const filteredFood = FOOD_DATABASE.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const generateMealPlan = async () => {
        setPlanLoading(true);
        try {
            const prompt = `Generate a 1-day meal plan (Breakfast, Snack 1, Lunch, Snack 2, Dinner) for a user with goal: ${user.goal}, weight: ${user.weight}kg. Return STRICT JSON with type "meal_plan".`;
            const response = await getChatResponse(prompt, []);
            // Simple extraction logic for demo
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                setGeneratedPlan(JSON.parse(jsonMatch[0]));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setPlanLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Nutrition Engine</h1>
                    <p className="text-slate-500">Track your macros with precision.</p>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => setActiveTab('Tracker')}
                        className={`px-4 py-2 rounded-xl font-bold transition-colors ${activeTab === 'Tracker' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500'}`}
                    >
                        Tracker
                    </button>
                    <button 
                         onClick={() => setActiveTab('Planner')}
                        className={`px-4 py-2 rounded-xl font-bold transition-colors ${activeTab === 'Planner' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500'}`}
                    >
                        AI Planner
                    </button>
                </div>
            </header>

            {activeTab === 'Tracker' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Food Database */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Search food (e.g., Chicken, Rice)..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-100 dark:bg-white/5 focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {['All', 'Protein', 'Carbs', 'Fats', 'Vegetables'].map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat as any)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                                            selectedCategory === cat 
                                            ? 'bg-primary border-primary text-white' 
                                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-primary hover:text-primary'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredFood.map(item => (
                                <div key={item.id} className="bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 dark:text-white">{item.name}</h3>
                                            <span className={`size-2 rounded-full ${
                                                item.category === 'Protein' ? 'bg-orange-500' :
                                                item.category === 'Carbs' ? 'bg-blue-500' :
                                                item.category === 'Fats' ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}></span>
                                        </div>
                                        <p className="text-xs text-slate-500">{item.portion} • {item.calories} kcal</p>
                                        <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                                            <span>P: {item.protein}g</span>
                                            <span>C: {item.carbs}g</span>
                                            <span>F: {item.fats}g</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAdd(item)}
                                        className="size-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-primary hover:text-white flex items-center justify-center transition-colors group-active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Daily Tracker */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-200 dark:border-white/5 sticky top-6 shadow-xl shadow-primary/5">
                            <h2 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">restaurant</span>
                                Daily Intake
                            </h2>

                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <span className="text-3xl font-black text-slate-900 dark:text-white">{totals.calories.toFixed(0)}</span>
                                    <span className="text-sm text-slate-500 font-bold ml-1">/ 2,400 kcal</span>
                                </div>
                                <div className="size-12 rounded-full border-4 border-slate-100 dark:border-white/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-slate-400">{Math.round((totals.calories/2400)*100)}%</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                {[
                                    { label: 'Protein', val: totals.protein, target: 180, color: 'bg-orange-500' },
                                    { label: 'Carbs', val: totals.carbs, target: 280, color: 'bg-blue-500' },
                                    { label: 'Fats', val: totals.fats, target: 70, color: 'bg-yellow-500' }
                                ].map(m => (
                                    <div key={m.label}>
                                        <div className="flex justify-between text-xs font-bold mb-1 text-slate-600 dark:text-slate-400">
                                            <span>{m.label}</span>
                                            <span>{m.val.toFixed(1)} / {m.target}g</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${m.color} rounded-full transition-all duration-500`} 
                                                style={{width: `${Math.min((m.val / m.target) * 100, 100)}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Today's Log ({dailyLog.length})</h3>
                                {dailyLog.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No food added yet.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                        {dailyLog.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm animate-in fade-in slide-in-from-right-2 duration-300">
                                                <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs text-slate-500">{item.calories}</span>
                                                    <button onClick={() => removeFromLog(idx)} className="text-red-400 hover:text-red-500">
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
                    {!generatedPlan && !planLoading && (
                         <div className="text-center py-12">
                            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4">menu_book</span>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Smart Meal Planner</h2>
                            <p className="text-slate-500 mb-6">Generate a full day plan personalized for {user.goal}.</p>
                            <button onClick={generateMealPlan} className="bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                                Generate 1-Day Plan
                            </button>
                        </div>
                    )}

                    {planLoading && (
                         <div className="flex flex-col items-center py-12 gap-4">
                             <div className="size-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                             <p className="font-bold text-slate-500">Designing your menu...</p>
                         </div>
                    )}

                    {generatedPlan && (
                        <div className="w-full bg-white dark:bg-surface-dark border-t-4 border-green-500 rounded-b-xl shadow-sm">
                            <div className="p-4 bg-green-50 dark:bg-green-500/10 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{generatedPlan.title}</h3>
                                    <p className="text-sm text-slate-500">{generatedPlan.summary}</p>
                                </div>
                                <button onClick={() => setGeneratedPlan(null)} className="text-slate-400 hover:text-red-500 font-bold text-sm">Reset</button>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {generatedPlan.meals && generatedPlan.meals.map((meal: any, i: number) => (
                                    <div key={i} className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-white">{meal.name}</h4>
                                            <span className="text-xs font-mono font-bold text-slate-400">{meal.macros?.cal} kcal</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{meal.ingredients?.join(', ')}</p>
                                        
                                        <div className="flex gap-3 text-xs font-bold text-slate-500 mb-3">
                                            <span className="text-orange-500">P: {meal.macros?.p}g</span>
                                            <span className="text-blue-500">C: {meal.macros?.c}g</span>
                                            <span className="text-yellow-500">F: {meal.macros?.f}g</span>
                                        </div>

                                        {meal.substitution && (
                                            <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg flex items-center gap-2 text-xs">
                                                <span className="material-symbols-outlined text-sm text-primary">swap_horiz</span>
                                                <span className="text-slate-600 dark:text-slate-400"><strong>Swap:</strong> {meal.substitution}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Nutrition;