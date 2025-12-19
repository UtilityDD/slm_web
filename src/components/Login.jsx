import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Login({ onLogin, showNotification }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [view, setView] = useState('login'); // login, signup, forgot, update
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if we're in a password recovery flow
        if (window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery')) {
            setView('update');
        }
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (view === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                showNotification('Check your email for the login link!');
            } else if (view === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user) {
                    const sessionId = crypto.randomUUID();
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({ current_session_id: sessionId })
                        .eq('id', data.user.id);

                    if (profileError) console.error('Error updating session ID:', profileError);
                    localStorage.setItem('slm_session_id', sessionId);
                    onLogin(data.user);
                }
            } else if (view === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}${window.location.pathname}#/login`,
                });
                if (error) throw error;
                showNotification('Password reset link sent to your email!');
                setView('login');
            } else if (view === 'update') {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                showNotification('Password updated successfully! You can now sign in.');
                setView('login');
            }
        } catch (error) {
            setError(error.message);
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-8">
            <div className="w-full max-w-sm">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {view === 'signup' ? 'Create Account' :
                                view === 'forgot' ? 'Reset Password' :
                                    view === 'update' ? 'New Password' : 'Sign In'}
                        </h1>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4">
                        {(view === 'login' || view === 'signup' || view === 'forgot') && (
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Email address"
                            />
                        )}

                        {(view === 'login' || view === 'signup' || view === 'update') && (
                            <div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder={view === 'update' ? 'New password' : 'Password'}
                                />
                                {view === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot')}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                        )}

                        {view === 'update' && (
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Confirm password"
                            />
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                view === 'signup' ? 'Create Account' :
                                    view === 'forgot' ? 'Send Reset Link' :
                                        view === 'update' ? 'Update Password' : 'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                        {view === 'signup' ? 'Already have an account?' :
                            view === 'forgot' || view === 'update' ? 'Remember your password?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => setView(view === 'signup' || view === 'forgot' || view === 'update' ? 'login' : 'signup')}
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                            {view === 'signup' || view === 'forgot' || view === 'update' ? 'Sign In' : 'Sign Up'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
