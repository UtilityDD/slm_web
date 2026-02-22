import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';

const PPE_MAP = {
    1: { name: "Safety Helmet", icon: "🪖", image: "/quizzes/faq_images/Safety_Helmet.webp" },
    2: { name: "Safety Shoes/Boots", icon: "🥾", image: "/quizzes/faq_images/safety_shoe_1.webp" },
    3: { name: "Insulated Gloves", icon: "🧤", image: "/quizzes/faq_images/Electrical_Gloves.webp" },
    4: { name: "Reflective Jacket", icon: "🦺" },
    5: { name: "Safety Belt", icon: "🧗" },
    6: { name: "Full Body Harness", icon: "🧗‍♂️" },
    7: { name: "Voltage Detector", icon: "🔌" },
    8: { name: "Discharge Rod", icon: "🦯" },
    9: { name: "Safety Goggles", icon: "🥽" },
    10: { name: "Torch/Emergency Light", icon: "🔦" }
};

export default function PPESurveyModal({ isOpen, onClose, ppeItem, user, existingId, language, onComplete }) {
    const [step, setStep] = useState(1); // 1: Count, 2: Usage, 3: Condition, 4: Age
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        count: 1,
        condition: 'Good',
        age_months: 1,
        available: true,
        usage: 'Personal'
    });

    if (!isOpen || !ppeItem) return null;

    const handleSave = async (isAvailable) => {
        setLoading(true);
        onComplete({
            ...ppeItem,
            available: isAvailable,
            details: isAvailable ? `Usage: ${formData.usage}` : 'Not Available'
        });

        try {
            if (!isAvailable) {
                onClose();
                return;
            }

            const payload = {
                user_id: user.id,
                name: ppeItem.name,
                count: parseInt(formData.count),
                condition: formData.condition,
                age_months: parseInt(formData.age_months),
                details: `Usage: ${formData.usage}`
            };

            if (existingId) {
                payload.id = existingId;
            }

            const { error } = await supabase
                .from('user_ppe')
                .upsert([payload], { onConflict: 'id' });

            if (error) throw error;
            onClose();
        } catch (error) {
            console.error('Error saving survey:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const isReview = ppeItem.isReview;
    const TOTAL_STEPS = 4;

    const questions = {
        1: {
            en: isReview ? "Current count?" : `How many ${ppeItem.name} do you carry?`,
            bn: isReview ? "কটা আছে?" : `আপনার কাছে এই ${ppeItem.name} কটা আছে?`,
            options: [
                { id: 0, label: language === 'en' ? 'None' : 'একটিও নেই', icon: '❌', action: () => handleSave(false) },
                { id: 1, label: '1', icon: '☝️', action: (id) => { setFormData({ ...formData, count: id }); nextStep(); } },
                { id: 2, label: '2', icon: '✌️', action: (id) => { setFormData({ ...formData, count: id }); nextStep(); } },
                { id: 3, label: '3+', icon: '✋', action: (id) => { setFormData({ ...formData, count: id }); nextStep(); } }
            ]
        },
        2: {
            en: isReview ? "Personal or Shared? 👥" : "Is this YOUR gear, or shared with the team?",
            bn: isReview ? "ব্যক্তিগত নাকি যৌথ? 👥" : "এটা কি শুধুই আপনার? নাকি টিমের সাথে শেয়ার?",
            options: [
                { id: 'Personal', label: language === 'en' ? 'Personal' : 'ব্যক্তিগত', icon: '👤', action: (id) => { setFormData({ ...formData, usage: id }); nextStep(); } },
                { id: 'Shared', label: language === 'en' ? 'Shared' : 'যৌথ/শেয়ার্ড', icon: '👥', action: (id) => { setFormData({ ...formData, usage: id }); nextStep(); } }
            ]
        },
        3: {
            en: isReview ? "Condition check! 🔥" : "Honest truth — How's it holding up?",
            bn: isReview ? "কেমন অবস্থায় আছে? 🔥" : "সত্যি করে বলুন — কেমন অবস্থায় আছে?",
            options: [
                { id: 'Good', label: language === 'en' ? 'Fit & Ready' : 'ভালো আছে', icon: '🔥', action: (id) => { setFormData({ ...formData, condition: id }); nextStep(); } },
                { id: 'Fair', label: language === 'en' ? 'Okay' : 'মোটামুটি', icon: '🆗', action: (id) => { setFormData({ ...formData, condition: id }); nextStep(); } },
                { id: 'Poor', label: language === 'en' ? 'Needs Replacing' : 'বদলানো দরকার', icon: '⚠️', action: (id) => { setFormData({ ...formData, condition: id }); nextStep(); } }
            ]
        },
        4: {
            en: isReview ? "Any older? 🕒" : "How long has it been serving you?",
            bn: isReview ? "বয়স বেড়েছে কি? 🕒" : "কতদিন ধরে ব্যবহার করছেন?",
            options: [
                { id: 1, label: language === 'en' ? 'Brand New' : 'নতুন', icon: '✨', action: (id) => { setFormData({ ...formData, age_months: id }); handleSave(true); } },
                { id: 3, label: language === 'en' ? '~3 Months' : '৩ মাস', icon: '🕒', action: (id) => { setFormData({ ...formData, age_months: id }); handleSave(true); } },
                { id: 6, label: language === 'en' ? '6 Months+' : '৬ মাস+', icon: '🧔', action: (id) => { setFormData({ ...formData, age_months: id }); handleSave(true); } },
                { id: 12, label: language === 'en' ? '1 Year+' : '১ বছর+', icon: '🏛️', action: (id) => { setFormData({ ...formData, age_months: id }); handleSave(true); } }
            ]
        }
    };

    const currentQ = questions[step];

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in font-sans">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative">

                {/* ── HERO IMAGE SECTION ── */}
                <div className="relative w-full flex-shrink-0 overflow-hidden bg-slate-900 dark:bg-slate-950" style={{ minHeight: '13rem', maxHeight: '18rem' }}>
                    {ppeItem.image ? (
                        <img
                            src={ppeItem.image}
                            alt={ppeItem.name}
                            className="w-full h-full object-contain"
                            style={{ maxHeight: '18rem' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-full flex items-center justify-center text-8xl" style={{ minHeight: '13rem' }}>
                            {ppeItem.icon}
                        </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* PPE name & step badge on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                        <div>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                                {language === 'en' ? `Step ${step} of ${TOTAL_STEPS}` : `ধাপ ${step} / ${TOTAL_STEPS}`}
                            </p>
                            <h2 className={`text-white text-2xl font-black drop-shadow-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {ppeItem.name}
                            </h2>
                        </div>
                        {/* Emoji fallback pill when image is present */}
                        {ppeItem.image && (
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/20">
                                {ppeItem.icon}
                            </div>
                        )}
                    </div>

                    {/* Progress bar overlaid at bottom of image */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                            className="h-full bg-orange-500 transition-all duration-500 ease-out"
                            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                        />
                    </div>

                    {/* Back button */}
                    {step > 1 && (
                        <button
                            onClick={prevStep}
                            className="absolute top-4 left-4 p-2 rounded-xl bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* ── QUESTION + OPTIONS SECTION ── */}
                <div className="p-6 sm:p-8 pb-10">
                    <h3 className={`text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight mb-6 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {currentQ[language]}
                    </h3>

                    {/* Options — 2-col for ≥3 options, 1-col for 2 */}
                    <div className={`grid gap-3 ${currentQ.options.length >= 3 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {currentQ.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => opt.action(opt.id)}
                                disabled={loading}
                                className="group/btn relative w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all duration-300 flex flex-col items-center gap-2 text-center active:scale-[0.96] disabled:opacity-50"
                            >
                                <span className="text-3xl group-hover/btn:scale-125 transition-transform duration-200">
                                    {opt.icon}
                                </span>
                                <p className={`text-sm font-black text-slate-800 dark:text-slate-100 leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {opt.label}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[210]">
                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

