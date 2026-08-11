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

const copy = {
    en: {
        backHome: 'Home',
        brand: 'SmartLineMan',
        setPinTitle: 'Set your PIN',
        phone: 'Phone number',
        phoneHint: 'Mobile number',
        pin: '6-digit PIN',
        pinHint: '6-digit PIN',
        newPin: 'New PIN',
        confirmPin: 'Confirm PIN',
        showPin: 'Show PIN',
        hidePin: 'Hide PIN',
        signIn: 'Sign in',
        signingIn: 'Signing in…',
        remember: 'Remember me',
        secureAccount: 'Continue',
        saving: 'Saving…',
        connectionTitle: 'You’re offline',
        retry: 'Try again',
        storiesCta: 'করুণ কাহিনী',
        errPhone: 'Enter a 10-digit mobile number',
        errPin: 'Enter your 6-digit PIN',
        errCredentials: 'Wrong phone or PIN',
        errNetwork: 'No connection. Try again.',
        errTimeout: 'Taking too long. Try again.',
        errBusy: 'Too many tries. Wait a moment.',
        errGeneric: 'Couldn’t sign in. Try again.',
        errPinSave: 'Couldn’t save PIN. Try again.',
        errPinMismatch: 'PINs don’t match',
        errPinLength: 'PIN must be 6 digits',
        setPinInfo: 'Set a new PIN to continue',
        pinSaved: 'PIN updated',
    },
    bn: {
        backHome: 'হোম',
        brand: 'SmartLineMan',
        setPinTitle: 'পিন সেট করুন',
        phone: 'ফোন নম্বর',
        phoneHint: 'মোবাইল নম্বর',
        pin: '৬-অঙ্কের পিন',
        pinHint: '৬-অঙ্কের পিন',
        newPin: 'নতুন পিন',
        confirmPin: 'পিন নিশ্চিত করুন',
        showPin: 'পিন দেখান',
        hidePin: 'পিন লুকান',
        signIn: 'সাইন ইন',
        signingIn: 'সাইন ইন হচ্ছে…',
        remember: 'মনে রাখুন',
        secureAccount: 'চলুন',
        saving: 'সংরক্ষণ হচ্ছে…',
        connectionTitle: 'ইন্টারনেট নেই',
        retry: 'আবার চেষ্টা',
        storiesCta: 'করুণ কাহিনী',
        errPhone: '১০ সংখ্যার মোবাইল নম্বর দিন',
        errPin: '৬ সংখ্যার পিন দিন',
        errCredentials: 'ফোন বা পিন ভুল',
        errNetwork: 'সংযোগ নেই। আবার চেষ্টা করুন।',
        errTimeout: 'সময় বেশি লাগছে। আবার চেষ্টা করুন।',
        errBusy: 'অনেকবার চেষ্টা। একটু অপেক্ষা করুন।',
        errGeneric: 'সাইন ইন হয়নি। আবার চেষ্টা করুন।',
        errPinSave: 'পিন সেভ হয়নি। আবার চেষ্টা করুন।',
        errPinMismatch: 'পিন মিলছে না',
        errPinLength: 'পিন ৬ সংখ্যার হতে হবে',
        setPinInfo: 'এগিয়ে যেতে নতুন পিন সেট করুন',
        pinSaved: 'পিন আপডেট হয়েছে',
    },
};

/** Per-slide object-position — faces sit high in these square crops; wide hero strips top/bottom by default. */
const HERO_IMAGE_FOCUS = EMOTIONAL_IMAGE_FOCUS;

function loginErrorText(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    return [error.message, error.details, error.hint, error.code, error.name]
        .filter(Boolean)
        .join(' ');
}

function isLoginNetworkError(error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    const text = loginErrorText(error).toLowerCase();
    const name = String(error?.name || '').toLowerCase();
    if (name === 'aborterror') return true;
    if (!text) return false;
    if (
        /failed to fetch|networkerror|network request failed|load failed|err_network|err_internet|err_connection|net::err|offline|no internet|internet disconnected|timed?\s*out|timeout|econnrefused|econnreset|enotfound|socket hang up|dns|unreachable|connection (refused|reset|aborted|closed|terminated)/i.test(text)
    ) {
        return true;
    }
    // Browsers often surface offline RPC failures as TypeError + "Failed to fetch".
    if (name === 'typeerror' && /fetch|network|load failed|internet/.test(text)) return true;
    return false;
}

/**
 * Map any login/PIN failure to a short user-facing line.
 * Never return raw Supabase / PostgREST text.
 */
function friendlyLoginError(error, t, { pinFlow = false } = {}) {
    const text = loginErrorText(error).toLowerCase();

    if (isLoginNetworkError(error)) return { kind: 'network', message: t.errNetwork };

    if (text.includes('10 digit') || text.includes('10-digit') || text.includes('phone number must')) {
        return { kind: 'toast', message: t.errPhone };
    }
    if (
        text.includes('password must be exactly') ||
        text.includes('password must be 6') ||
        text.includes('pin must')
    ) {
        return { kind: 'toast', message: pinFlow ? t.errPinLength : t.errPin };
    }
    if (text.includes('do not match') || text.includes("don't match") || text.includes('dont match')) {
        return { kind: 'toast', message: t.errPinMismatch };
    }
    if (
        text.includes('rate') ||
        text.includes('too many') ||
        text.includes('429') ||
        text.includes('limit exceeded')
    ) {
        return { kind: 'toast', message: t.errBusy };
    }
    if (text.includes('timeout') || text.includes('timed out') || text.includes('504') || text.includes('408')) {
        return { kind: 'toast', message: t.errTimeout };
    }
    if (
        text.includes('invalid') ||
        text.includes('wrong') ||
        text.includes('incorrect') ||
        text.includes('unauthorized') ||
        text.includes('credentials') ||
        text.includes('authentication failed')
    ) {
        return { kind: 'toast', message: t.errCredentials };
    }

    return { kind: 'toast', message: pinFlow ? t.errPinSave : t.errGeneric };
}

function FilmCrossfade({ images, activeIndex }) {
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
        <div className="login-film__plane" aria-hidden="true">
            {images.map((src, i) => (
                <img
                    key={src}
                    src={src}
                    alt=""
                    decoding="async"
                    loading={i === activeIndex || i === (activeIndex + 1) % images.length ? 'eager' : 'lazy'}
                    className={`login-film__img ${
                        i === activeIndex ? 'login-film__img--active' : ''
                    }`}
                    style={{ objectPosition: HERO_IMAGE_FOCUS[src] || 'center 18%' }}
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
    animate = 'login-rise',
    onOpenAwarenessStories,
    onGoHome,
    language = 'en',
    title,
    showFilm = true,
}) {
    const t = copy[language] || copy.en;
    const bn = language === 'bn';
    const hasFilm = Boolean(showFilm && onOpenAwarenessStories && emotionalImages?.length);

    return (
        <div
            className={`login-modern relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-slate-900 touch-manipulation safe-area-inset-bottom native-keyboard-pad ${hasFilm ? 'login-modern--film' : ''} ${bn ? 'lang-bn' : ''}`}
        >
            {hasFilm ? (
                <section className="login-film" aria-label={t.storiesCta}>
                    <button
                        type="button"
                        onClick={onOpenAwarenessStories}
                        className="login-film__hit touch-manipulation"
                        aria-label={t.storiesCta}
                    >
                        <FilmCrossfade images={emotionalImages} activeIndex={emotionalImageIndex} />
                    </button>
                    <div className="login-film__fade" aria-hidden="true" />
                </section>
            ) : (
                <div className="login-ambient" aria-hidden="true">
                    <span className="login-ambient__orb login-ambient__orb--a" />
                    <span className="login-ambient__orb login-ambient__orb--b" />
                </div>
            )}

            <header className={`login-chrome ${hasFilm ? 'login-chrome--over-film' : ''}`}>
                {onGoHome ? (
                    <button
                        type="button"
                        onClick={onGoHome}
                        className="login-back inline-flex h-10 w-10 items-center justify-center rounded-xl touch-manipulation transition-colors active:scale-95"
                        aria-label={t.backHome}
                    >
                        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                ) : (
                    <span />
                )}
            </header>

            <div className={`login-stage relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-3 sm:px-6 ${animate}`}>
                <div className="login-main">
                    <div className="login-brand-block text-center">
                        <p className="login-brand">
                            {t.brand}
                            <span className="login-brand__tld">.in</span>
                        </p>
                        {title && (
                            <h1 className={`login-title mt-1.5 ${bn ? 'font-bengali' : ''}`}>{title}</h1>
                        )}
                    </div>

                    <div className="login-panel">
                        {children}
                    </div>
                </div>

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
    const [rememberMe, setRememberMe] = useState(true);
    const [emotionalImageIndex, setEmotionalImageIndex] = useState(0);
    const [connectionError, setConnectionError] = useState(false);

    const t = copy[language] || copy.en;
    const bn = language === 'bn';

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
        const savedPhone = storageUtils.getItem('slm_remembered_phone');
        const savedPin = storageUtils.getItem('slm_remembered_pin');
        const savedRemember = storageUtils.getItem('slm_remember_me');

        if (savedPhone) {
            setPhone(savedPhone);
        }
        if (savedPin) {
            setPassword(savedPin);
        }
        // Prefer explicit preference; otherwise on if credentials were stored.
        if (savedRemember === '0') {
            setRememberMe(false);
        } else if (savedRemember === '1' || savedPhone || savedPin) {
            setRememberMe(true);
        }

        const imageInterval = setInterval(() => {
            setEmotionalImageIndex(prev => (prev + 1) % emotionalImages.length);
        }, 4000);

        return () => clearInterval(imageInterval);
    }, []);

    const persistRememberPreference = (shouldRemember, nextPhone, nextPin) => {
        if (shouldRemember) {
            storageUtils.setItem('slm_remember_me', '1');
            storageUtils.setItem('slm_remembered_phone', nextPhone);
            storageUtils.setItem('slm_remembered_pin', nextPin);
        } else {
            storageUtils.setItem('slm_remember_me', '0');
            storageUtils.removeItem('slm_remembered_phone');
            storageUtils.removeItem('slm_remembered_pin');
        }
    };

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
            if (phone.length !== 10) {
                showNotification(t.errPhone, 'error');
                return;
            }
            if (password.length !== 6) {
                showNotification(t.errPin, 'error');
                return;
            }

            const { data, error } = await supabase.rpc('authenticate_user', {
                p_phone: phone,
                p_password: password
            });

            if (error) {
                const friendly = friendlyLoginError(error, t);
                if (friendly.kind === 'network') {
                    setConnectionError(true);
                    return;
                }
                showNotification(friendly.message, 'error');
                return;
            }

            if (!data || data.length === 0) {
                showNotification(t.errCredentials, 'error');
                return;
            }

            const user = data[0];

            if (user.must_change_password) {
                setMustChangePassword(true);
                setCurrentUser(user);
                showNotification(t.setPinInfo, 'info');
            } else {
                persistRememberPreference(rememberMe, phone, password);

                storageUtils.setItem('session_token', user.session_token);
                storageUtils.setItem('user_id', user.user_id);

                await claimDeviceSession(user.user_id);

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
            const friendly = friendlyLoginError(error, t);
            if (friendly.kind === 'network') {
                setConnectionError(true);
            } else {
                showNotification(friendly.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword.length !== 6) {
            showNotification(t.errPinLength, 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification(t.errPinMismatch, 'error');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.rpc('change_password', {
                p_user_id: currentUser.user_id,
                p_new_password: newPassword
            });

            if (error) {
                const friendly = friendlyLoginError(error, t, { pinFlow: true });
                if (friendly.kind === 'network') {
                    setConnectionError(true);
                    return;
                }
                showNotification(friendly.message, 'error');
                return;
            }

            persistRememberPreference(rememberMe, phone, newPassword);

            storageUtils.setItem('session_token', currentUser.session_token);
            storageUtils.setItem('user_id', currentUser.user_id);

            await claimDeviceSession(currentUser.user_id);

            onLogin({
                id: currentUser.user_id,
                phone: currentUser.phone_number,
                full_name: currentUser.full_name,
                role: currentUser.role,
                slm_id: currentUser.slm_id
            });

            requestAnimationFrame(() => {
                showNotification(t.pinSaved, 'success');
            });
        } catch (error) {
            console.error('Password change error:', error);
            const friendly = friendlyLoginError(error, t, { pinFlow: true });
            if (friendly.kind === 'network') {
                setConnectionError(true);
            } else {
                showNotification(friendly.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const supportFooter = (
        <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="login-support flex items-center justify-center py-2 text-center text-[11px] font-semibold text-slate-400 transition-colors hover:text-orange-600"
        >
            {SUPPORT_EMAIL}
        </a>
    );

    if (mustChangePassword) {
        return (
            <LoginPageShell
                emotionalImageIndex={emotionalImageIndex}
                emotionalImages={emotionalImages}
                animate="login-rise login-rise--fast"
                title={t.setPinTitle}
                footer={supportFooter}
                showFilm={false}
                {...shellProps}
            >
                <form onSubmit={handleChangePassword} className="login-form space-y-3">
                    <div className="login-field">
                        <label className={`login-label ${bn ? 'font-bengali' : ''}`}>{t.newPin}</label>
                        <input
                            type="password"
                            required
                            maxLength="6"
                            inputMode="numeric"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                            className="login-input login-input--pin"
                            placeholder="••••••"
                            autoFocus
                        />
                    </div>

                    <div className="login-field">
                        <label className={`login-label ${bn ? 'font-bengali' : ''}`}>{t.confirmPin}</label>
                        <input
                            type="password"
                            required
                            maxLength="6"
                            inputMode="numeric"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                            className="login-input login-input--pin"
                            placeholder="••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || newPassword.length !== 6 || newPassword !== confirmPassword}
                        className={`login-cta ${bn ? 'font-bengali' : ''}`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="login-cta__spin" />
                                {t.saving}
                            </span>
                        ) : t.secureAccount}
                    </button>
                </form>
            </LoginPageShell>
        );
    }

    if (connectionError) {
        return (
            <LoginPageShell
                emotionalImageIndex={emotionalImageIndex}
                emotionalImages={emotionalImages}
                animate="login-rise login-rise--fast"
                title={t.connectionTitle}
                footer={supportFooter}
                showFilm={false}
                {...shellProps}
            >
                <div className="login-offline text-center">
                    <div className="login-offline__art mx-auto mb-3 inline-flex">
                        <DotLottiePlayer
                            src={noInternetLottie}
                            autoplay
                            loop
                            className="h-28 w-28"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setConnectionError(false);
                            setLoading(false);
                        }}
                        className={`login-cta ${bn ? 'font-bengali' : ''}`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {t.retry}
                        </span>
                    </button>
                </div>
            </LoginPageShell>
        );
    }

    return (
        <LoginPageShell
            emotionalImageIndex={emotionalImageIndex}
            emotionalImages={emotionalImages}
            footer={supportFooter}
            {...shellProps}
        >
            <form onSubmit={handleLogin} className="login-form space-y-3">
                <div className="login-field">
                    <label htmlFor="login-phone" className="sr-only">
                        {t.phone}
                    </label>
                    <input
                        id="login-phone"
                        type="tel"
                        name="phone"
                        autoComplete="username"
                        required
                        value={phone}
                        onChange={handlePhoneChange}
                        className="login-input"
                        placeholder={t.phoneHint}
                        autoFocus
                    />
                </div>

                <div className="login-field">
                    <label htmlFor="login-pin" className="sr-only">
                        {t.pin}
                    </label>
                    <div className="relative">
                        <input
                            id="login-pin"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            autoComplete="current-password"
                            required
                            maxLength="6"
                            inputMode="numeric"
                            value={password}
                            onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                            className="login-input login-input--pin pr-12"
                            placeholder={t.pinHint}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-orange-50 hover:text-slate-900"
                            aria-label={showPassword ? t.hidePin : t.showPin}
                        >
                            {showPassword ? (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                <label className={`login-remember ${bn ? 'font-bengali' : ''}`}>
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="login-remember__box"
                    />
                    <span>{t.remember}</span>
                </label>

                <button
                    type="submit"
                    disabled={loading || phone.length !== 10 || password.length !== 6}
                    className={`login-cta ${bn ? 'font-bengali' : ''}`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="login-cta__spin" />
                            {t.signingIn}
                        </span>
                    ) : (
                        t.signIn
                    )}
                </button>
            </form>
        </LoginPageShell>
    );
}
