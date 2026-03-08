import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DotLottiePlayer } from '@dotlottie/react-player';

// Import Lottie assets - matching the paths in Training.jsx
import readingLottie from '../../assets/readding.lottie';
import clockLottie from '../../assets/clock.lottie';

const OnboardingSequence = ({ language, onComplete }) => {
    const [step, setStep] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const steps = [
        {
            title: language === 'en' ? 'Protecting Lives' : 'জীবন রক্ষা করুন',
            subtitle: language === 'en' ? 'The Mission' : 'আমাদের লক্ষ্য',
            description: language === 'en'
                ? 'SmartLineman.in is your partner in safety. We aim to ensure every lineman returns home safely to their families.'
                : 'স্মার্টলাইনম্যান আপনার নিরাপত্তার সঙ্গী। আমাদের লক্ষ্য প্রতিটি লাইনম্যান যেন নিরাপদে তাদের পরিবারের কাছে ফিরে যেতে পারে।',
            icon: '🛡️',
            lottie: readingLottie,
            color: 'from-orange-600 to-orange-400'
        },
        {
            title: language === 'en' ? '10 Core Chapters' : '১০টি মূল অধ্যায়',
            subtitle: language === 'en' ? 'The Journey' : 'শেখার যাত্রা',
            description: language === 'en'
                ? 'Master 10 essential safety chapters. From basic PPE to advanced SOPs, we cover everything you need to stay safe.'
                : '১০টি অত্যাবশ্যকীয় নিরাপত্তা অধ্যায় আয়ত্ত করুন। সাধারণ PPE থেকে শুরু করে অ্যাডভান্সড SOP পর্যন্ত সব কিছু এখানে আছে।',
            icon: '📖',
            lottie: readingLottie,
            color: 'from-blue-600 to-indigo-500'
        },
        {
            title: language === 'en' ? 'Hourly Challenge' : 'প্রতি ঘণ্টার চ্যালেঞ্জ',
            subtitle: language === 'en' ? 'Win Rewards' : 'পুরস্কার জিতুন',
            description: language === 'en'
                ? 'Take quick 1-minute quizzes every hour. Test your knowledge, earn ⚡, and climb the leaderboard!'
                : 'প্রতি ঘণ্টায় ১ মিনিটের কুইজে অংশ নিন। আপনার জ্ঞান পরীক্ষা করুন, ⚡ অর্জন করুন এবং লিডারবোর্ডে এগিয়ে থাকুন!',
            icon: '⚡',
            lottie: clockLottie,
            color: 'from-emerald-600 to-teal-500'
        },
        {
            title: language === 'en' ? 'Knowledge is Power' : 'জ্ঞানই শক্তি',
            subtitle: language === 'en' ? 'Our Belief' : 'আমাদের বিশ্বাস',
            description: language === 'en'
                ? 'Accidents happen not because of ignorance, but because we often neglect protocols. True knowledge is the root of all solutions.'
                : 'দুর্ঘটনা ঘটে কারণ আমরা নিয়ম জানি না তা নয়, বরং আমরা নিয়মকে গুরুত্ব দেই না। সঠিক জ্ঞানই সব সমাধানের উৎস।',
            icon: '☀️',
            lottie: readingLottie,
            color: 'from-amber-500 to-orange-600'
        }
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            setIsExiting(true);
            setTimeout(() => {
                onComplete();
            }, 600);
        }
    };

    return createPortal(
        <div className={`fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-10 transition-all duration-700 ${isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'}`}>
            {/* Immersive Background */}
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-3xl" />

            {/* Decorative Gradients */}
            <div className={`absolute top-0 right-0 w-[40rem] h-[40rem] bg-orange-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 transition-all duration-1000 ${step === 0 ? 'opacity-100' : 'opacity-30'}`} />
            <div className={`absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 transition-all duration-1000 ${step === 1 ? 'opacity-100' : 'opacity-30'}`} />
            <div className={`absolute top-1/2 left-1/2 w-[50rem] h-[50rem] bg-emerald-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${step === 2 ? 'opacity-100' : 'opacity-0'}`} />

            <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-white/50 dark:border-slate-700/50 flex flex-col animate-entrance-pop">
                {/* Progress Indicators */}
                <div className="absolute top-8 left-0 right-0 flex justify-center gap-2 z-20">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-orange-500' : i < step ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200 dark:bg-slate-700'}`}
                        />
                    ))}
                </div>

                {/* Content Container */}
                <div className="flex-1 p-8 sm:p-12 flex flex-col items-center text-center">
                    {/* Visual Section */}
                    <div className="relative mb-8 pt-6">
                        <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-gradient-to-br ${currentStep.color} flex items-center justify-center text-5xl sm:text-6xl text-white shadow-2xl animate-subtle-float relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                            <div className="relative z-10">
                                {currentStep.lottie ? (
                                    <DotLottiePlayer
                                        src={currentStep.lottie}
                                        autoplay
                                        loop
                                        className="w-24 h-24 sm:w-32 sm:h-32"
                                    />
                                ) : (
                                    currentStep.icon
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Text Section */}
                    <div className="space-y-4 mb-10">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                                {currentStep.subtitle}
                            </span>
                            <h2 className={`text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {currentStep.title}
                            </h2>
                        </div>
                        <p className={`text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium max-w-sm leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {currentStep.description}
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleNext}
                        className="w-full material-button-primary py-4 sm:py-5 text-xl font-black shadow-2xl transition-all active:scale-[0.98] group flex items-center justify-center gap-3"
                    >
                        {step === steps.length - 1
                            ? (language === 'en' ? 'Get Started' : 'শুরু করুন')
                            : (language === 'en' ? 'Next' : 'পরবর্তী')}
                        <svg className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default OnboardingSequence;
