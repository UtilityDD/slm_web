import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { storageUtils } from '../utils/storageUtils';
import { DotLottiePlayer } from '@dotlottie/react-player';
import noInternetLottie from '../assets/no_internet.lottie';
import { SUPPORT_EMAIL } from '../config';

export default function Login({ onLogin, showNotification, setCurrentView }) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [emotionalImageIndex, setEmotionalImageIndex] = useState(0);
    const [connectionError, setConnectionError] = useState(false);

    const emotionalImages = [
        '/assets/emotional/lineman.png',
        '/assets/emotional/child.png',
        '/assets/emotional/wife.png',
        '/assets/emotional/mother.png',
        '/assets/emotional/eyes.png'
    ];

    useEffect(() => {
        // Load remembered credentials
        const savedPhone = storageUtils.getItem('slm_remembered_phone');
        const savedPin = storageUtils.getItem('slm_remembered_pin');

        if (savedPhone) {
            setPhone(savedPhone);
        }
        if (savedPin) {
            setPassword(savedPin);
        }

        const imageInterval = setInterval(() => {
            setEmotionalImageIndex(prev => (prev + 1) % emotionalImages.length);
        }, 4000);

        return () => clearInterval(imageInterval);
    }, []);

    const formatPhone = (value) => {
        // Remove all non-digits
        const cleaned = value.replace(/\D/g, '');
        // Take only first 10 digits
        return cleaned.substring(0, 10);
    };

    const handlePhoneChange = (e) => {
        const formatted = formatPhone(e.target.value);
        setPhone(formatted);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            setConnectionError(false);
            // Validate inputs
            if (phone.length !== 10) {
                throw new Error('Phone number must be 10 digits');
            }
            if (password.length !== 6) {
                throw new Error('Password must be 6 characters');
            }

            const { data, error } = await supabase.rpc('authenticate_user', {
                p_phone: phone,
                p_password: password
            });

            if (error) {
                // Check if it's a network error
                if (error.message?.toLowerCase().includes('network') ||
                    error.message?.toLowerCase().includes('fetch') ||
                    !navigator.onLine) {
                    setConnectionError(true);
                    return;
                }
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('Invalid phone number or password');
            }

            const user = data[0];

            if (user.must_change_password) {
                // Show password change form
                setMustChangePassword(true);
                setCurrentUser(user);
                showNotification('Please set a new password to continue', 'info');
            } else {
                // Remember credentials if checkbox is checked
                if (rememberMe) {
                    storageUtils.setItem('slm_remembered_phone', phone);
                    storageUtils.setItem('slm_remembered_pin', password);
                } else {
                    storageUtils.removeItem('slm_remembered_phone');
                    storageUtils.removeItem('slm_remembered_pin');
                }

                // Store session
                storageUtils.setItem('session_token', user.session_token);
                storageUtils.setItem('user_id', user.user_id);

                // Trigger app login (parent may switch view / nav); toast after layout
                onLogin({
                    id: user.user_id,
                    phone: user.phone_number,
                    full_name: user.full_name,
                    role: user.role,
                    slm_id: user.slm_id
                });

                requestAnimationFrame(() => {
                    showNotification(`Welcome back, ${user.full_name}!`, 'success');
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            if (error.message?.toLowerCase().includes('network') ||
                error.message?.toLowerCase().includes('fetch') ||
                !navigator.onLine) {
                setConnectionError(true);
            } else {
                showNotification(error.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword.length !== 6) {
            showNotification('Password must be exactly 6 characters', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.rpc('change_password', {
                p_user_id: currentUser.user_id,
                p_new_password: newPassword
            });

            if (error) throw error;

            // Remember credentials if checkbox is checked
            if (rememberMe) {
                storageUtils.setItem('slm_remembered_phone', phone);
                storageUtils.setItem('slm_remembered_pin', newPassword);
            }

            // Store session and auto-login
            storageUtils.setItem('session_token', currentUser.session_token);
            storageUtils.setItem('user_id', currentUser.user_id);

            onLogin({
                id: currentUser.user_id,
                phone: currentUser.phone_number,
                full_name: currentUser.full_name,
                role: currentUser.role,
                slm_id: currentUser.slm_id
            });

            requestAnimationFrame(() => {
                showNotification('Password changed successfully!', 'success');
            });
        } catch (error) {
            console.error('Password change error:', error);
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (mustChangePassword) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden safe-area-inset-top safe-area-inset-bottom">
                {/* Background Hero Banner */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img
                        src={emotionalImages[emotionalImageIndex]}
                        alt="Background"
                        className="w-full h-full object-cover opacity-30 transition-all duration-1000 scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/50 to-orange-950/80"></div>
                </div>

                <div className="w-full max-w-md relative z-10 animate-slideUp">
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-8 sm:p-10 border border-white/10">
                        <div className="text-center mb-10">
                            <div className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-widest mb-4 border border-orange-500/20">
                                Safety First
                            </div>
                            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Set Your PIN</h1>
                            <p className="text-slate-400 text-sm font-medium">Protect your progress & identity</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">New 6-Digit PIN</label>
                                <input
                                    type="password"
                                    required
                                    maxLength="6"
                                    inputMode="numeric"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-center tracking-[1em] text-2xl font-bold"
                                    placeholder="••••••"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4">Confirm PIN</label>
                                <input
                                    type="password"
                                    required
                                    maxLength="6"
                                    inputMode="numeric"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-center tracking-[1em] text-2xl font-bold"
                                    placeholder="••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || newPassword.length !== 6 || newPassword !== confirmPassword}
                                className="w-full py-5 px-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-2xl shadow-xl shadow-orange-950/20 transition-all transform active:scale-[0.98] disabled:opacity-50 mt-4 cursor-pointer"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Saving...
                                    </span>
                                ) : 'Secure Account & Log In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (connectionError) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden safe-area-inset-top safe-area-inset-bottom">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img
                        src={emotionalImages[emotionalImageIndex]}
                        alt="Background"
                        className="w-full h-full object-cover opacity-30 transition-all duration-1000 scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-950/50 to-orange-950/80"></div>
                </div>

                <div className="w-full max-w-md relative z-10 animate-slideUp">
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl p-10 text-center border border-white/10">
                        <div className="mb-8 inline-flex p-4 rounded-3xl bg-orange-500/10 border border-orange-500/20">
                            <DotLottiePlayer
                                src={noInternetLottie}
                                autoplay
                                loop
                                className="w-40 h-40"
                            />
                        </div>

                        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Connection Error</h2>
                        <p className="text-slate-400 mb-10 font-medium px-4">
                            Oops! It seems you are offline or having trouble connecting to our servers.
                        </p>

                        <button
                            onClick={() => {
                                setConnectionError(false);
                                setLoading(false);
                            }}
                            className="w-full py-5 px-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-2xl shadow-xl shadow-orange-950/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // LOGIN — compact sheet, awareness stories open only via explicit control
    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-950 px-4 py-6 relative overflow-hidden safe-area-inset-top safe-area-inset-bottom touch-manipulation">
            <div className="absolute inset-0 z-0 pointer-events-none select-none" aria-hidden>
                <img
                    src={emotionalImages[emotionalImageIndex]}
                    alt=""
                    className="w-full h-full object-cover opacity-35 transition-opacity duration-1000 ease-in-out"
                    key={emotionalImageIndex}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/90" />
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-slate-950/60" />
            </div>

            <div className="w-full max-w-sm relative z-10 animate-fadeIn shrink-0">
                <div className="bg-white/[0.08] backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-6 sm:p-7 border border-white/10">
                    <div className="text-center mb-6">
                        <div className="flex justify-center items-baseline gap-1 select-none">
                            <span className="text-2xl sm:text-3xl logo-text logo-text-home text-white tracking-tight">
                                SmartLineMan
                            </span>
                            <span className="text-[10px] font-bold bg-orange-500/25 text-orange-300 px-1.5 py-0.5 rounded-md border border-orange-500/25 -translate-y-1">
                                .in
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="login-phone" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block text-center">
                                Phone
                            </label>
                            <input
                                id="login-phone"
                                type="tel"
                                name="phone"
                                autoComplete="username"
                                required
                                value={phone}
                                onChange={handlePhoneChange}
                                className="w-full min-h-[48px] px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-orange-500/80 focus:ring-2 focus:ring-orange-500/20 transition outline-none text-base text-center font-medium"
                                placeholder="01XXXXXXXXX"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="login-pin" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block text-center">
                                6-digit PIN
                            </label>
                            <div className="relative">
                                <input
                                    id="login-pin"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    maxLength="6"
                                    inputMode="numeric"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                                    className="w-full min-h-[48px] px-4 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-orange-500/80 focus:ring-2 focus:ring-orange-500/20 transition outline-none text-lg text-center tracking-[0.5em] font-semibold"
                                    placeholder="••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 active:text-white rounded-lg"
                                    aria-label={showPassword ? 'Hide PIN' : 'Show PIN'}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-center pt-0.5">
                            <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px] px-1 -mx-1 rounded-lg active:bg-white/5">
                                <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <span className="pointer-events-none absolute inset-0 rounded-md border-2 border-white/25 transition-colors peer-checked:border-orange-500 peer-checked:bg-orange-500" aria-hidden />
                                    <svg className="pointer-events-none relative z-10 h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                <span className="text-sm text-slate-400">Stay signed in</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || phone.length !== 10 || password.length !== 6}
                            className="w-full min-h-[48px] py-3 px-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-600 text-white text-[15px] font-semibold rounded-xl shadow-lg shadow-black/20 active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    Signing in…
                                </span>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-6 flex flex-col items-stretch gap-3 w-full max-w-sm mx-auto">
                    <button
                        type="button"
                        onClick={() => setCurrentView('accident-stories')}
                        aria-label="Open awareness stories"
                        className="w-full min-h-[48px] rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[15px] font-medium text-orange-300 active:bg-white/10 transition-colors"
                    >
                        করুণ কাহিনী
                    </button>

                    <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="text-center text-xs text-slate-500 hover:text-slate-300 py-2 min-h-[44px] flex items-center justify-center rounded-lg active:bg-white/5 transition-colors"
                    >
                        {SUPPORT_EMAIL}
                    </a>
                </div>
            </div>
        </div>
    );
}
