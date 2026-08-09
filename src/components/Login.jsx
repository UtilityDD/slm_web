import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { storageUtils } from '../utils/storageUtils';
import { DotLottiePlayer } from '@dotlottie/react-player';
import noInternetLottie from '../assets/no_internet.lottie';
import { SUPPORT_EMAIL } from '../config';
import { EMOTIONAL_IMAGE_FOCUS } from '../data/awarenessStories';

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
        <div className="flex select-none items-center justify-center gap-2.5 sm:gap-3">
            <img
                src="/icon-192.png"
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 shrink-0 rounded-[0.65rem] object-cover shadow-sm ring-1 ring-slate-900/10 sm:h-10 sm:w-10 sm:rounded-xl"
                decoding="async"
            />
            <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                SmartLineMan
            </span>
        </div>
    );
}

/** Per-slide object-position — faces sit high in these square crops; wide hero strips top/bottom by default. */
const HERO_IMAGE_FOCUS = EMOTIONAL_IMAGE_FOCUS;

function HeroImageCrossfade({ images, activeIndex }) {
    // Prefetch only the active slide and the next one — keep login light.
    useEffect(() => {
        const toPrefetch = [
            images[activeIndex],
            images[(activeIndex + 1) % images.length],
        ].filter(Boolean);
        toPrefetch.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }, [images, activeIndex]);

    return (
        <div className="relative h-40 w-full overflow-hidden bg-slate-800 sm:h-44">
            {images.map((src, i) => (
                <img
                    key={src}
                    src={src}
                    alt=""
                    aria-hidden={i !== activeIndex}
                    decoding="async"
                    loading={i === activeIndex || i === (activeIndex + 1) % images.length ? 'eager' : 'lazy'}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                        i === activeIndex ? 'z-[1] opacity-100' : 'z-0 opacity-0'
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
    language = 'en',
}) {
    return (
        <div className="landing-modern relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#fffdf7] px-4 py-6 text-slate-900 touch-manipulation safe-area-inset-bottom">
            <div
                className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                aria-hidden="true"
            />
            <div className={`relative z-10 w-full max-w-sm shrink-0 space-y-4 pt-2 ${animate}`}>
                {onGoHome && (
                    <button
                        type="button"
                        onClick={onGoHome}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-2 text-sm font-bold text-slate-700 touch-manipulation transition-colors hover:bg-orange-50 hover:text-orange-600 active:scale-95"
                        aria-label="Back to home"
                    >
                        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Home
                    </button>
                )}

                {onOpenAwarenessStories && (
                    <button
                        type="button"
                        onClick={onOpenAwarenessStories}
                        className="relative block w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-0 text-left shadow-sm touch-manipulation transition-all active:scale-[0.99]"
                        aria-label="Open awareness stories — Korun Kahini"
                    >
                        <HeroImageCrossfade images={emotionalImages} activeIndex={emotionalImageIndex} />
                        <span className="pointer-events-none absolute bottom-2 right-2 z-20 rounded-full border border-white/20 bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm sm:text-xs">
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

export default function Login({ onLogin, showNotification, setCurrentView, language = 'en' }) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [emotionalImageIndex, setEmotionalImageIndex] = useState(0);
    const [connectionError, setConnectionError] = useState(false);

    const shellProps = {
        ...loginShellNav(setCurrentView),
        language,
    };

    const emotionalImages = [
        '/assets/emotional/lineman.webp',
        '/assets/emotional/child.webp',
        '/assets/emotional/wife.webp',
        '/assets/emotional/mother.webp',
        '/assets/emotional/eyes.webp'
    ];

    useEffect(() => {
        // Prefill the last-used credentials (always remembered now that the
        // "Stay signed in" checkbox has been removed).
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

    // Login matches landing: always light Material cream, restore saved theme on exit.
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
                // Remember credentials for prefill on next visit
                storageUtils.setItem('slm_remembered_phone', phone);
                storageUtils.setItem('slm_remembered_pin', password);

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

            // Remember credentials for prefill on next visit
            storageUtils.setItem('slm_remembered_phone', phone);
            storageUtils.setItem('slm_remembered_pin', newPassword);

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
                {...shellProps}
            >
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-8 text-center">
                        <span className="mb-4 inline-block rounded-full border border-orange-200/80 bg-orange-50 px-3 py-1 text-[10px] font-bold text-orange-700">Safety First</span>
                        <h1 className="mb-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Set Your PIN</h1>
                        <p className="text-sm font-semibold text-slate-600">Protect your progress & identity</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">New 6-Digit PIN</label>
                            <input
                                type="password"
                                required
                                maxLength="6"
                                inputMode="numeric"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[1em] text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                                placeholder="••••••"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">Confirm PIN</label>
                            <input
                                type="password"
                                required
                                maxLength="6"
                                inputMode="numeric"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-center text-2xl font-bold tracking-[1em] text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                                placeholder="••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || newPassword.length !== 6 || newPassword !== confirmPassword}
                            className="mt-2 min-h-[52px] w-full rounded-full bg-orange-500 px-6 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
                {...shellProps}
            >
                <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm sm:p-10">
                    <div className="mb-6 inline-flex rounded-2xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
                        <DotLottiePlayer
                            src={noInternetLottie}
                            autoplay
                            loop
                            className="h-36 w-36 sm:h-40 sm:w-40"
                        />
                    </div>

                    <h2 className="mb-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Connection Error</h2>
                    <p className="mb-8 px-2 text-sm font-semibold text-slate-600 sm:text-base">
                        Oops! It seems you are offline or having trouble connecting to our servers.
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setConnectionError(false);
                            setLoading(false);
                        }}
                        className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-orange-500 px-6 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98]"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {...shellProps}
            footer={(
                <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="flex min-h-[44px] items-center justify-center py-2 text-center text-xs font-semibold text-slate-500 transition-colors hover:text-orange-600"
                >
                    {SUPPORT_EMAIL}
                </a>
            )}
        >
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-6 text-center">
                    <LoginLogo />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="login-phone" className="block text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
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
                            className="w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-center text-base text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                            placeholder="01XXXXXXXXX"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="login-pin" className="block text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
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
                                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50 py-3 pl-4 pr-12 text-center text-lg font-bold tracking-[0.5em] text-slate-900 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-200"
                                placeholder="••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-orange-50 hover:text-slate-900"
                                aria-label={showPassword ? 'Hide PIN' : 'Show PIN'}
                            >
                                {showPassword ? (
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                ) : (
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || phone.length !== 10 || password.length !== 6}
                        className="min-h-[52px] w-full rounded-full bg-orange-500 px-4 py-3 text-[15px] font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
