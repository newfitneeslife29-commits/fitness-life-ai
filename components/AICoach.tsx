import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse, analyzeImage, analyzeVideo } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';

type Mode = 'chat' | 'meal-scan' | 'workout-gen';

interface Message {
    role: 'user' | 'model';
    content: string | any; // Content can be string or JSON object
    type?: 'text' | 'json';
}

const AICoach: React.FC = () => {
    const [mode, setMode] = useState<Mode>('chat');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: "I am Fitness Life AI. Ready to optimize your physiology. Upload a meal photo, ask for a weekly schedule, or generate a workout.", type: 'text' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => scrollToBottom(), [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedFile) || loading) return;

        setLoading(true);
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg || (selectedFile ? `Analyzing ${mode}...` : '...'), type: 'text' }]);
        setInput('');

        try {
            let responseText = '';

            if (mode === 'chat' || mode === 'workout-gen') {
                 // Format history for API
                const history = messages.filter(m => m.type === 'text').map(m => ({
                    role: m.role,
                    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
                }));
                responseText = await getChatResponse(userMsg || "Generate a workout", history);
            } else if (mode === 'meal-scan' && selectedFile) {
                const base64 = await convertToBase64(selectedFile);
                responseText = await analyzeImage(base64, userMsg || "Identify ingredients, estimate calories and macros (Protein, Carbs, Fats). Analyze quality. Provide strict JSON.");
            }

            // Attempt to parse JSON
            let parsedContent: any = responseText;
            let contentType: 'text' | 'json' = 'text';
            try {
                // Find JSON substring if wrapped in markdown code blocks
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsedContent = JSON.parse(jsonMatch[0]);
                    contentType = 'json';
                    if (['workout', 'meal', 'weekly_plan', 'meal_plan'].includes(parsedContent.type)) {
                         confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                    }
                }
            } catch (e) {
                console.log("Response was not JSON", e);
            }

            setMessages(prev => [...prev, { role: 'model', content: parsedContent, type: contentType }]);
            
            if (selectedFile) {
                setSelectedFile(null);
                setPreviewUrl(null);
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "System error. Please retry.", type: 'text' }]);
        } finally {
            setLoading(false);
        }
    };

    // Render Helper for JSON Content
    const renderContent = (msg: Message) => {
        if (msg.type === 'text' || typeof msg.content === 'string') {
            return <ReactMarkdown>{msg.content}</ReactMarkdown>;
        }

        const data = msg.content;
        
        // --- 1. Workout Card ---
        if (data.type === 'workout') {
            return (
                <div className="bg-white dark:bg-surface-dark border-l-4 border-primary rounded-r-xl p-4 shadow-sm w-full">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{data.title || "Workout Plan"}</h3>
                    <p className="text-slate-500 text-sm mb-4">{data.summary}</p>
                    <div className="space-y-6">
                        {data.data && data.data.map((ex: any, i: number) => (
                            <div key={i} className="flex flex-col bg-slate-50 dark:bg-white/5 rounded-xl overflow-hidden border border-slate-100 dark:border-white/5">
                                <div className="p-3 flex justify-between items-start">
                                    <div>
                                        <span className="font-bold text-slate-800 dark:text-white block text-lg">{ex.name}</span>
                                        <span className="text-xs text-slate-500">{ex.notes}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-mono font-bold text-primary">{ex.sets} x {ex.reps}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                     <button className="mt-4 w-full bg-primary text-white py-2 rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors">
                        Save Workout
                    </button>
                </div>
            );
        }

        // --- 2. Meal Plan (Full Day) ---
        if (data.type === 'meal_plan') {
            return (
                <div className="bg-white dark:bg-surface-dark border-t-4 border-green-500 rounded-b-xl shadow-sm w-full">
                    <div className="p-4 bg-green-50 dark:bg-green-500/10">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{data.title}</h3>
                        <p className="text-sm text-slate-500">{data.summary}</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {data.meals && data.meals.map((meal: any, i: number) => (
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
            );
        }

        // --- 3. Meal Card ---
        if (data.type === 'meal') {
             return (
                <div className="bg-white dark:bg-surface-dark border-l-4 border-green-500 rounded-r-xl p-4 shadow-sm w-full">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{data.title || "Meal Analysis"}</h3>
                        {data.analysis && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                data.analysis === 'Balanced' ? 'bg-green-100 text-green-700' :
                                data.analysis === 'High Protein' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                                {data.analysis}
                            </span>
                        )}
                    </div>
                    
                    {data.advice && (
                        <div className="mb-4 bg-slate-50 dark:bg-white/5 p-2 rounded-lg flex gap-2 items-start">
                             <span className="material-symbols-outlined text-yellow-500 text-sm mt-0.5">lightbulb</span>
                             <p className="text-xs text-slate-600 dark:text-slate-300 italic">{data.advice}</p>
                        </div>
                    )}

                    <div className="flex gap-4 mb-4">
                        {data.totalStats && (
                            <>
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 uppercase font-bold">Cals</span>
                                <span className="font-black text-xl text-slate-900 dark:text-white">{data.totalStats.calories}</span>
                            </div>
                            <div className="w-px bg-slate-200 h-8"></div>
                            </>
                        )}
                         <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase font-bold">Summary</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{data.summary}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {data.data && data.data.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2 last:border-0">
                                <span className="text-sm font-medium text-slate-800 dark:text-white">{item.item}</span>
                                <div className="text-xs text-slate-500 flex gap-2">
                                    <span className="text-orange-500">P: {item.protein}</span>
                                    <span className="text-blue-500">C: {item.carbs}</span>
                                    <span className="text-yellow-500">F: {item.fats}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                     <button className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors">
                        Log to Daily Macros
                    </button>
                </div>
            );
        }

        // --- 4. Weekly Plan / Calendar ---
        if (data.type === 'weekly_plan') {
            return (
                <div className="bg-white dark:bg-surface-dark border-t-4 border-accent rounded-b-xl shadow-sm w-full overflow-hidden">
                    <div className="p-4 bg-accent/5">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{data.title}</h3>
                        <p className="text-sm text-slate-500">{data.summary}</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {data.data && data.data.map((day: any, i: number) => (
                            <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center text-white shrink-0 ${
                                        day.type === 'rest' ? 'bg-slate-300 dark:bg-slate-700' :
                                        day.type === 'cardio' ? 'bg-blue-400' : 'bg-primary'
                                    }`}>
                                        <span className="material-symbols-outlined text-sm">
                                            {day.type === 'rest' ? 'spa' : day.type === 'cardio' ? 'directions_run' : 'fitness_center'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">{day.day}</p>
                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{day.focus}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-400 block">Target</span>
                                    <span className="text-xs font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                        {day.calories} kcal
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Fallback for chat type in JSON or unknown type
        return <p className="text-slate-800 dark:text-slate-200">{data.summary || JSON.stringify(data)}</p>;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-full bg-background-light dark:bg-background-dark p-4 md:p-8 max-w-5xl mx-auto w-full">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Fitness Life <span className="text-primary">AI</span>
                    </h1>
                    <p className="text-slate-500 text-sm">Expert Physiology & Nutrition Engine</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-surface-dark rounded-xl p-1 self-start">
                    {[
                        { id: 'chat', label: 'Chat', icon: 'chat_bubble' },
                        { id: 'workout-gen', label: 'Workout Gen', icon: 'fitness_center' },
                        { id: 'meal-scan', label: 'Meal Scan', icon: 'lunch_dining' }
                    ].map((m) => (
                        <button
                            key={m.id}
                            onClick={() => { setMode(m.id as Mode); setSelectedFile(null); setPreviewUrl(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                mode === m.id 
                                ? 'bg-white dark:bg-surface-raised-dark text-primary shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">{m.icon}</span>
                            {m.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex-1 bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-xl">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-transparent">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white mr-2 shrink-0 mt-1">
                                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                                </div>
                            )}
                            <div className={`max-w-[95%] md:max-w-[85%] rounded-2xl p-4 shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-slate-900 dark:bg-primary text-white rounded-br-none' 
                                : 'bg-white dark:bg-surface-raised-dark border border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-bl-none w-full'
                            }`}>
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                    {renderContent(msg)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start items-center gap-2 text-slate-400 ml-10">
                            <span className="text-xs font-bold animate-pulse">Fitness Life AI is thinking...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-surface-darker border-t border-slate-100 dark:border-white/5">
                    {previewUrl && (
                        <div className="mb-4 relative inline-block animate-bounce-slight">
                            <img src={previewUrl} alt="Preview" className="h-24 rounded-lg border border-primary/50 object-cover shadow-lg" />
                            <button 
                                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 hover:scale-110 transition-transform"
                            >
                                <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {(mode === 'meal-scan' || mode === 'workout-gen') && (
                            <label className="flex items-center justify-center p-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-primary/10 hover:text-primary text-slate-400 cursor-pointer transition-colors shrink-0">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleFileChange}
                                />
                                <span className="material-symbols-outlined">add_a_photo</span>
                            </label>
                        )}
                        
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={
                                    mode === 'chat' ? "Ask about physiology, nutrition, or plans..." : 
                                    mode === 'meal-scan' ? "Upload photo & describe meal context..." : 
                                    "Describe your goal (e.g., 'Leg day, no equipment')..."
                                }
                                className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/50 transition-all pr-12 font-medium"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={loading || (!input && !selectedFile)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined filled">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICoach;