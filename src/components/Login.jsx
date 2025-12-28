import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Login({ onLogin, showNotification, initialView }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [view, setView] = useState(initialView || 'login'); // login, signup, forgot, update, otp_request, otp_verify
    const [error, setError] = useState(null);
    const [otp, setOtp] = useState('');
    const [timer, setTimer] = useState(0);
    const [isOtpSending, setIsOtpSending] = useState(false);

    useEffect(() => {
        // Check if we're in a password recovery flow
        if (window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery')) {
            setView('update');
        }
    }, []);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        setIsOtpSending(true);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false, // Only allow existing users to login via OTP
                }
            });

            if (error) throw error;

            setView('otp_verify');
            setTimer(60);
            showNotification('Login code sent to your email!');
        } catch (error) {
            setError(error.message);
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
            setIsOtpSending(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
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
        } catch (error) {
            setError(error.message);
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

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
                                    view === 'update' ? 'New Password' :
                                        view === 'otp_request' ? 'Login with Code' :
                                            view === 'otp_verify' ? 'Verify Code' : 'Sign In'}
                        </h1>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={view === 'otp_request' ? handleSendOtp : view === 'otp_verify' ? handleVerifyOtp : handleAuth} className="space-y-4">
                        {(view === 'login' || view === 'signup' || view === 'forgot' || view === 'otp_request') && (
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

                        {view === 'otp_verify' && (
                            <div>
                                <div className="mb-4 text-sm text-center text-slate-600 dark:text-slate-400">
                                    Code sent to <span className="font-semibold text-slate-900 dark:text-slate-200">{email}</span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-mono"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                                <div className="mt-2 text-center">
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={timer > 0 || isOtpSending}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {timer > 0 ? `Resend code in ${timer}s` : 'Resend Code'}
                                    </button>
                                </div>
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
                                        view === 'update' ? 'Update Password' :
                                            view === 'otp_request' ? 'Send Login Code' :
                                                view === 'otp_verify' ? 'Verify & Login' : 'Sign In'
                            )}
                        </button>

                        {view === 'login' && (
                            <button
                                type="button"
                                onClick={() => setView('otp_request')}
                                className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Sign in with OTP
                            </button>
                        )}

                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                        {view === 'signup' ? 'Already have an account?' :
                            view === 'forgot' || view === 'update' ? 'Remember your password?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => {
                                if (view === 'otp_verify') {
                                    setView('otp_request');
                                } else {
                                    setView(view === 'signup' || view === 'forgot' || view === 'update' || view === 'otp_request' ? 'login' : 'signup');
                                }
                            }}
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                            {view === 'otp_verify' ? 'Change Email' : (view === 'signup' || view === 'forgot' || view === 'update' || view === 'otp_request' ? 'Sign In' : 'Sign Up')}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
