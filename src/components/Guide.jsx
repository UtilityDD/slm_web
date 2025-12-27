import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { QRCodeCanvas } from 'qrcode.react';

const Guide = ({ hideHeader = false }) => {
    const [activeTab, setActiveTab] = useState('intro');
    const contentRef = useRef(null);

    const downloadPDF = () => {
        const element = contentRef.current;
        const originalWidth = element.style.width;
        const originalMargin = element.style.margin;
        const originalPadding = element.style.padding;

        element.style.width = '375px';
        element.style.margin = '0';
        element.style.padding = '0';

        const opt = {
            margin: 0,
            filename: 'SmartLineman_Volunteer_Handbook.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 375, scrollY: 0 },
            jsPDF: { unit: 'px', format: [375, 812], orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        element.classList.add('pdf-mode');
        html2pdf().set(opt).from(element).save().then(() => {
            element.classList.remove('pdf-mode');
            element.style.width = originalWidth;
            element.style.margin = originalMargin;
            element.style.padding = originalPadding;
        });
    };

    const tabs = [
        { id: 'intro', label: 'সূচনা', icon: '📘' },
        { id: 'day1', label: 'Day 1: প্রথম সাক্ষাৎ', icon: '🤝' },
        { id: 'day2', label: 'Day 2: এনগেজমেন্ট', icon: '💡' },
        { id: 'data-collection', label: 'তথ্য সংগ্রহ', icon: '📊' },
        { id: 'principles', label: 'মূলমন্ত্র', icon: '🌟' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-4 sm:py-8 px-4 sm:px-6 lg:px-8 font-bengali">
            <div className="max-w-4xl mx-auto">
                {/* Navigation Tabs */}
                {!hideHeader && (
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Handbook Container */}
                <div ref={contentRef} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-all duration-500">

                    {/* Dynamic Header based on Tab */}
                    {!hideHeader && (
                        <div className={`p-8 sm:p-10 text-center text-white relative overflow-hidden ${activeTab === 'intro' ? 'bg-gradient-to-br from-blue-700 to-indigo-800' :
                            activeTab === 'day1' ? 'bg-gradient-to-br from-green-600 to-teal-700' :
                                activeTab === 'day2' ? 'bg-gradient-to-br from-orange-500 to-red-600' :
                                    activeTab === 'data-collection' ? 'bg-gradient-to-br from-cyan-600 to-blue-700' :
                                        'bg-gradient-to-br from-purple-600 to-pink-600'
                            }`}>
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32 blur-3xl"></div>
                            </div>
                            <div className="relative z-10 animate-fade-in">
                                <h1 className="text-2xl sm:text-4xl font-bold mb-3">
                                    {tabs.find(t => t.id === activeTab).label}
                                </h1>
                                <p className="text-lg font-medium opacity-90 text-white/90">
                                    {activeTab === 'intro' && 'SMARTLINEMAN ভলান্টিয়ার হ্যান্ডবুক'}
                                    {activeTab === 'day1' && 'Building Trust & Confidence'}
                                    {activeTab === 'day2' && 'Community Engagement & Learning'}
                                    {activeTab === 'data-collection' && 'Effective Data Collection'}
                                    {activeTab === 'principles' && 'Knowledge is Power!'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="p-6 sm:p-10 space-y-8 min-h-[400px]">

                        {/* INTRO TAB */}
                        {activeTab === 'intro' && (
                            <div className="space-y-10 animate-fade-in">
                                <section>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <span className="text-2xl">🎯</span> মূল উদ্দেশ্য
                                    </h2>
                                    <div className="p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border-l-4 border-red-500 mb-6">
                                        <h3 className="font-bold text-red-700 dark:text-red-400 mb-2">কেন এই নতুন উদ্যোগ?</h3>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                            আমাদের বর্তমান নিরাপত্তা ব্যবস্থা "Top-Down" (অফিস থেকে চাপানো)। কিন্তু তাতে কাজের কাজ কিছুই হচ্ছে না। আমরা সেই <span className="font-bold">Critical Gap</span> পূরণ করতে চাই। নিরাপত্তা সংস্কৃতি (Safety Culture) নিচ থেকে, অর্থাৎ লাইনম্যানদের নিজেদের ভিতর থেকে তৈরি হতে হবে।
                                        </p>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border-l-4 border-blue-500">
                                            <p className="font-medium text-slate-700 dark:text-slate-300">কর্মক্ষেত্রে নিরাপত্তা চর্চা বৃদ্ধি (Safety Culture)</p>
                                        </div>
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border-l-4 border-indigo-500">
                                            <p className="font-medium text-slate-700 dark:text-slate-300">শক্তিশালী সহযোগিতামূলক কমিউনিটি গঠন</p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <span className="text-2xl">⚠️</span> বিদ্যমান ব্যবস্থার ফাঁকফোকর (Critical Gaps)
                                    </h2>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {[
                                            { icon: '🚫🎓', text: 'সকল লাইনম্যানের জন্য নিয়মিত প্রশিক্ষণের কোনো সুব্যবস্থা নেই।' },
                                            { icon: '🚐⚠️', text: 'কেবল মোবাইল-ভ্যান কর্মীদের কিছু অংশ মাঝে মাঝে প্রশিক্ষণ পায়, বাকিরা বঞ্চিত।' },
                                            { icon: '🗓️📉', text: 'বছরে একবারের দায়সারা প্রশিক্ষণে কাজের ক্ষেত্রে কোনো বাস্তব প্রভাব পড়ে না।' },
                                            { icon: '🛡️❓', text: 'কার কাছে সঠিক PPE আছে আর কার কাছে নেই, তার কোনো সঠিক তথ্য বা ট্র্যাকিং নেই।' },
                                            { icon: '💰⚖️', text: "দুর্ঘটনার পর 'Workman Compensation' পাওয়ার সঠিক পদ্ধতি সম্পর্কে স্বচ্ছ ধারণা নেই।" },
                                            { icon: '📜⚖️', text: 'নিজেদের আইনি অধিকার সম্পর্কে অধিকাংশ লাইনম্যানই অন্ধকারে।' },
                                            { icon: '🏥🛡️', text: 'সেরা ইন্স্যুরেন্স কভারেজ বা তা দাবি করার উপায় সম্পর্কে তারা জানে না।' },
                                            { icon: '🩺🏥', text: 'শারীরিক সক্ষমতা যাচাইয়ের জন্য নিয়মিত মেডিকেল টেস্টের ব্যবস্থা নেই।' },
                                            { icon: '👨‍👩‍👧‍👦🆘', text: 'দুর্ঘটনায় মৃত্যু হলে পরিবার যাতে সরকারি সামাজিক সুরক্ষা প্রকল্পগুলো পায়, তা দেখার কেউ নেই।' }
                                        ].map((gap, index) => (
                                            <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-start gap-3 hover:shadow-md transition-shadow">
                                                <span className="text-xl shrink-0">{gap.icon}</span>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{gap.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                        <span className="text-2xl">🏗️</span> আমাদের দর্শন
                                    </h2>
                                    <div className="space-y-3 italic text-blue-600 dark:text-blue-400 font-medium text-lg px-4 border-l-2 border-slate-200 dark:border-slate-700">
                                        <p>🔹 "নির্দেশ নয়, সহযোগিতা"</p>
                                        <p>🔹 "অফিস নয়, কমিউনিটি"</p>
                                        <p>🔹 "কথা কম, কাজ বেশি"</p>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* DAY 1 TAB */}
                        {activeTab === 'day1' && (
                            <div className="space-y-10 animate-fade-in">
                                <section>
                                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                                        প্রথম দিনের মিটিং: Sensible Confidence Building
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                                        প্রথম দিনটি খুবই গুরুত্বপূর্ণ। ১০-১২ জন লাইনম্যানের টিমের সাথে আপনার প্রথম সাক্ষাৎ কোনো "অফিসিয়াল মিটিং" নয়, এটি একটি <span className="font-bold text-green-600">বন্ধুত্বের শুরু</span>।
                                    </p>

                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-6 border border-amber-200 dark:border-amber-800">
                                        <p className="text-amber-800 dark:text-amber-200 font-bold flex items-center gap-2">
                                            <span className="text-xl">💡</span> Minute Guidance (সূক্ষ্ম বিষয়):
                                        </p>
                                        <ul className="text-slate-700 dark:text-slate-300 mt-2 space-y-2 text-sm">
                                            <li>• <span className="font-bold">বসার ভঙ্গি:</span> সবাই মিলে <span className="font-bold">গোল হয়ে (Round Circle)</span> বসুন। চেয়ারে বসলেও গোল হয়ে বসা জরুরি, যাতে "উঁচু-নিচু" ভেদাভেদ না থাকে এবং সবাই সবাইকে দেখতে পায়।</li>
                                            <li>• <span className="font-bold">পোশাক:</span> খুব ফরমাল বা অফিসের বড় কর্তার মতো পোশাক পরবেন না। সাধারণ পোশাকে যান যাতে তারা আপনাকে নিজের লোক মনে করে।</li>
                                            <li>• <span className="font-bold">শুরুটা হোক গল্পে:</span> সরাসরি কাজের কথায় না গিয়ে তাদের পরিবার, সন্তানদের পড়াশোনা বা সাধারণ কুশল বিনিময় দিয়ে শুরু করুন।</li>
                                        </ul>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-800">
                                            <h3 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                                                <span>✅</span> Do's (যা করবেন)
                                            </h3>
                                            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                <li>• হাসিমুখে কথা শুরু করুন, নিজেকে তাদের একজন বন্ধু হিসেবে পরিচয় দিন।</li>
                                                <li>• তাদের কাজের ঝুঁকির প্রশংসা করুন (Empathy)।</li>
                                                <li>• তাদের কথা বেশি শুনুন, নিজের কথা কম বলুন।</li>
                                                <li>• <span className="font-bold">পরিষ্কার বলুন:</span> "এখানে বলা কোনো কথাই অফিসে বা ঠিকাদারের কানে যাবে না।"</li>
                                                <li>• তাদের কোনো ব্যক্তিগত সমস্যার কথা বললে তা গুরুত্ব দিয়ে শুনুন।</li>
                                            </ul>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-800">
                                            <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                                                <span>❌</span> Don'ts (যা করবেন না)
                                            </h3>
                                            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                <li>• কোনো বসের মতো আচরণ করবেন না বা নির্দেশ দেবেন না।</li>
                                                <li>• খাতা-কলম নিয়ে নোট নেবেন না (এতে তারা ভয় পেতে পারে)।</li>
                                                <li>• তাদের ভুল ধরিয়ে দিয়ে লজ্জিত করবেন না।</li>
                                                <li>• "আমি সব জানি" এমন ভাব দেখাবেন না।</li>
                                                <li>• অফিসের কোনো নেতিবাচক আলোচনা তাদের সামনে করবেন না।</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* DAY 2 TAB */}
                        {activeTab === 'day2' && (
                            <div className="space-y-10 animate-fade-in">
                                <section>
                                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                                        দ্বিতীয় দিন: Engaging Community & Interactive Learning
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                                        বিশ্বাস অর্জনের পর, এখন সময় তাদের <span className="font-bold text-orange-600">এনগেজ</span> করার। স্মার্ট লাইনম্যান অ্যাপের মাধ্যমে তাদের নতুন কিছু শেখার আগ্রহ তৈরি করুন।
                                    </p>

                                    <div className="space-y-4">
                                        <div className="flex gap-4 items-start p-4 bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-3xl">📱</span>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Interactive Learning</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    তাদের অ্যাপের "Training" সেকশন দেখান। ছোট ছোট কুইজ এবং ভিডিওর মাধ্যমে শেখা যে কত মজার হতে পারে, তা বোঝান। <span className="italic">"শিখুন এবং জিতুন"</span>—এই মন্ত্রটি তাদের দিন।
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-start p-4 bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-3xl">🏆</span>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Healthy Competition</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    "Leaderboard" দেখান। কে কত পয়েন্ট পেল, তা নিয়ে তাদের মধ্যে বন্ধুত্বপূর্ণ প্রতিযোগিতা (Competition) তৈরি করুন। <span className="font-bold text-blue-600">"আমাদের টিমের কে সেরা?"</span>—এই চ্যালেঞ্জটি দিন।
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-start p-4 bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-3xl">🎁</span>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Encouraging by Reward</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    ভালো পারফরম্যান্সের জন্য ছোট ছোট পুরস্কার বা প্রশংসার ব্যবস্থা করুন। স্বীকৃতি (Recognition) মানুষকে সবচেয়ে বেশি অনুপ্রাণিত করে। তাদের বলুন, <span className="font-bold">"আপনার জ্ঞানই আপনার সুরক্ষা।"</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-start p-4 bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-3xl">⚠️</span>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Incident Reporting (সহযোগিতা হিসেবে)</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    তাদের বোঝান যে "Incident Reporting" মানে অভিযোগ করা নয়, বরং অন্য কোনো সহকর্মীকে একই বিপদ থেকে বাঁচানো। এটা একটি <span className="font-bold">মহৎ কাজ</span>।
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* DATA COLLECTION TAB */}
                        {activeTab === 'data-collection' && (
                            <div className="space-y-10 animate-fade-in">
                                <section>
                                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                                        তথ্য সংগ্রহ: সঠিক পদ্ধতি ও দৃষ্টিভঙ্গি
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                                        লাইনম্যানদের ব্যক্তিগত ও স্বাস্থ্যগত তথ্য সংগ্রহ করা একটি সংবেদনশীল কাজ। এটি কেবল ডাটা এন্ট্রি নয়, এটি তাদের <span className="font-bold text-blue-600">সুরক্ষা নিশ্চিত করার একটি ধাপ</span>।
                                    </p>

                                    <div className="grid gap-6">
                                        <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border-l-4 border-blue-500">
                                            <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                                                <span className="text-xl">🗣️</span> গল্পের ছলে শুরু (The Conversational Approach)
                                            </h3>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                সরাসরি অ্যাপ বের করে প্রশ্ন করা শুরু করবেন না। আগে তাদের সাথে সাধারণ গল্প করুন। গল্পের মাঝেই জিজ্ঞাসা করুন, "ভাই, আপনার বাড়িতে আর কে কে আছে?" বা "বাচ্চারা কোন ক্লাসে পড়ছে?"। যখন তারা সহজ হবে, তখন অ্যাপে তথ্যগুলো আপডেট করুন।
                                            </p>
                                        </div>

                                        <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border-l-4 border-indigo-500">
                                            <h3 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                                <span className="text-xl">🛡️</span> উদ্দেশ্য ব্যাখ্যা করুন (Explain the 'Why')
                                            </h3>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                তাদের বোঝান যে—"আপনার ব্লাড গ্রুপ জানা থাকলে জরুরি প্রয়োজনে আমরা দ্রুত রক্তদাতার ব্যবস্থা করতে পারব" অথবা "আপনার পরিবারের কন্টাক্ট নম্বর থাকলে কোনো বিপদে আমরা দ্রুত খবর দিতে পারব"। উদ্দেশ্য পরিষ্কার থাকলে তারা তথ্য দিতে দ্বিধা করবে না।
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-6 mt-8">
                                        <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-800">
                                            <h3 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                                                <span>✅</span> Do's (যা করবেন)
                                            </h3>
                                            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                <li>• সবসময় হাসিমুখে এবং বিনয়ের সাথে কথা বলুন।</li>
                                                <li>• তাদের পরিবারের সদস্যদের প্রতি আন্তরিকতা দেখান।</li>
                                                <li>• বারবার মনে করিয়ে দিন যে এই তথ্যগুলো সম্পূর্ণ <span className="font-bold">গোপন</span> থাকবে।</li>
                                                <li>• তাদের কাজের ফাঁকে বা বিশ্রামের সময় কথা বলুন।</li>
                                                <li>• তথ্য দেওয়ার জন্য তাদের ধন্যবাদ জানান।</li>
                                            </ul>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-800">
                                            <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                                                <span>❌</span> Don'ts (যা করবেন না)
                                            </h3>
                                            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                                <li>• জেরা করার মতো করে প্রশ্ন করবেন না।</li>
                                                <li>• তারা অস্বস্তি বোধ করলে জোর করবেন না।</li>
                                                <li>• খাতা-কলম নিয়ে ইন্টারভিউ নেওয়ার মতো ভাব করবেন না।</li>
                                                <li>• অফিসের কোনো ভয় বা চাপের কথা বলবেন না।</li>
                                                <li>• তাদের ব্যক্তিগত গোপনীয়তাকে অসম্মান করবেন না।</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* PRINCIPLES TAB */}
                        {activeTab === 'principles' && (
                            <div className="space-y-10 animate-fade-in">
                                <section className="text-center">
                                    <div className="inline-block p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 mb-4">
                                        <span className="text-4xl">🧠</span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                                        "Knowledge is the Power!"
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400">জ্ঞানই শক্তি, আর সচেতনতাই সুরক্ষা।</p>
                                </section>

                                <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-dashed border-red-400 dark:border-red-600 rounded-3xl text-center shadow-sm">
                                    <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4">🔐 গোপনীয়তার শপথ (Privacy Pledge)</h3>
                                    <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                                        "আমরা শপথ করছি: এই কমিউনিটির কোনো তথ্য, কোনো আলোচনা,<br />
                                        <span className="font-bold underline decoration-red-500">অফিস, ঠিকাদার বা বাইরের কারো কাছে যাবে না।</span><br />
                                        এই তথ্য শুধুই একে অপরকে বাঁচানোর জন্য।"
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-3 gap-6">
                                    <div className="text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl hover:shadow-md transition-shadow">
                                        <span className="text-4xl mb-3 block">❤️</span>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Creation of Empathy</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            একে অপরের প্রতি সহানুভূতিশীল হোন। সহকর্মীর বিপদে পাশে দাঁড়ান।
                                        </p>
                                    </div>
                                    <div className="text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl hover:shadow-md transition-shadow">
                                        <span className="text-4xl mb-3 block">🤝</span>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Building Community</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            আমরা একা নই, আমরা একটি পরিবার। এই কমিউনিটি আমাদের শক্তি।
                                        </p>
                                    </div>
                                    <div className="text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl hover:shadow-md transition-shadow">
                                        <span className="text-4xl mb-3 block">🚀</span>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Empowerment</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            শিক্ষার মাধ্যমে নিজেদের ক্ষমতায়ন করুন। নিজের অধিকার ও সুরক্ষা সম্পর্কে জানুন।
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white text-center shadow-xl">
                                    <p className="text-lg font-medium opacity-90 mb-4">আমাদের সাথে যুক্ত হোন</p>
                                    <div className="bg-white p-2 rounded-lg inline-block mb-4">
                                        <QRCodeCanvas value="https://slm-web-eight.vercel.app/" size={100} />
                                    </div>
                                    <p className="text-sm opacity-75">SmartLineman Community App</p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer for all tabs */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 text-center border-t border-slate-100 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            SmartLineman Volunteer Handbook • v2.0
                        </p>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default Guide;
