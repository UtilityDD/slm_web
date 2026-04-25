import React, { useState, useEffect, useCallback, useRef } from 'react';

const steps = [
    {
        id: 'start',
        title: { en: 'Suraksha Sathi', bn: 'সুরক্ষা সাথী' },
        instruction: { en: 'Hello. I am your safety companion. Lets stay safe today.', bn: 'নমস্কার। আমি আপনার সুরক্ষা সাথী। চলুন আজকের কাজ নিরাপদে শুরু করি।' },
        icon: '🤝',
        bg: 'from-slate-900 to-slate-800',
        audio: 'start.wav'
    },
    {
        id: 'oath',
        title: { en: 'Safety Pledge', bn: 'সুরক্ষার অঙ্গীকার' },
        instruction: { en: 'Please listen to the oath. Your family is waiting for you.', bn: 'শান্ত হয়ে অঙ্গীকারটি শুনুন। মনে রাখবেন, আপনার পরিবার আপনার অপেক্ষায় আছে।' },
        icon: '🗣️',
        bg: 'from-orange-600 to-orange-500',
        audio: 'oath_1.wav'
    },
    {
        id: 'pre_checklist',
        title: { en: 'Equipment Check', bn: 'সরঞ্জাম মিলিয়ে নিন' },
        instruction: { en: 'Is all your gear ready? Please check one by one.', bn: 'সব সরঞ্জাম ঠিক আছে তো? এক এক করে মিলিয়ে নিন।' },
        icon: '✅',
        bg: 'from-blue-600 to-blue-500',
        audio: 'check_items.wav'
    },
    {
        id: 'isolation',
        title: { en: 'Area Isolation', bn: 'এলাকা আইসোলেশন' },
        instruction: { 
            en: 'Excellent! All gear is ready. Now for the most important part—isolating the area. Carefully isolate power from both sides and set up barricades where needed.', 
            bn: 'অসাধারণ! সরঞ্জাম সব ঠিক আছে। এবার আমাদের সবচেয়ে গুরুত্বপূর্ণ কাজ—এলাকাটি আইসোলেট করা। সাবধানে দুদিক থেকে পাওয়ার আসা বন্ধ করুন এবং প্রয়োজনীয় জায়গায় ব্যারিকেড দিন।' 
        },
        icon: '🚧',
        bg: 'from-purple-600 to-purple-500',
        audio: 'isolation_ready.wav'
    },
    {
        id: 'work',
        title: { en: 'During Work', bn: 'কাজের সময়' },
        instruction: { en: 'Stay focused. Keep your safety belt and grounding tight.', bn: 'মনোযোগ দিয়ে কাজ করুন। বেল্ট এবং গ্রাউন্ডিং সবসময় সাথে রাখুন।' },
        icon: '⚡',
        bg: 'from-amber-600 to-amber-500',
        audio: 'work_focus.wav'
    },
    {
        id: 'final_check',
        title: { en: 'Post-Work Check', bn: 'কাজ শেষে শেষ চেক' },
        instruction: { 
            en: 'Well done! The work is successfully completed. Now, before re-energizing the line, please make final checks to ensure all groundings are removed and no tools are left on the line.', 
            bn: 'সাবাশ! কাজ সফলভাবে শেষ হয়েছে। এবার লাইনটি আবার চালু করার আগে শেষবারের মতো নিশ্চিত হয়ে নিন যে সব গ্রাউন্ডিং সরানো হয়েছে এবং কোনো সরঞ্জাম লাইনে ফেলে রাখা হয়নি।' 
        },
        icon: '🔍',
        bg: 'from-emerald-600 to-emerald-500',
        audio: 'post_work_ready.wav'
    },
    {
        id: 'done',
        title: { en: 'Mission Completed', bn: 'মিশন সম্পন্ন' },
        instruction: { en: 'Great job. Mission completed safely. You are now ready for your next task or to head back.', bn: 'দারুণ কাজ! মিশনটি নিরাপদে সম্পন্ন হয়েছে। এখন আপনি পরবর্তী কাজের জন্য বা ফিরে যাওয়ার জন্য প্রস্তুত।' },
        icon: '🏆',
        bg: 'from-green-600 to-green-500',
        audio: 'home_safe.wav'
    }
];

const PRE_CHECKLIST_ITEMS = [
    { id: 'helmet', label: { en: 'Helmet', bn: 'হেলমেট' }, icon: '🪖', audio: 'helmet.wav' },
    { id: 'gloves', label: { en: 'Gloves', bn: 'হাত মোজা (গ্লাভস)' }, icon: '🧤', audio: 'gloves.wav' },
    { id: 'shoes', label: { en: 'Shoes', bn: 'সেফটি জুতো' }, icon: '🥾', audio: 'shoes.wav' },
    { id: 'harness', label: { en: 'Safety Harness', bn: 'ফুল বডি হারনেস (বেল্ট)' }, icon: '🧗', audio: 'harness.wav' },
    { id: 'rod', label: { en: 'Earth Rod', bn: 'ডিসচার্জ রড' }, icon: '🦯', audio: 'rod.wav' },
    { id: 'ptw', label: { en: 'PTW Taken', bn: 'পারমিট (PTW)' }, icon: '📝', audio: 'ptw.wav' }
];

const ISOLATION_CHECKLIST_ITEMS = [
    { id: 'isolate', label: { en: 'Isolate Both Sides', bn: 'দুদিক থেকে আইসোলেট করা হয়েছে' }, icon: '🔌', audio: 'isolated.wav' },
    { id: 'test', label: { en: 'Tested Voltage', bn: 'ভোল্টেজ চেক করা হয়েছে' }, icon: '📟', audio: 'tested.wav' },
    { id: 'discharge', label: { en: 'Line Discharged', bn: 'লাইন ডিসচার্জ করা হয়েছে' }, icon: '⚡', audio: 'discharged.wav' },
    { id: 'grounding', label: { en: 'Earth/Grounding Done', bn: 'শর্টিং ও গ্রাউন্ডিং করা হয়েছে' }, icon: '🦯', audio: 'grounded.wav' },
    { id: 'barricade', label: { en: 'Site Barricaded', bn: 'ব্যারিকেড নিশ্চিত করা হয়েছে' }, icon: '🚧', audio: 'barricaded.wav' }
];

const POST_CHECKLIST_ITEMS = [
    { id: 'ground_rem', label: { en: 'Grounding Removed', bn: 'সব গ্রাউন্ডিং সরানো হয়েছে' }, icon: '⚡', audio: 'ground_removed.wav' },
    { id: 'tools_counted', label: { en: 'Tools Counted', bn: 'সব সরঞ্জাম গুনে নেওয়া হয়েছে' }, icon: '🧰', audio: 'tools_counted.wav' },
    { id: 'site_clean', label: { en: 'Site Cleaned', bn: 'কাজের জায়গা পরিষ্কার করা হয়েছে' }, icon: '🧹', audio: 'site_clean.wav' },
    { id: 'permit_return', label: { en: 'Permit Returned', bn: 'পারমিট (PTW) ফেরত দেওয়া হয়েছে' }, icon: '📝', audio: 'permit_return.wav' },
    { id: 'barricade_rem', label: { en: 'Barricade Removed', bn: 'ব্যারিকেড সরানো হয়েছে' }, icon: '🚧', audio: 'barricade_removed.wav' }
];

export default function SafetyAssistant({ language = 'bn', onClose }) {
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [checklist, setChecklist] = useState({});
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [history, setHistory] = useState([]);
    const [viewMode, setViewMode] = useState('wizard'); 

    const currentStep = steps[currentStepIdx];

    // Load History
    useEffect(() => {
        const saved = localStorage.getItem('slm_safety_history');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    const [voices, setVoices] = useState([]);
    const audioRef = useRef(new Audio());

    // Load voices on mount
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const stopAllAudio = useCallback(() => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current.load();
            audioRef.current.currentTime = 0;
        }
        setIsSpeaking(false);
    }, []);

    // Stop audio on unmount
    useEffect(() => {
        return () => stopAllAudio();
    }, [stopAllAudio]);

    const playAudio = useCallback((text, audioFile = null) => {
        stopAllAudio();
        
        let ttsTimeout = null;

        const speakWithTTS = () => {
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            
            const cleanedText = text.trim();
            const utterance = new SpeechSynthesisUtterance(cleanedText);
            
            if (language === 'bn') {
                // Priority: Neural Female > Neural Male > Google > Native
                const bnVoice = voices.find(v => /google.*(bangla|bengali).*neural.*female/i.test(v.name)) ||
                               voices.find(v => /google.*(bangla|bengali).*neural/i.test(v.name)) || 
                               voices.find(v => /microsoft.*(bangla|bengali).*online/i.test(v.name)) ||
                               voices.find(v => /google.*(bangla|bengali)/i.test(v.name)) ||
                               voices.find(v => v.lang.startsWith('bn'));
                
                if (bnVoice) utterance.voice = bnVoice;
                utterance.lang = 'bn-IN';
                utterance.rate = 0.92; // Optimized for Tanishaa/Female flow
            } else {
                const enVoice = voices.find(v => /google.*english.*neural.*female/i.test(v.name)) ||
                               voices.find(v => /google.*english.*neural/i.test(v.name)) || 
                               voices.find(v => /microsoft.*english.*online/i.test(v.name)) ||
                               voices.find(v => v.lang.startsWith('en-US'));
                if (enVoice) utterance.voice = enVoice;
                utterance.lang = 'en-US';
                utterance.rate = 0.95;
            }
            
            utterance.pitch = 1.0;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            
            window.speechSynthesis.speak(utterance);
        };

        // Priority 1: Try High Quality Pre-recorded Audio File
        if (audioFile) {
            const audioPath = `/audio/safety/${audioFile.replace('.mp3', '.wav')}`;
            const testAudio = new Audio(audioPath);
            
            // Set a safety timeout - if file doesn't load in 3s, only then fallback to TTS
            // This prevents Android from triggering both at once
            testAudio.addEventListener('canplaythrough', () => {
                if (ttsTimeout) clearTimeout(ttsTimeout);
                audioRef.current.src = audioPath;
                audioRef.current.onplay = () => setIsSpeaking(true);
                audioRef.current.onended = () => setIsSpeaking(false);
                audioRef.current.play().catch(() => {
                    // Only play TTS if Audio.play truly fails
                    speakWithTTS();
                });
            }, { once: true });

            testAudio.addEventListener('error', () => {
                if (ttsTimeout) clearTimeout(ttsTimeout);
                speakWithTTS(); 
            }, { once: true });
            
            return;
        }

        // Priority 2: Standard Fallback (No audio file provided)
        speakWithTTS();
    }, [language, voices]);

    const playAlertSound = useCallback(() => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(880, context.currentTime); // High pitch beep
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.2);
        } catch (e) {
            console.error('Audio context error:', e);
        }
    }, []);

    // Handle Step Audio on change
    useEffect(() => {
        if (viewMode === 'wizard' && currentStep) {
            playAudio(currentStep.instruction[language], currentStep.audio);
        }
    }, [currentStepIdx, viewMode, language, playAudio]);

    const toggleCheck = (id) => {
        const isCurrentlyChecked = checklist[id];
        setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
        
        if (!isCurrentlyChecked) {
            const currentItems = currentStep.id === 'pre_checklist' ? PRE_CHECKLIST_ITEMS : 
                               currentStep.id === 'isolation' ? ISOLATION_CHECKLIST_ITEMS :
                               currentStep.id === 'final_check' ? POST_CHECKLIST_ITEMS : [];
            const item = currentItems.find(i => i.id === id);
            if (item) {
                playAudio(item.label[language], item.audio);
            }
        } else {
            // Stop immediately if unticked
            stopAllAudio();
        }
    };

    const handleNext = () => {
        // Step 3 Validation
        if (currentStep.id === 'pre_checklist') {
            const preItemsChecked = PRE_CHECKLIST_ITEMS.every(item => checklist[item.id]);
            if (!preItemsChecked) {
                playAlertSound();
                playAudio(language === 'bn' ? 'দয়া করে আগে সব সরঞ্জাম চেক করুন' : 'Please check all items first', 'alert_check.mp3');
                return;
            }
        }

        // Step 4 Validation (Isolation)
        if (currentStep.id === 'isolation') {
            const isoItemsChecked = ISOLATION_CHECKLIST_ITEMS.every(item => checklist[item.id]);
            if (!isoItemsChecked) {
                playAlertSound();
                playAudio(language === 'bn' ? 'দয়া করে আইসোলেশন ও গ্রাউন্ডিং নিশ্চিত করুন' : 'Please confirm isolation and grounding', 'alert_isolate.wav');
                return;
            }
        }

        // Step 6 Validation (Strict)
        if (currentStep.id === 'final_check') {
            const postItemsChecked = POST_CHECKLIST_ITEMS.every(item => checklist[item.id]);
            if (!postItemsChecked) {
                playAlertSound();
                playAudio(language === 'bn' ? 'আগে নিশ্চিত করুন সব গ্রাউন্ডিং সরানো হয়েছে কিনা' : 'Please confirm everything is cleared', 'alert_done.mp3');
                return;
            }
        }

        if (currentStepIdx < steps.length - 1) {
            if (currentStep.id === 'pre_checklist' && !startTime) setStartTime(new Date());
            setCurrentStepIdx(prev => prev + 1);
        } else {
            saveToHistory();
            onClose();
        }
    };

    const handleBack = () => {
        stopAllAudio();
        setChecklist({}); // Safety Reset: Force re-verification of all items if moving back
        if (currentStepIdx > 0) setCurrentStepIdx(prev => prev - 1);
    };

    const saveToHistory = () => {
        const newLog = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            duration: startTime ? Math.floor((new Date() - startTime) / 60000) : 0,
            status: 'Safely Completed'
        };
        const updated = [newLog, ...history].slice(0, 50);
        setHistory(updated);
        localStorage.setItem('slm_safety_history', JSON.stringify(updated));
    };

    const deleteLog = (id) => {
        const updated = history.filter(log => log.id !== id);
        setHistory(updated);
        localStorage.setItem('slm_safety_history', JSON.stringify(updated));
    };

    const getContinueBtnText = () => {
        if (language === 'en') {
            switch(currentStep.id) {
                case 'oath': return 'I am Ready';
                case 'pre_checklist': return 'Start Work?';
                case 'isolation': return 'Everything Isolated';
                case 'work': return 'Finished Work?';
                case 'final_check': return 'Finalize Mission?';
                case 'done': return 'Finish';
                default: return 'Next';
            }
        } else {
            switch(currentStep.id) {
                case 'oath': return 'আমি প্রস্তুত';
                case 'pre_checklist': return 'কাজে নামি?';
                case 'isolation': return 'হ্যাঁ, আইসোলেট করা হয়েছে';
                case 'work': return 'কাজ শেষ হলো?';
                case 'final_check': return 'সব সম্পন্ন হয়েছে?';
                case 'done': return 'মিশন শেষ';
                default: return 'কন্টিনিউ (Next)';
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {/* Header - Colored & Vibrant with Safe Area Support */}
            <header className={`pt-[env(safe-area-inset-top)] pb-6 px-6 bg-gradient-to-r ${currentStep.bg} text-white shadow-lg shrink-0 transition-all duration-500`}>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 -ml-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">{currentStep.title[language]}</h1>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Step {currentStepIdx + 1} of {steps.length}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setViewMode(viewMode === 'history' ? 'wizard' : 'history')}
                        className="px-4 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20"
                    >
                        {viewMode === 'history' ? (language === 'en' ? 'Back' : 'পিছনে যান') : (language === 'en' ? 'History' : 'হিস্ট্রি')}
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-center relative">
                
                {viewMode === 'history' ? (
                    <div className="space-y-4 animate-slide-up">
                        <div className="mb-6">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 px-1">রিসেণ্ট সেফটি লগ (History)</h2>
                            <p className="text-[10px] text-orange-500 font-bold px-1 italic">"আপনার সুরক্ষা আপনার পরিবারের সবচেয়ে বড় সম্পদ।"</p>
                        </div>
                        {history.length === 0 ? (
                            <div className="py-32 text-center space-y-4">
                                <div className="text-6xl opacity-20">📂</div>
                                <p className="text-slate-400 font-bold">সাথী এখনো কোনো রেকর্ড পায়নি।<br/>নিরাপদে কাজ শুরু করুন!</p>
                            </div>
                        ) : (
                            history.map(log => (
                                <div key={log.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center text-emerald-600">✅</div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{log.date} @ {log.time}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{log.duration} মিনিট সেশন • {log.status}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteLog(log.id)} className="p-3 text-red-100 hover:text-red-500 transition-colors">🗑️</button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col">
                {/* Audio Status Floating Overlay */}
                {isSpeaking && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-up">
                        <div className="flex gap-2 items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-2.5 rounded-full text-slate-900 dark:text-white text-[10px] font-black shadow-2xl border border-orange-500/30 whitespace-nowrap">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                            </span>
                            ভয়েস গাইডেন্স চলছে...
                        </div>
                    </div>
                )}

                        {currentStep.id === 'start' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn">
                                <span className="text-9xl group-hover:scale-110 transition-transform duration-500">🤝</span>
                                <p className="text-2xl font-black text-slate-700 dark:text-slate-300 px-10 leading-tight italic">
                                    "আপনার সুরক্ষা, আমাদের প্রতিশ্রুতি"
                                </p>
                                <button onClick={() => setCurrentStepIdx(1)} className="w-full max-w-xs py-5 bg-orange-600 text-white rounded-3xl font-black text-xl shadow-lg shadow-orange-600/30 active:scale-95 transition-all flex items-center justify-center gap-4 group">
                                    {language === 'bn' ? 'চলুন কাজ শুরু করি' : 'Start Working Safely'}
                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            </div>
                        )}

                        {currentStep.id === 'oath' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-10 animate-slide-up">
                                <div className="text-8xl animate-bounce-subtle">✋</div>
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800">
                                    <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight italic">
                                        {language === 'bn' 
                                            ? "আমি অঙ্গীকার করছি যে, আমি সমস্ত নিয়ম মেনে চলব। আমার সুরক্ষা এবং আমার পরিবারের সুখ আমার হাতে।"
                                            : "I pledge to follow all safety rules. My life and my family's happiness are in my hands."}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => playAudio(currentStep.instruction[language], currentStep.audio)} 
                                    className="text-orange-600 font-black text-xs uppercase tracking-widest bg-orange-50 px-6 py-2 rounded-full border border-orange-200 active:scale-95 transition-transform"
                                >
                                    {language === 'bn' ? 'আবার শপথ নিন 🔊' : 'Replay Oath 🔊'}
                                </button>
                            </div>
                        )}

                        {currentStep.id === 'pre_checklist' && (
                            <div className="flex-1 flex flex-col justify-center animate-fadeIn">
                                <div className="grid grid-cols-2 gap-3 mb-10">
                                    {PRE_CHECKLIST_ITEMS.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                toggleCheck(item.id);
                                            }}
                                            className={`p-5 h-36 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                                                checklist[item.id] ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                            }`}
                                        >
                                            <span className="text-4xl">{item.icon}</span>
                                            <span className="text-[10px] font-black uppercase text-center leading-tight px-1">{item.label[language]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Isolation Checklist (Step 4) */}
                        {currentStep.id === 'isolation' && (
                            <div className="flex-1 flex flex-col justify-center grid grid-cols-1 gap-3 mb-8 animate-slide-up">
                                {ISOLATION_CHECKLIST_ITEMS.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => toggleCheck(item.id)}
                                        className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all active:scale-95 ${checklist[item.id]
                                            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-500 text-purple-700 dark:text-purple-400'
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl">{item.icon}</div>
                                            <span className="font-black uppercase tracking-tight text-xs text-left leading-tight">{item.label[language]}</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${checklist[item.id] ? 'bg-purple-500 text-white scale-110' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            {checklist[item.id] ? '✓' : ''}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {currentStep.id === 'work' && (
                            <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-slide-up">
                                <div className="relative w-64 h-64 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full shadow-2xl border-[16px] border-amber-500/20">
                                    <div className="absolute inset-0 border-[16px] border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                    <div className="text-center">
                                         <p className="text-4xl font-black text-slate-800 dark:text-white">মন দিয়ে কাজ করুন</p>
                                         <p className="text-xs font-bold text-slate-400 px-4 mt-2 tracking-widest uppercase">আপনার সাথী সাথে আছে</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-amber-100 dark:bg-amber-900/30 rounded-3xl border border-amber-200 text-amber-800 dark:text-amber-400 font-bold text-center">
                                    সাবধান! কাজ শেষ না হওয়া পর্যন্ত গ্রাউন্ডিং সরাবেন না।
                                </div>
                            </div>
                        )}

                        {/* Specific Step Content: Checklist (Step 5) */}
                        {currentStep.id === 'final_check' && (
                            <div className="flex-1 flex flex-col justify-center grid grid-cols-1 gap-3 mb-8 animate-slide-up">
                                {POST_CHECKLIST_ITEMS.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => toggleCheck(item.id)}
                                        className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all active:scale-95 ${checklist[item.id]
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl">{item.icon}</div>
                                            <span className="font-black uppercase tracking-tight text-xs text-left leading-tight">{item.label[language]}</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${checklist[item.id] ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            {checklist[item.id] ? '✓' : ''}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {currentStep.id === 'done' && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 animate-scale-in">
                                <div className="relative">
                                    <div className="w-48 h-48 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl flex items-center justify-center text-8xl border-4 border-emerald-500">🏆</div>
                                    <div className="absolute -bottom-4 -right-4 bg-emerald-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-4xl shadow-xl">❤️</div>
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter mb-2 uppercase">দারুণ কাজ!</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold">আপনার সুরক্ষার রেকর্ড সাথী যত্ন করে রেখে দিয়েছে।</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Nav Footer */}
            {viewMode === 'wizard' && currentStep.id !== 'start' && (
                <footer className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-4">
                        <button 
                            onClick={handleBack}
                            className="w-[100px] py-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-tight active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                            </svg>
                            {language === 'bn' ? 'পিছনে' : 'Back'}
                        </button>
                        
                        <button 
                            onClick={handleNext}
                            className={`flex-1 py-5 rounded-3xl font-black text-sm tracking-tight shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group ${
                                currentStep.id === 'done' 
                                ? 'bg-slate-900 text-white' 
                                : `bg-gradient-to-r ${currentStep.bg} text-white shadow-xl opacity-90 hover:opacity-100`
                            }`}
                        >
                            <span className="relative z-10">{getContinueBtnText()}</span>
                            {currentStepIdx < steps.length - 1 && (
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center relative z-10">
                                    <svg className="w-3.5 h-3.5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
}
