import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { storageUtils } from '../utils/storageUtils';

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

            if (error) throw error;

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

                // Trigger app login
                onLogin({
                    id: user.user_id,
                    phone: user.phone_number,
                    full_name: user.full_name,
                    role: user.role,
                    slm_id: user.slm_id
                });

                showNotification(`Welcome back, ${user.full_name}!`, 'success');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message, 'error');
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

            showNotification('Password changed successfully!', 'success');
        } catch (error) {
            console.error('Password change error:', error);
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (mustChangePassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
                {/* Background Hero Banner */}
                <div className="absolute inset-0 z-0">
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

    // LOGIN FORM - Premium Glassmorphism Redesign
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            {/* Background Hero Banner - Slideshow - Clickable */}
            <div
                className="absolute inset-0 z-0 cursor-pointer group/hero"
                onClick={() => setCurrentView('accident-stories')}
            >
                <img
                    src={emotionalImages[emotionalImageIndex]}
                    alt="Hero Background"
                    className="w-full h-full object-cover opacity-40 transition-all duration-1000 ease-in-out scale-105 group-hover/hero:scale-110 group-hover/hero:opacity-50"
                    key={emotionalImageIndex}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-slate-950/50"></div>

                {/* Visual Hint to Click */}
            </div>

            <div className="w-full max-w-md relative z-10 animate-fadeIn">
                <div className="bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 sm:p-12 border border-white/10">
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                            <div className="w-32 sm:w-40 relative group">
                                <img
                                    src="/icons/logo.png"
                                    alt="SmartLineMan Logo"
                                    className="w-full h-auto drop-shadow-2xl brightness-110"
                                    style={{ mixBlendMode: 'lighten' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                            </div>
                        </div>
                        <p className="text-orange-100/60 text-xs font-medium tracking-[0.2em] uppercase">Safety Starts With You</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-5">Mobile Number</label>
                            <input
                                type="tel"
                                name="phone"
                                autoComplete="username"
                                required
                                value={phone}
                                onChange={handlePhoneChange}
                                className="w-full px-6 py-4.5 rounded-[1.5rem] bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-lg text-center font-medium"
                                placeholder="01XXX XXXXXX"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5 relative group">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-5">Security PIN</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    maxLength="6"
                                    inputMode="numeric"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-6 py-4.5 rounded-[1.5rem] bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-xl text-center tracking-[0.8em] font-bold"
                                    placeholder="••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 border-2 border-white/20 rounded-lg peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all duration-300"></div>
                                    <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Keep me signed in</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || phone.length !== 10 || password.length !== 6}
                            className="w-full py-5 px-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black rounded-[1.5rem] shadow-2xl shadow-orange-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none mt-2 cursor-pointer"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Authenticating...
                                </span>
                            ) : (
                                'Enter Dashboard'
                            )}
                        </button>
                    </form>
                </div>

                <div
                    className="mt-12 text-center group cursor-pointer"
                    onClick={() => setCurrentView('accident-stories')}
                >
                    <p className="text-orange-400 group-hover:text-orange-300 text-sm font-bold transition-all">
                        করুণ কাহিনী
                    </p>
                    <div className="mt-1 w-12 h-0.5 bg-orange-500/20 mx-auto group-hover:w-16 transition-all"></div>
                </div>
            </div>
        </div>
    );
}
