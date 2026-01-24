import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                if (error.status === 429 || error.message.includes("rate limit") || error.message.includes("limit exceeded")) {
                    throw new Error("Too many requests. Please wait a few minutes before trying again.");
                }
                throw error;
            }

            setSuccessMessage("Password reset instructions sent! Check your email.");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-xl border border-slate-100 dark:border-white/10">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Forgot Password?</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Enter your email to receive reset instructions
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
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

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="flex-1 w-full justify-center rounded-lg border border-slate-300 dark:border-white/20 px-4 py-2 text-sm font-medium text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex-1 w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Sending...' : 'Send Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
