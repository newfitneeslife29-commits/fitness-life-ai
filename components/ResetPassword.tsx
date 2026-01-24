import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Verify we are in a recovery session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, maybe the link is invalid or expired. 
                // However, Supabase magic links usually log you in.
                // We'll see.
            }
        });

        // Listen for the recovery event to be sure
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event in ResetPassword:", event);
            if (event === 'PASSWORD_RECOVERY') {
                // We are in the right place
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
                <div className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-surface-dark shadow-xl text-center">
                    <h2 className="text-2xl font-bold text-green-600 mb-4">Password Updated!</h2>
                    <p className="text-slate-600 dark:text-slate-300">Your password has been changed successfully. You will be redirected to the dashboard shortly.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-surface-dark p-8 shadow-xl border border-slate-100 dark:border-white/10">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Reset Password</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Enter a new password for your account.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            New Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
