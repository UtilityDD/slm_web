import React, { useState } from 'react';

export default function SafetyHub({ language = 'en' }) {
    const [activeTab, setActiveTab] = useState('protocols');
    const [checklist, setChecklist] = useState({
        helmet: false,
        gloves: false,
        boots: false,
        belt: false,
        tester: false
    });

    const t = {
        en: {
            title: "Safety Hub",
            subtitle: "Your comprehensive resource for safety protocols, training, and compliance.",
            tabs: {
                protocols: "Protocols",
                training: "Training Zone",
                checklist: "Daily Checklist",
                report: "Report Incident"
            },
            protocols: {
                title: "Standard Operating Procedures",
                desc: "Official WBSEDCL safety guidelines for all operations.",
                categories: ["High Voltage", "Maintenance", "Storm Safety", "First Aid"]
            },
            training: {
                title: "Video Training Library",
                desc: "Watch expert tutorials to upgrade your skills.",
                watch: "Watch Now"
            },
            checklist: {
                title: "Pre-Work Safety Check",
                desc: "Ensure you have all necessary PPE before starting your shift.",
                items: {
                    helmet: "Safety Helmet",
                    gloves: "Insulated Gloves",
                    boots: "Safety Boots",
                    belt: "Safety Belt/Harness",
                    tester: "Voltage Tester"
                },
                submit: "Submit Checklist",
                submitted: "Checklist Submitted!"
            },
            report: {
                title: "Report a Hazard",
                desc: "See something unsafe? Report it immediately.",
                form: {
                    location: "Location",
                    type: "Hazard Type",
                    desc: "Description",
                    photo: "Upload Photo",
                    submit: "Submit Report"
                }
            }
        },
        bn: {
            title: "সেফটি হাব",
            subtitle: "নিরাপত্তা প্রোটোকল, প্রশিক্ষণ এবং কমপ্লায়েন্সের জন্য আপনার সম্পূর্ণ গাইড।",
            tabs: {
                protocols: "প্রোটোকল",
                training: "প্রশিক্ষণ জোন",
                checklist: "দৈনিক চেকলিস্ট",
                report: "রিপোর্ট করুন"
            },
            protocols: {
                title: "স্ট্যান্ডার্ড অপারেটিং প্রসিডিউর (SOP)",
                desc: "সমস্ত অপারেশনের জন্য অফিসিয়াল WBSEDCL নিরাপত্তা নির্দেশিকা।",
                categories: ["উচ্চ ভোল্টেজ", "রক্ষণাবেক্ষণ", "ঝড় নিরাপত্তা", "প্রাথমিক চিকিৎসা"]
            },
            training: {
                title: "ভিডিও প্রশিক্ষণ লাইব্রেরি",
                desc: "আপনার দক্ষতা বাড়াতে বিশেষজ্ঞ টিউটোরিয়াল দেখুন।",
                watch: "এখন দেখুন"
            },
            checklist: {
                title: "কাজের আগে নিরাপত্তা পরীক্ষা",
                desc: "শিফট শুরু করার আগে আপনার সমস্ত প্রয়োজনীয় পিপিই আছে কিনা নিশ্চিত করুন।",
                items: {
                    helmet: "সেফটি হেলমেট",
                    gloves: "ইনসুলেটেড গ্লাভস",
                    boots: "সেফটি বুট",
                    belt: "সেফটি বেল্ট/হারনেস",
                    tester: "ভোল্টেজ টেস্টার"
                },
                submit: "চেকলিস্ট জমা দিন",
                submitted: "চেকলিস্ট জমা দেওয়া হয়েছে!"
            },
            report: {
                title: "বিপদ রিপোর্ট করুন",
                desc: "অনিরাপদ কিছু দেখছেন? অবিলম্বে রিপোর্ট করুন।",
                form: {
                    location: "অবস্থান",
                    type: "বিপদের ধরন",
                    desc: "বিবরণ",
                    photo: "ছবি আপলোড করুন",
                    submit: "রিপোর্ট জমা দিন"
                }
            }
        }
    }[language];

    const toggleChecklist = (item) => {
        setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-8 text-center">
                <div className="inline-block p-3 rounded-full bg-orange-100 text-orange-600 text-3xl mb-4">
                    🦺
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                    {language === 'en' ? (
                        <>Safety <span className="text-orange-600">Hub</span></>
                    ) : (
                        <>{t.title}</>
                    )}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    {t.subtitle}
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
                {['protocols', 'training', 'checklist', 'report'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-orange-50 border border-slate-200'
                            }`}
                    >
                        {t.tabs[tab]}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="animate-slide-down">
                {activeTab === 'protocols' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Featured Protocol */}
                        <div className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold mb-2">{t.protocols.title}</h2>
                                <p className="text-orange-100 mb-6 max-w-xl">{t.protocols.desc}</p>
                                <div className="flex gap-4">
                                    <button className="px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all">
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Protocol Categories */}
                        {t.protocols.categories.map((category, index) => (
                            <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        {index === 0 ? '⚡' : index === 1 ? '🔧' : index === 2 ? '⛈️' : '🩹'}
                                    </div>
                                    <span className="text-slate-400">→</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 mb-1">{category}</h3>
                                <p className="text-sm text-slate-500">12 Guidelines</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'training' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                                <div className="relative h-48 bg-slate-200">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xl cursor-pointer hover:scale-110 transition-transform">
                                            ▶
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                        12:45
                                    </div>
                                </div>
                                <div className="p-5">
                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Safety</span>
                                    <h3 className="font-bold text-lg text-slate-900 mt-2 mb-1 group-hover:text-orange-600 transition-colors">
                                        {language === 'en' ? "Proper Use of Safety Harness" : "সেফটি হারনেস এর সঠিক ব্যবহার"}
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Learn how to inspect and wear your safety harness correctly before climbing.
                                    </p>
                                    <button className="text-sm font-bold text-orange-600 hover:text-orange-700">
                                        {t.training.watch} →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'checklist' && (
                    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.checklist.title}</h2>
                            <p className="text-slate-600">{t.checklist.desc}</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            {Object.entries(t.checklist.items).map(([key, label]) => (
                                <label key={key} className="flex items-center p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                                    <input
                                        type="checkbox"
                                        checked={checklist[key]}
                                        onChange={() => toggleChecklist(key)}
                                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                    />
                                    <span className="ml-4 font-medium text-slate-700">{label}</span>
                                </label>
                            ))}
                        </div>

                        <button className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md">
                            {t.checklist.submit}
                        </button>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                ⚠️
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.report.title}</h2>
                            <p className="text-slate-600">{t.report.desc}</p>
                        </div>

                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.location}</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" placeholder="e.g. Sector 5, Pole 24" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.type}</label>
                                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 bg-white">
                                        <option>Damaged Pole</option>
                                        <option>Loose Wire</option>
                                        <option>Sparking</option>
                                        <option>Tree Branch</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.desc}</label>
                                <textarea rows="4" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500" placeholder="Describe the issue..."></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.photo}</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-all cursor-pointer">
                                    <span className="text-2xl block mb-2">📷</span>
                                    <span className="text-sm text-slate-500">Click to upload or take photo</span>
                                </div>
                            </div>

                            <button type="button" className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md">
                                {t.report.form.submit}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
