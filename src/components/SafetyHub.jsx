import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';

const PPESkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
                <div className="space-y-2 mb-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
            </div>
        ))}
    </div>
);

export default function SafetyHub({ language = 'en', user, setCurrentView }) {
    const [activeTab, setActiveTab] = useState('protocols');
    const [ppeList, setPpeList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newItem, setNewItem] = useState({
        name: '',
        age_months: '',
        condition: 'Good',
        details: '',
        count: 1
    });
    const [ppeChecklist, setPpeChecklist] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [currentRuleIndex, setCurrentRuleIndex] = useState(0);

    const SAFETY_RULES = [
        {
            title: language === 'en' ? "PPE Compliance" : "পিপিই কমপ্লায়েন্স",
            rule: language === 'en' ? "Always wear your safety helmet, shoes, and reflective jacket before entering the site." : "সাইটে প্রবেশের আগে সর্বদা আপনার সুরক্ষা হেলমেট, জুতো এবং প্রতিফলিত জ্যাকেট পরুন।",
            icon: "🦺",
            color: "from-orange-500 to-orange-600"
        },
        {
            title: language === 'en' ? "Climbing Safety" : "আরোহণের নিরাপত্তা",
            rule: language === 'en' ? "Double-check your safety harness and belt for any signs of wear or damage before climbing." : "আরোহণের আগে আপনার সুরক্ষা হারনেস এবং বেল্ট কোনও পরিধান বা ক্ষতির চিহ্নের জন্য দুবার পরীক্ষা করুন।",
            icon: "🧗",
            color: "from-blue-500 to-blue-600"
        },
        {
            title: language === 'en' ? "Electrical Hazard" : "বৈদ্যুতিক বিপদ",
            rule: language === 'en' ? "Maintain a minimum safe distance from high-voltage lines and always use insulated tools." : "উচ্চ-ভোল্টেজ লাইন থেকে ন্যূনতম নিরাপদ দূরত্ব বজায় রাখুন এবং সর্বদা ইনসুলেটেড সরঞ্জাম ব্যবহার করুন।",
            icon: "⚡",
            color: "from-red-500 to-red-600"
        },
        {
            title: language === 'en' ? "Tool Inspection" : "সরঞ্জাম পরিদর্শন",
            rule: language === 'en' ? "Inspect all tools and equipment for defects before use. Damaged tools must be reported immediately." : "ব্যবহারের আগে ত্রুটির জন্য সমস্ত সরঞ্জাম এবং সরঞ্জাম পরিদর্শন করুন। ক্ষতিগ্রস্ত সরঞ্জাম অবিলম্বে রিপোর্ট করা আবশ্যক।",
            icon: "🔧",
            color: "from-green-500 to-green-600"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentRuleIndex((prev) => (prev + 1) % SAFETY_RULES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [SAFETY_RULES.length]);

    const nextRule = () => {
        setCurrentRuleIndex((prev) => (prev + 1) % SAFETY_RULES.length);
    };

    const prevRule = () => {
        setCurrentRuleIndex((prev) => (prev - 1 + SAFETY_RULES.length) % SAFETY_RULES.length);
    };

    const PPE_ITEMS = [
        { name: "Safety Helmet", icon: "🪖" },
        { name: "Safety Shoes/Boots", icon: "🥾" },
        { name: "Insulated Gloves", icon: "🧤" },
        { name: "Reflective Jacket", icon: "🦺" },
        { name: "Safety Belt", icon: "🧗" },
        { name: "Full Body Harness", icon: "🧗‍♂️" },
        { name: "Voltage Detector", icon: "🔌" },
        { name: "Discharge Rod", icon: "🦯" },
        { name: "Safety Goggles", icon: "🥽" },
        { name: "Raincoat", icon: "🧥" },
        { name: "Torch/Emergency Light", icon: "🔦" }
    ];

    useEffect(() => {
        if (activeTab === 'my_ppe' && user) {
            fetchPPE();
        }
    }, [activeTab, user]);

    const fetchPPE = async () => {
        if (!user) return;
        const cacheKey = `user_ppe_${user.id}`;
        const cachedPPE = cacheHelper.get(cacheKey);

        let data = cachedPPE;
        if (!data) {
            setLoading(true);
            try {
                const { data: fetchedData, error } = await supabase
                    .from('user_ppe')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                data = fetchedData || [];
                cacheHelper.set(cacheKey, data, 10);
            } catch (error) {
                console.error('Error fetching PPE:', error);
                data = [];
            } finally {
                setLoading(false);
            }
        }

        setPpeList(data);

        // Initialize checklist based on fetched data
        const checklist = PPE_ITEMS.map(item => {
            const existing = data.find(p => p.name === item.name);
            return {
                ...item,
                available: !!existing,
                id: existing?.id || null,
                count: existing?.count || 1,
                condition: existing?.condition || 'Good',
                age: existing?.age_months ?
                    (existing.age_months <= 6 ? '<6m' :
                        existing.age_months <= 12 ? '6-12m' :
                            existing.age_months <= 24 ? '1-2y' : '>2y') : '<6m',
                usage: existing?.details?.includes('Usage:') ?
                    existing.details.split('Usage:')[1].trim() : 'Personal'
            };
        });
        setPpeChecklist(checklist);
    };

    const handleSavePPE = async () => {
        if (!user) return;
        setIsSaving(true);

        try {
            for (const item of ppeChecklist) {
                const ageMonths = item.age === '<6m' ? 3 :
                    item.age === '6-12m' ? 9 :
                        item.age === '1-2y' ? 18 : 36;

                const details = `Usage: ${item.usage}`;

                if (item.available) {
                    if (item.id) {
                        // Update
                        await supabase.from('user_ppe').update({
                            count: parseInt(item.count),
                            condition: item.condition,
                            age_months: ageMonths,
                            details: details
                        }).eq('id', item.id);
                    } else {
                        // Insert
                        await supabase.from('user_ppe').insert([{
                            user_id: user.id,
                            name: item.name,
                            count: parseInt(item.count),
                            condition: item.condition,
                            age_months: ageMonths,
                            details: details
                        }]);
                    }
                } else if (item.id) {
                    // Delete if it was available but now unchecked
                    await supabase.from('user_ppe').delete().eq('id', item.id);
                }
            }

            cacheHelper.clear(`user_ppe_${user.id}`);
            await fetchPPE();
            alert('PPE Status updated successfully!');
        } catch (error) {
            console.error('Error saving PPE:', error);
            alert('Failed to save PPE status');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChecklistChange = (index, field, value) => {
        const updated = [...ppeChecklist];
        updated[index] = { ...updated[index], [field]: value };
        setPpeChecklist(updated);
    };

    const handleEditPPE = (item) => {
        setNewItem({
            name: item.name,
            age_months: item.age_months,
            condition: item.condition,
            details: item.details,
            count: item.count
        });
        setEditingId(item.id);
        setShowAddModal(true);
    };

    const handleDeletePPE = async (id) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        try {
            const { error } = await supabase
                .from('user_ppe')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Clear PPE cache
            cacheHelper.clear(`user_ppe_${user.id}`);

            fetchPPE();
        } catch (error) {
            console.error('Error deleting PPE:', error);
        }
    };

    const t = {
        en: {
            title: "Safety Hub",
            subtitle: "Your comprehensive resource for safety protocols, training, and compliance.",
            tabs: {
                protocols: "Protocols",
                training: "Training Zone",
                my_ppe: "My PPE",
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
            my_ppe: {
                title: "My Personal Protective Equipment",
                desc: "Track and manage your essential safety gear.",
                addBtn: "Add New PPE",
                editBtn: "Edit PPE",
                empty: "No PPE items added yet.",
                fields: {
                    name: "Item Name",
                    count: "Quantity",
                    age: "Age (Months)",
                    age: "Age (Months)",
                    condition: "Condition",
                    details: "Details / Specs"
                },
                conditions: {
                    Good: "Good",
                    Fair: "Fair",
                    Damaged: "Damaged",
                    Expired: "Expired"
                }
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
                my_ppe: "আমার পিপিই",
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
            my_ppe: {
                title: "আমার ব্যক্তিগত সুরক্ষা সরঞ্জাম",
                desc: "আপনার প্রয়োজনীয় নিরাপত্তা সরঞ্জাম ট্র্যাক এবং পরিচালনা করুন।",
                addBtn: "নতুন পিপিই যোগ করুন",
                editBtn: "পিপিই সম্পাদনা করুন",
                empty: "এখনও কোন পিপিই যোগ করা হয়নি।",
                fields: {
                    name: "আইটেমের নাম",
                    count: "পরিমাণ",
                    age: "বয়স (মাস)",
                    age: "বয়স (মাস)",
                    condition: "অবস্থা",
                    details: "বিবরণ"
                },
                conditions: {
                    Good: "ভালো",
                    Fair: "মোটামুটি",
                    Damaged: "ক্ষতিগ্রস্ত",
                    Expired: "মেয়াদোত্তীর্ণ"
                }
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



    return (
        <div className="compact-container py-6 sm:py-10 mb-20">
            {/* Header Section */}
            <div className="mb-8 text-center">
                <div className="inline-block p-2.5 rounded-full bg-orange-100 text-orange-600 text-2xl mb-3">
                    🦺
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {language === 'en' ? (
                        <>Safety <span className="text-orange-600">Hub</span></>
                    ) : (
                        <>{t.title}</>
                    )}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                    {t.subtitle}
                </p>
            </div>

            {/* Navigation Tabs - Compact */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['protocols', 'training', 'my_ppe', 'report'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                            ? 'bg-orange-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-orange-50 border border-slate-200 dark:border-slate-600'
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
                        {/* Highlighted Safety Rule Carousel - Refined */}
                        <div className={`md:col-span-2 bg-gradient-to-br ${SAFETY_RULES[currentRuleIndex].color} rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden shadow-xl transition-all duration-700 ease-in-out border border-white/10`}>
                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">
                                            Safety Protocol
                                        </span>
                                        <div className="flex gap-1.5">
                                            {SAFETY_RULES.map((_, i) => (
                                                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentRuleIndex ? 'bg-white w-6' : 'bg-white/30 w-2'}`}></div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={prevRule}
                                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10 transition-all active:scale-90"
                                            aria-label="Previous rule"
                                        >
                                            <span className="text-xl">←</span>
                                        </button>
                                        <button
                                            onClick={nextRule}
                                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10 transition-all active:scale-90"
                                            aria-label="Next rule"
                                        >
                                            <span className="text-xl">→</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="max-w-3xl">
                                    <h2 className="text-2xl sm:text-3xl font-black mb-4 tracking-tight leading-tight">
                                        {SAFETY_RULES[currentRuleIndex].title}
                                    </h2>
                                    <p className="text-white/90 text-base sm:text-lg leading-relaxed font-medium">
                                        {SAFETY_RULES[currentRuleIndex].rule}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Protocol Categories - Compact */}
                        {t.protocols.categories.map((category, index) => (
                            <div key={index} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                        {index === 0 ? '⚡' : index === 1 ? '🔧' : index === 2 ? '⛈️' : '🩹'}
                                    </div>
                                    <span className="text-slate-400">→</span>
                                </div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-0.5">{category}</h3>
                                <p className="text-xs text-slate-500">12 Guidelines</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'training' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="material-card elevation-2 overflow-hidden group ripple-dark">
                                <div className="relative h-48 bg-slate-200">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xl cursor-pointer hover:scale-110 transition-transform">
                                            ▶
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                        12:45
                                    </div>
                                </div>
                                <div className="p-5">
                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Safety</span>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mt-2 mb-1 group-hover:text-orange-600 transition-colors">
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

                {activeTab === 'my_ppe' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.my_ppe.title}</h2>
                                <p className="text-xs text-slate-500 mt-1">{t.my_ppe.desc}</p>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <div className="p-8 text-center text-slate-400">Loading PPE list...</div>
                                ) : (
                                    ppeChecklist.map((item, idx) => (
                                        <div key={item.name} className={`p-3 sm:p-4 transition-colors ${item.available ? 'bg-orange-50/30 dark:bg-orange-900/10' : ''}`}>
                                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                                {/* Availability Checkbox */}
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.available}
                                                        onChange={(e) => handleChecklistChange(idx, 'available', e.target.checked)}
                                                        className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                                    />
                                                </div>

                                                {/* Icon & Name */}
                                                <div className="flex items-center gap-2 min-w-[140px] flex-1">
                                                    <span className="text-xl">{item.icon}</span>
                                                    <span className={`text-sm font-bold ${item.available ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                                                        {item.name}
                                                    </span>
                                                </div>

                                                {/* Compact Fields - Only show if available */}
                                                {item.available && (
                                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 ml-8 sm:ml-0">
                                                        {/* Qty */}
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400">Qty</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.count}
                                                                onChange={(e) => handleChecklistChange(idx, 'count', e.target.value)}
                                                                className="w-12 px-1 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                            />
                                                        </div>

                                                        {/* Quality */}
                                                        <select
                                                            value={item.condition}
                                                            onChange={(e) => handleChecklistChange(idx, 'condition', e.target.value)}
                                                            className="text-xs px-1 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                        >
                                                            <option value="Good">Good</option>
                                                            <option value="Fair">Fair</option>
                                                            <option value="Damaged">Damaged</option>
                                                        </select>

                                                        {/* Age */}
                                                        <select
                                                            value={item.age}
                                                            onChange={(e) => handleChecklistChange(idx, 'age', e.target.value)}
                                                            className="text-xs px-1 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                        >
                                                            <option value="<6m">&lt;6m</option>
                                                            <option value="6-12m">6-12m</option>
                                                            <option value="1-2y">1-2y</option>
                                                            <option value=">2y">&gt;2y</option>
                                                        </select>

                                                        {/* Usage */}
                                                        <select
                                                            value={item.usage}
                                                            onChange={(e) => handleChecklistChange(idx, 'usage', e.target.value)}
                                                            className="text-xs px-1 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                                        >
                                                            <option value="Personal">Personal</option>
                                                            <option value="Shared">Shared</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                                <button
                                    onClick={handleSavePPE}
                                    disabled={isSaving || !user}
                                    className={`px-10 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 dark:shadow-none'}`}
                                >
                                    {isSaving ? 'Saving...' : 'Update PPE Status'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'report' && (
                    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-600 p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                ⚠️
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.report.title}</h2>
                            <p className="text-slate-600 dark:text-slate-400">{t.report.desc}</p>
                        </div>

                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.location}</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-orange-500" placeholder="e.g. Sector 5, Pole 24" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.type}</label>
                                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-orange-500 bg-white dark:bg-slate-800">
                                        <option>Damaged Pole</option>
                                        <option>Loose Wire</option>
                                        <option>Sparking</option>
                                        <option>Tree Branch</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">{t.report.form.desc}</label>
                                <textarea rows="4" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-orange-500" placeholder="Describe the issue..."></textarea>
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
