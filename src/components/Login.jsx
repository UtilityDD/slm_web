import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { storageUtils } from '../utils/storageUtils';

export default function Login({ onLogin, showNotification }) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

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
        // PASSWORD CHANGE FORM - Simplified & Modern
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-orange-600/20 pointer-events-none"></div>

                <div className="w-full max-w-md relative z-10">
                    <div className="bg-white/10 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold text-white mb-2">SmartLineman</h1>
                            <p className="text-slate-400 text-sm">Secure Your Account</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div>
                                <input
                                    type="text"
                                    required
                                    maxLength="6"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-center tracking-[0.5em] text-xl"
                                    placeholder="NEW PIN"
                                />
                            </div>

                            <div>
                                <input
                                    type="text"
                                    required
                                    maxLength="6"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-center tracking-[0.5em] text-xl"
                                    placeholder="CONFIRM PIN"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all transform active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Set PIN & Continue'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // LOGIN FORM - Simplified & Modern
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-orange-600/20 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/10 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2">SmartLineman</h1>
                        <p className="text-slate-400 text-sm font-medium">Electrical Safety Platform</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <input
                                type="tel"
                                name="phone"
                                autoComplete="username"
                                required
                                value={phone}
                                onChange={handlePhoneChange}
                                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-lg text-center"
                                placeholder="Phone Number"
                                autoFocus
                            />
                        </div>

                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                autoComplete="current-password"
                                required
                                maxLength="6"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none text-lg text-center tracking-[0.3em]"
                                placeholder="6-Digit PIN"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 border-2 border-white/20 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                                    <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || phone.length !== 10 || password.length !== 6}
                            className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 text-xs">
                        Empowering linemen through safety & recognition
                    </p>
                </div>
            </div>
        </div>
    );
}
