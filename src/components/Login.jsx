import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { storageUtils } from '../utils/storageUtils';
import { DotLottiePlayer } from '@dotlottie/react-player';
import noInternetLottie from '../assets/no_internet.lottie';
import { SUPPORT_EMAIL } from '../config';

/**
 * Single-device session: generate a unique id for this device, persist it
 * locally, and claim it on the server. Other devices logged into the same
 * account detect the mismatch and sign themselves out.
 * Failures here must never block login, so the server write is best-effort.
 */
async function claimDeviceSession(userId) {
    const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${userId}-${Date.now()}`;
    storageUtils.setItem('slm_session_id', sessionId);
    try {
        // Custom auth means auth.uid() is null, so a direct profiles update is
        // blocked by RLS. Write via the SECURITY DEFINER RPC instead.
        const { data, error } = await supabase.rpc('set_current_session_id', {
            p_user_id: userId,
            p_session_id: sessionId,
        });
        if (error) throw error;
        if (data && data.success === false) {
            console.warn('Could not claim device session on server:', data.error);
        }
    } catch (err) {
        console.warn('Could not claim device session on server:', err);
    }
}

function LoginLogo() {
    return (
        <div className="flex justify-center items-baseline gap-1.5 select-none">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">SmartLineMan</span>
            <span className="text-[10px] font-black text-slate-900 bg-orange-400 px-1.5 py-0.5 rounded border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] shrink-0 nb-mono">.in</span>
        </div>
    );
}

/** Per-slide object-position — faces sit high in these square crops; wide hero strips top/bottom by default. */
const HERO_IMAGE_FOCUS = {
    '/assets/emotional/lineman.png': 'center 42%',
    '/assets/emotional/child.png': 'center 14%',
    '/assets/emotional/wife.png': '38% 32%',
    '/assets/emotional/mother.png': 'center 10%',
    '/assets/emotional/eyes.png': 'center 12%',
};

function HeroImageCrossfade({ images, activeIndex }) {
    useEffect(() => {
        images.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }, [images]);

    return (
        <div className="relative w-full h-40 sm:h-44 bg-slate-900 overflow-hidden">
            {images.map((src, i) => (
                <img
                    key={src}
                    src={src}
                    alt=""
                    aria-hidden={i !== activeIndex}
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                        i === activeIndex ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
                    }`}
                    style={{ objectPosition: HERO_IMAGE_FOCUS[src] || 'center 20%' }}
                />
            ))}
        </div>
    );
}

function LoginPageShell({
    emotionalImageIndex,
    emotionalImages,
    children,
    footer,
    animate = 'animate-fadeIn',
    onOpenAwarenessStories,
    onGoHome,
}) {
    return (
        <div className="neo-brutal min-h-[100dvh] flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden safe-area-inset-top safe-area-inset-bottom touch-manipulation text-slate-900">
            <div className="nb-hazard absolute top-0 left-0 right-0 z-20" aria-hidden="true" />
            <div className={`w-full max-w-sm relative z-10 ${animate} shrink-0 space-y-4 pt-2`}>
                {onGoHome && (
                    <button
                        type="button"
                        onClick={onGoHome}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-1 text-sm font-black text-slate-800 hover:text-orange-600 nb-mono touch-manipulation"
                        aria-label="Back to home"
                    >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Home
                    </button>
                )}

                {onOpenAwarenessStories && (
                    <button
                        type="button"
                        onClick={onOpenAwarenessStories}
                        className="nb-card overflow-hidden p-0 w-full text-left relative block touch-manipulation active:scale-[0.99] transition-transform"
                        aria-label="Open awareness stories — Korun Kahini"
                    >
                        <HeroImageCrossfade images={emotionalImages} activeIndex={emotionalImageIndex} />
                        <span className="pointer-events-none absolute bottom-2 right-2 z-20 rounded border-2 border-slate-900 bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white shadow-[2px_2px_0_#0f172a] sm:text-xs">
                            করুণ কাহিনী →
                        </span>
                    </button>
                )}

                {children}
                {footer}
            </div>
        </div>
    );
}

const loginShellNav = (setCurrentView) => ({
    onGoHome: () => setCurrentView('landing'),
    onOpenAwarenessStories: () => setCurrentView('accident-stories'),
});

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

    // Login matches landing: always light neo-brutal, restore saved theme on exit.
    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('dark');

        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        const previousThemeColor = metaThemeColor?.getAttribute('content') || null;
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', '#fffdf7');

        return () => {
            const savedTheme = storageUtils.getItem('appTheme') || 'dark';
            if (savedTheme === 'dark') {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            if (previousThemeColor) {
                metaThemeColor.setAttribute('content', previousThemeColor);
            }
        };
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

                // Claim this device as the single active session
                await claimDeviceSession(user.user_id);

                // Trigger app login (parent may switch view / nav); toast after layout
                onLogin({
                    id: user.user_id,
                    phone: user.phone_number,
                    full_name: user.full_name,
                    role: user.role,
                    slm_id: user.slm_id
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

            // Claim this device as the single active session
            await claimDeviceSession(currentUser.user_id);

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
            <LoginPageShell
                emotionalImageIndex={emotionalImageIndex}
                emotionalImages={emotionalImages}
                animate="animate-slideUp"
                {...loginShellNav(setCurrentView)}
            >
                <div className="nb-card p-6 sm:p-8">
                    <div className="text-center mb-8">
                        <span className="nb-tag inline-block px-3 py-1 bg-orange-100 text-orange-700 mb-4">Safety First</span>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 tracking-tight">Set Your PIN</h1>
                        <p className="text-slate-600 text-sm font-semibold">Protect your progress & identity</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="nb-label block text-center">New 6-Digit PIN</label>
                            <input
                                type="password"
                                required
                                maxLength="6"
                                inputMode="numeric"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                                className="nb-input text-center tracking-[1em] text-2xl font-bold"
                                placeholder="••••••"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="nb-label block text-center">Confirm PIN</label>
                            <input
                                type="password"
                                required
                                maxLength="6"
                                inputMode="numeric"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                                className="nb-input text-center tracking-[1em] text-2xl font-bold"
                                placeholder="••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || newPassword.length !== 6 || newPassword !== confirmPassword}
                            className="w-full min-h-[48px] py-3 px-6 nb-btn-primary font-black text-base mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    Saving...
                                </span>
                            ) : 'Secure Account & Log In'}
                        </button>
                    </form>
                </div>
            </LoginPageShell>
        );
    }

    if (connectionError) {
        return (
            <LoginPageShell
                emotionalImageIndex={emotionalImageIndex}
                emotionalImages={emotionalImages}
                animate="animate-slideUp"
                {...loginShellNav(setCurrentView)}
            >
                <div className="nb-card p-8 sm:p-10 text-center">
                    <div className="mb-6 inline-flex p-4 nb-icon-badge bg-orange-50">
                        <DotLottiePlayer
                            src={noInternetLottie}
                            autoplay
                            loop
                            className="w-36 h-36 sm:w-40 sm:h-40"
                        />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">Connection Error</h2>
                    <p className="text-slate-600 mb-8 font-semibold px-2 text-sm sm:text-base">
                        Oops! It seems you are offline or having trouble connecting to our servers.
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setConnectionError(false);
                            setLoading(false);
                        }}
                        className="w-full min-h-[48px] py-3 px-6 nb-btn-primary font-black text-base flex items-center justify-center gap-3"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry Login
                    </button>
                </div>
            </LoginPageShell>
        );
    }

    // LOGIN — compact sheet, awareness stories open only via explicit control
    return (
        <LoginPageShell
            emotionalImageIndex={emotionalImageIndex}
            emotionalImages={emotionalImages}
            {...loginShellNav(setCurrentView)}
            footer={(
                <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-center text-xs text-slate-600 hover:text-slate-900 py-2 min-h-[44px] flex items-center justify-center font-semibold nb-mono"
                >
                    {SUPPORT_EMAIL}
                </a>
            )}
        >
            <div className="nb-card p-6 sm:p-7">
                <div className="text-center mb-6">
                    <LoginLogo />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="login-phone" className="nb-label block text-center">
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
                            className="nb-input text-base text-center"
                            placeholder="01XXXXXXXXX"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="login-pin" className="nb-label block text-center">
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
                                className="nb-input pr-12 text-lg text-center tracking-[0.5em] font-bold"
                                placeholder="••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-md"
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
                        <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px] px-1">
                            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <span className="pointer-events-none absolute inset-0 rounded border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a] transition-colors peer-checked:bg-orange-500 peer-checked:border-slate-900" aria-hidden />
                                <svg className="pointer-events-none relative z-10 h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </span>
                            <span className="text-sm font-semibold text-slate-700">Stay signed in</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || phone.length !== 10 || password.length !== 6}
                        className="w-full min-h-[48px] py-3 px-4 nb-btn-primary text-[15px] font-black"
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
        </LoginPageShell>
    );
}
