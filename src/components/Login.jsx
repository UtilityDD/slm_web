import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('Check your email for the login link!');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user) onLogin(data.user);
            }
        } catch (error) {
            setError(error.message);
            // For demo purposes, if Supabase isn't configured, we'll simulate a login
            if (error.message.includes('valid URL') || error.message.includes('fetch')) {
                console.warn("Supabase not configured. Simulating login for demo.");
                onLogin({ email: email || 'demo@smartlineman.in', id: 'demo-user' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 mobile-container py-8">
            <div className="max-w-md w-full material-card elevation-4 p-8 sm:p-10 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 elevation-3 text-white">
                            ⚡
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                            {isSignUp ? 'Join SmartLineman' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 text-base sm:text-lg">
                            {isSignUp ? 'Create your account to get started' : 'Sign in to access your dashboard'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm sm:text-base rounded-xl border-2 border-red-200 flex items-start gap-3 elevation-1">
                            <span className="text-xl">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-6">
                        <div>
                            <label className="block text-sm sm:text-base font-semibold text-slate-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="material-input"
                                placeholder="lineman@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm sm:text-base font-semibold text-slate-700 mb-2">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="material-input"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full material-button-primary disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ripple text-base sm:text-lg"
                        >
                            {loading ? (
                                <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                isSignUp ? 'Create Account' : 'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-600 text-sm sm:text-base">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-blue-600 font-bold hover:underline touch-target ripple-dark rounded px-1"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
