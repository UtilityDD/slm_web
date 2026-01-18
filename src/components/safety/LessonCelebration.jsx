import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const LessonCelebration = ({ points, language, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [counter, setCounter] = useState(0);

    // Audio Chime Logic (Web Audio API)
    const playSuccessSound = useCallback(() => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            const playNote = (freq, startTime, duration, type = 'sine') => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const now = ctx.currentTime;
            // A simple major triad rising
            playNote(523.25, now, 0.5, 'triangle'); // C5
            playNote(659.25, now + 0.1, 0.5, 'triangle'); // E5
            playNote(783.99, now + 0.2, 0.8, 'sine'); // G5
            playNote(1046.50, now + 0.3, 1.0, 'sine'); // C6
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    }, []);

    useEffect(() => {
        setIsVisible(true);
        playSuccessSound();

        // Increment counter animation
        const duration = 1500;
        const steps = points;
        const interval = duration / steps;

        let current = 0;
        const timer = setInterval(() => {
            current += 1;
            if (current >= points) {
                setCounter(points);
                clearInterval(timer);
            } else {
                setCounter(current);
            }
        }, interval);

        // Auto close after 6 seconds if not closed manually
        const autoClose = setTimeout(onClose, 6500);

        return () => {
            clearInterval(timer);
            clearTimeout(autoClose);
        };
    }, [points, playSuccessSound, onClose]);

    return createPortal(
        <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 transition-all duration-700 ${isVisible ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-transparent backdrop-blur-0'}`}>

            {/* Confetti Container */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-confetti-fall"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-20px`,
                            backgroundColor: ['#fbbf24', '#f59e0b', '#ea580c', '#34d399', '#6366f1'][Math.floor(Math.random() * 5)],
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 3}s`,
                            opacity: 0.8
                        }}
                    />
                ))}
            </div>

            {/* Modal Card */}
            <div className={`relative w-full max-w-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-700/50 text-center transition-all duration-700 transform ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-12'}`}>

                {/* Decoration Icons */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl shadow-orange-500/30 animate-celebrate-pop border-4 border-white dark:border-slate-800">
                        🏆
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {language === 'en' ? 'Excellent!' : 'চমৎকার!'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            {language === 'en' ? 'Lesson Completed Successfully' : 'পাঠটি সফলভাবে সম্পন্ন হয়েছে'}
                        </p>
                    </div>

                    <div className="py-6 flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-1 bg-slate-100 dark:bg-slate-700/50 rounded-full"></div>
                            <span className="text-orange-500 font-black text-lg">REWARD</span>
                            <div className="w-10 h-1 bg-slate-100 dark:bg-slate-700/50 rounded-full"></div>
                        </div>
                        <div className="flex items-baseline gap-2 text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-orange-600 animate-pulse">
                            +{counter}
                            <span className="text-2xl text-orange-500/60 font-black tracking-tighter uppercase">Pts</span>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/10 hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 group"
                        >
                            {language === 'en' ? 'Continue Journey' : 'চালিয়ে যান'}
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>
                </div>

                {/* Sub-note */}
                <p className="mt-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                    {language === 'en' ? 'Points added to overall leaderboard' : 'পয়েন্ট লিডারবোর্ডে যোগ করা হয়েছে'}
                </p>
            </div>

            <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg); }
                    100% { transform: translateY(100vh) rotate(360deg); }
                }
                .animate-confetti-fall {
                    animation: confetti-fall linear infinite;
                }
                @keyframes celebrate-pop {
                    0% { transform: scale(0.5); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .animate-celebrate-pop {
                    animation: celebrate-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
            `}</style>
        </div>,
        document.body
    );
};

export default LessonCelebration;
