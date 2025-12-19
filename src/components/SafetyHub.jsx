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

    const PPE_ITEMS = [
        "Safety Helmet", "Safety Shoes/Boots", "Insulated Gloves",
        "Reflective Jacket", "Safety Belt", "Full Body Harness",
        "Voltage Detector", "Discharge Rod",
        "Safety Goggles", "Raincoat", "Torch/Emergency Light"
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
        if (cachedPPE) {
            setPpeList(cachedPPE);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_ppe')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPpeList(data || []);
            cacheHelper.set(cacheKey, data || [], 10); // Cache for 10 mins
        } catch (error) {
            console.error('Error fetching PPE:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePPE = async (e) => {
        e.preventDefault();
        if (!user) return;

        try {
            if (editingId) {
                // Update existing item
                const { error } = await supabase
                    .from('user_ppe')
                    .update({
                        name: newItem.name,
                        age_months: parseInt(newItem.age_months) || 0,
                        condition: newItem.condition,
                        details: newItem.details,
                        count: parseInt(newItem.count) || 1
                    })
                    .eq('id', editingId);

                if (error) throw error;
            } else {
                // Add new item
                const { error } = await supabase
                    .from('user_ppe')
                    .insert([{
                        user_id: user.id,
                        name: newItem.name,
                        age_months: parseInt(newItem.age_months) || 0,
                        condition: newItem.condition,
                        details: newItem.details,
                        count: parseInt(newItem.count) || 1
                    }]);

                if (error) throw error;
            }

            // Clear PPE cache
            cacheHelper.clear(`user_ppe_${user.id}`);

            setShowAddModal(false);
            setNewItem({ name: '', age_months: '', condition: 'Good', details: '', count: 1 });
            setEditingId(null);
            fetchPPE();
        } catch (error) {
            console.error('Error saving PPE:', error);
            alert('Failed to save item');
        }
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-8 text-center">
                <div className="inline-block p-3 rounded-full bg-orange-100 text-orange-600 text-3xl mb-4">
                    🦺
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {language === 'en' ? (
                        <>Safety <span className="text-orange-600">Hub</span></>
                    ) : (
                        <>{t.title}</>
                    )}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    {t.subtitle}
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
                {['protocols', 'training', 'my_ppe', 'report'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab
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
                        {/* Featured Protocol */}
                        <div className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white dark:bg-slate-800/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold mb-2">{t.protocols.title}</h2>
                                <p className="text-orange-100 mb-6 max-w-xl">{t.protocols.desc}</p>
                                <div className="flex gap-4">
                                    <button className="px-6 py-3 bg-white dark:bg-slate-800 text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all">
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Protocol Categories */}
                        {t.protocols.categories.map((category, index) => (
                            <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                        {index === 0 ? '⚡' : index === 1 ? '🔧' : index === 2 ? '⛈️' : '🩹'}
                                    </div>
                                    <span className="text-slate-400">→</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">{category}</h3>
                                <p className="text-sm text-slate-500">12 Guidelines</p>
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
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.my_ppe.title}</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">{t.my_ppe.desc}</p>

                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setNewItem({ name: '', age_months: '', condition: 'Good', details: '', count: 1 });
                                    user ? setShowAddModal(true) : setCurrentView('login');
                                }}
                                className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-md flex items-center gap-2 mx-auto"
                            >
                                <span>+</span> {t.my_ppe.addBtn}
                            </button>
                        </div>

                        {loading ? (
                            <PPESkeleton />
                        ) : ppeList.length === 0 ? (
                            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-600 border-dashed">
                                <div className="text-4xl mb-4">📭</div>
                                <p className="text-slate-500">{t.my_ppe.empty}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ppeList.map((item) => (
                                    <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{item.name}</h3>
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.condition === 'Good' ? 'bg-green-100 text-green-700' :
                                                item.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {t.my_ppe.conditions[item.condition] || item.condition}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400 mb-3">
                                            {item.count > 1 && <p><span className="font-semibold text-slate-400">{t.my_ppe.fields.count}:</span> {item.count}</p>}
                                            <p><span className="font-semibold text-slate-400">{t.my_ppe.fields.age}:</span> {item.age_months}</p>
                                            {item.details && <p><span className="font-semibold text-slate-400">Details:</span> {item.details}</p>}
                                        </div>
                                        <div className="absolute bottom-4 right-4 flex gap-2">
                                            <button
                                                onClick={() => handleEditPPE(item)}
                                                className="text-slate-300 hover:text-blue-500"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeletePPE(item.id)}
                                                className="text-slate-300 hover:text-red-500"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Modal */}
                        {showAddModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 animate-scale-in">
                                    <h3 className="text-xl font-bold mb-4">{editingId ? t.my_ppe.editBtn : t.my_ppe.addBtn}</h3>
                                    <form onSubmit={handleSavePPE} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.my_ppe.fields.name}</label>
                                            <select
                                                required
                                                value={newItem.name}
                                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-slate-800"
                                            >
                                                <option value="">Select PPE</option>
                                                {PPE_ITEMS.map(item => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">{t.my_ppe.fields.count}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={newItem.count}
                                                    onChange={e => setNewItem({ ...newItem, count: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">{t.my_ppe.fields.age}</label>
                                                <input
                                                    type="number"
                                                    value={newItem.age_months}
                                                    onChange={e => setNewItem({ ...newItem, age_months: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">{t.my_ppe.fields.condition}</label>
                                                <select
                                                    value={newItem.condition}
                                                    onChange={e => setNewItem({ ...newItem, condition: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-slate-800"
                                                >
                                                    <option value="Good">Good</option>
                                                    <option value="Fair">Fair</option>
                                                    <option value="Damaged">Damaged</option>
                                                    <option value="Expired">Expired</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.my_ppe.fields.details}</label>
                                            <textarea
                                                rows="2"
                                                value={newItem.details}
                                                onChange={e => setNewItem({ ...newItem, details: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                                            ></textarea>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddModal(false)}
                                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
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
