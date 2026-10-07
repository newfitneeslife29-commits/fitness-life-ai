import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';

const Onboarding: React.FC = () => {
    const { completeOnboarding, refreshPremium } = useUser();
    const location = useLocation();
    const navigate = useNavigate();
    const [premiumPending, setPremiumPending] = useState(false);
    const premiumPollStarted = React.useRef(false);

    // Back from Stripe: Premium is activated by the webhook, never by this URL.
    // Poll the profile for a few seconds until the webhook has run.
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('premium') !== 'true' || premiumPollStarted.current) return;
        premiumPollStarted.current = true;
        navigate('/onboarding', { replace: true });
        setPremiumPending(true);
        (async () => {
            for (let attempt = 0; attempt < 10; attempt++) {
                if (await refreshPremium()) {
                    confetti({
                        particleCount: 150,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#F44336', '#2196F3']
                    });
                    break;
                }
                await new Promise(r => setTimeout(r, 2000));
            }
            setPremiumPending(false);
        })();
    }, [location.search]);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        age: 25,
        weight: 70,
        height: 175,
        goal: 'Build Muscle',
        experience: 'Beginner',
        beforePhoto: ''
    });

    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');

    const handleNext = () => setStep(prev => prev + 1);

    const handleFinish = () => {
        completeOnboarding({
            ...formData,
            weight_unit: weightUnit,
            height_unit: heightUnit
        } as any);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, beforePhoto: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    // Helper to get display weight
    const getDisplayWeight = () => {
        if (weightUnit === 'kg') return formData.weight;
        return Math.round(formData.weight * 2.20462);
    };

    const handleWeightChange = (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;

        if (weightUnit === 'kg') {
            setFormData({ ...formData, weight: num });
        } else {
            setFormData({ ...formData, weight: num / 2.20462 });
        }
    };

    // Helper to get display height (feet/inches)
    const getDisplayHeightFeet = () => {
        const totalInches = formData.height / 2.54;
        return Math.floor(totalInches / 12);
    };

    const getDisplayHeightInches = () => {
        const totalInches = formData.height / 2.54;
        return Math.round(totalInches % 12);
    };

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
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
                    alt="Fitness Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-2xl shadow-black/50 border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Welcome to Fitness Life</h1>
                    <span className="text-primary font-bold">Step {step}/3</span>
                </div>

                {premiumPending && (
                    <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                        <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                        Confirming your Premium payment...
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4 animate-bounce-slight">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Let's get to know you.</h2>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">Name</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-xl bg-slate-100 dark:bg-white/5 border-none p-3 text-slate-900 dark:text-white" placeholder="Your Name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Age</label>
                                <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })} className="w-full rounded-xl bg-slate-100 dark:bg-white/5 border-none p-3 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">Gender</label>
                                <select className="w-full rounded-xl bg-slate-100 dark:bg-white/5 border-none p-3 text-slate-900 dark:text-white">
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={handleNext} disabled={!formData.name} className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 disabled:opacity-50 hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25">Next Step</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-bounce-slight">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Your Body Metrics</h2>

                        {/* Weight Section */}
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-slate-500">Weight</label>
                                <div className="flex bg-white dark:bg-black/20 rounded-lg p-1">
                                    <button
                                        onClick={() => setWeightUnit('kg')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${weightUnit === 'kg' ? 'bg-primary text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >KG</button>
                                    <button
                                        onClick={() => setWeightUnit('lbs')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${weightUnit === 'lbs' ? 'bg-primary text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >LBS</button>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={getDisplayWeight()}
                                    onChange={e => handleWeightChange(e.target.value)}
                                    className="w-full rounded-xl bg-white dark:bg-white/5 border-none p-3 text-slate-900 dark:text-white font-bold text-lg"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{weightUnit}</span>
                            </div>
                        </div>

                        {/* Height Section */}
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-slate-500">Height</label>
                                <div className="flex bg-white dark:bg-black/20 rounded-lg p-1">
                                    <button
                                        onClick={() => setHeightUnit('cm')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${heightUnit === 'cm' ? 'bg-primary text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >CM</button>
                                    <button
                                        onClick={() => setHeightUnit('ft')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${heightUnit === 'ft' ? 'bg-primary text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >FT</button>
                                </div>
                            </div>

                            {heightUnit === 'cm' ? (
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={Math.round(formData.height)}
                                        onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                                        className="w-full rounded-xl bg-white dark:bg-white/5 border-none p-3 text-slate-900 dark:text-white font-bold text-lg"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">cm</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={getDisplayHeightFeet()}
                                            onChange={e => handleHeightFeetChange(e.target.value)}
                                            className="w-full rounded-xl bg-white dark:bg-white/5 border-none p-3 text-slate-900 dark:text-white font-bold text-lg"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">ft</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={getDisplayHeightInches()}
                                            onChange={e => handleHeightInchesChange(e.target.value)}
                                            className="w-full rounded-xl bg-white dark:bg-white/5 border-none p-3 text-slate-900 dark:text-white font-bold text-lg"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">in</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1">Primary Goal</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Lose Weight', 'Build Muscle', 'Keep Fit', 'Athletic Performance'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFormData({ ...formData, goal: g as any })}
                                        className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${formData.goal === g ? 'border-primary bg-primary/10 text-primary' : 'border-slate-100 dark:border-white/5 text-slate-500'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleNext} className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4 hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25">Next Step</button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-bounce-slight">
                        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">The "Before" Photo</h2>
                        <p className="text-sm text-slate-500">Commit to your journey. Upload a photo to track your transformation.</p>

                        <label className="block w-full aspect-square rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all relative overflow-hidden group">
                            {formData.beforePhoto ? (
                                <img src={formData.beforePhoto} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-primary">add_a_photo</span>
                                    <span className="text-sm font-bold text-slate-400 mt-2">Tap to Upload</span>
                                </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>

                        <button onClick={handleFinish} className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors">Start My Journey</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Onboarding;