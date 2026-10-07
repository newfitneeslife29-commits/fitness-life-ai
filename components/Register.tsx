import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import PremiumModal from './PremiumModal';

const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [newUserId, setNewUserId] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                console.error("Register error:", error);
                if (error.message.includes("already registered")) {
                    throw new Error("This email is already registered. Please login instead.");
                }
                if (error.status === 429 || error.message.includes("rate limit") || error.message.includes("limit exceeded")) {
                    throw new Error("Too many attempts. Please wait a few minutes before trying again.");
                }
                throw error;
            }

            setNewUserId(data?.user?.id ?? null);

            if (data?.user && !data.session) {
                setSuccessMessage("Registration successful! Please check your email to confirm your account.");
                setShowPremiumModal(true); // Show premium offer even if email confirm is needed
                return;
            }

            // If session exists immediately (e.g. if email confirm is off), go to premium offer
            setShowPremiumModal(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSkipPremium = () => {
        // If we have a success message (email confirm needed), we just close the modal
        // and let the user see the message to check their email.
        if (successMessage) {
            setShowPremiumModal(false);
            return;
        }
        navigate('/onboarding');
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/auth-bg.png')" }}>
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-0"></div>

            <div className="relative z-10 w-full max-w-5xl bg-white dark:bg-surface-dark rounded-3xl shadow-2xl overflow-hidden flex flex-col-reverse md:flex-row border border-slate-100 dark:border-white/10 mx-2">

                {/* Left Side: Premium Offer (Bottom on Mobile) */}
                <div className="w-full md:w-1/2 relative bg-slate-900 overflow-hidden flex flex-col justify-between p-6 md:p-12 text-white">
                    <div className="absolute inset-0 z-0">
                        <img
                            src="/gym-premium-bg.png"
                            alt="Premium Background"
                            className="w-full h-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90"></div>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-black mb-4 leading-tight">
                            Unlock Your <span className="text-primary">Full Potential</span>
                        </h2>
                        <p className="text-slate-300 mb-8">Join the elite community and transform your body with scientific precision.</p>

                        <div className="space-y-4 mb-8">
                            {[
                                'Planes de nutrición exactos',
                                'Rutinas de gimnasio avanzadas',
                                'Soporte 24/7'
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="flex items-center justify-center p-1.5 bg-green-500/20 text-green-400 rounded-full">
                                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                                    </span>
                                    <span className="font-bold text-slate-100">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 mt-6 md:mt-auto pt-8 border-t border-white/10">
                        <div className="flex items-end gap-3">
                            <span className="text-lg text-slate-500 line-through decoration-red-500/50 font-bold">$19.99</span>
                            <span className="text-4xl font-black text-white">$7.99</span>
                            <span className="text-xs text-slate-400 font-bold mb-1">/ month</span>
                        </div>
                        <p className="text-xs text-primary mt-2 font-bold uppercase tracking-widest">Limited Time Offer</p>
                    </div>
                </div>

                {/* Right Side: Registration Form (Top on Mobile) */}
                <div className="w-full md:w-1/2 p-6 md:p-12 bg-white dark:bg-surface-dark flex flex-col justify-center">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Create Free Account</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Or upgrade immediately after signing up
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleRegister}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                                <div className="flex">
                                    <div className="text-sm text-red-700 dark:text-red-400">
                                        {error}
                                    </div>
                                </div>
                            </div>
                        )}

                        {successMessage && (
                            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
                                <div className="flex">
                                    <div className="text-sm text-green-700 dark:text-green-400 font-bold">
                                        {successMessage}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>

                        <div className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
                                Sign in
                            </Link>
                        </div>
                    </form>
                </div>
            </div>

            <PremiumModal
                isOpen={showPremiumModal}
                onClose={handleSkipPremium}
                paymentUrl={import.meta.env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/test_5kQ6oJ2Q51SK8FxgmB77O01"}
                userId={newUserId}
                email={email}
            />
        </div >
    );
};

export default Register;
