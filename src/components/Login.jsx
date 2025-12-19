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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 mobile-container py-8">
            <div className="max-w-md w-full material-card elevation-4 p-8 sm:p-10 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 elevation-3 text-white">
                            ⚡
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            {view === 'signup' ? 'Join SmartLineman' :
                                view === 'forgot' ? 'Reset Password' :
                                    view === 'update' ? 'New Password' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg">
                            {view === 'signup' ? 'Create your account to get started' :
                                view === 'forgot' ? 'Enter your email to receive a reset link' :
                                    view === 'update' ? 'Enter your new secure password' : 'Sign in to access your dashboard'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm sm:text-base rounded-xl border-2 border-red-200 flex items-start gap-3 elevation-1">
                            <span className="text-xl">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-6">
                        {(view === 'login' || view === 'signup' || view === 'forgot') && (
                            <div>
                                <label className="block text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="material-input"
                                    placeholder="lineman@example.com"
                                />
                            </div>
                        )}

                        {(view === 'login' || view === 'signup' || view === 'update') && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200">
                                        {view === 'update' ? 'New Password' : 'Password'}
                                    </label>
                                    {view === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => setView('forgot')}
                                            className="text-xs font-bold text-blue-600 hover:underline"
                                        >
                                            Forgot Password?
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="material-input"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {view === 'update' && (
                            <div>
                                <label className="block text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="material-input"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full material-button-primary disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ripple text-base sm:text-lg"
                        >
                            {loading ? (
                                <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                view === 'signup' ? 'Create Account' :
                                    view === 'forgot' ? 'Send Reset Link' :
                                        view === 'update' ? 'Update Password' : 'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                            {view === 'signup' ? 'Already have an account?' :
                                view === 'forgot' || view === 'update' ? 'Remember your password?' : "Don't have an account?"}{' '}
                            <button
                                onClick={() => setView(view === 'signup' || view === 'forgot' || view === 'update' ? 'login' : 'signup')}
                                className="text-blue-600 font-bold hover:underline touch-target ripple-dark rounded px-1"
                            >
                                {view === 'signup' || view === 'forgot' || view === 'update' ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
