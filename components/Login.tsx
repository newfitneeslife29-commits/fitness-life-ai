import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("Login error:", error);
                if (error.message.includes("Email not confirmed")) {
                    throw new Error("Please confirm your email address before logging in. Check your inbox.");
                } else if (error.message.includes("Invalid login credentials")) {
                    throw new Error("Incorrect email or password. Please try again or use 'Forgot Password'.");
                }
                throw error;
            }

            // Successful login
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/auth-bg.png')" }}>
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-0"></div>

            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-xl border border-slate-100 dark:border-white/10 relative z-10">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Welcome Back</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Sign in to access your workouts
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
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
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-medium text-primary hover:text-primary-dark">
                                    Forgot password?
                                </button>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>

                    <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-primary hover:text-primary-dark">
                            Sign up
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
