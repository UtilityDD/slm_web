import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { cacheHelper } from '../../utils/cacheHelper';
import SaveSuccessModal from '../SaveSuccessModal';

const PPE_ITEMS = [
    { name: "Safety Helmet", icon: "🪖", essential: true },
    { name: "Safety Shoes/Boots", icon: "🥾", essential: true },
    { name: "Insulated Gloves", icon: "🧤", essential: true },
    { name: "Reflective Jacket", icon: "🦺", essential: true },
    { name: "Safety Belt", icon: "🧗", essential: true },
    { name: "Full Body Harness", icon: "🧗‍♂️", essential: true },
    { name: "Voltage Detector", icon: "🔌", essential: true },
    { name: "Discharge Rod", icon: "🦯", essential: true },
    { name: "Safety Goggles", icon: "🥽", essential: true },
    { name: "Raincoat", icon: "🧥", essential: false },
    { name: "Torch/Emergency Light", icon: "🔦", essential: false }
];

const TOOLS_ITEMS = [
    { name: "Pliers", icon: "🔧", essential: true },
    { name: "Screwdriver Set", icon: "🪛", essential: true },
    { name: "Wrench", icon: "🔧", essential: true },
    { name: "Hammer", icon: "🔨", essential: true },
    { name: "Tester", icon: "⚡", essential: true },
    { name: "Multimeter", icon: "📟", essential: true },
    { name: "Wire Stripper", icon: "✂️", essential: true },
    { name: "Rope", icon: "🪢", essential: true },
    { name: "Drill Machine", icon: "🔫", essential: false },
    { name: "Ladder", icon: "🪜", essential: false }
];

const EquipmentManager = React.forwardRef(({
    type = 'ppe',
    user,
    targetUserId,
    language = 'en',
    setCurrentView,
    isEditable = true,
    showCategories = true,
    showSaveButton = true,
    accentColor = null, // 'orange' or 'indigo'
    t = null // Translation object
}, ref) => {
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [checklist, setChecklist] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    React.useImperativeHandle(ref, () => ({
        save: async () => {
            await handleSave();
        }
    }));

    const activeUserId = targetUserId || user?.id;
    const itemsConfig = type === 'ppe' ? PPE_ITEMS : TOOLS_ITEMS;
    const tableName = type === 'ppe' ? 'user_ppe' : 'user_tools';
    const finalAccentColor = accentColor || (type === 'ppe' ? 'orange' : 'indigo');

    // Helper to get translated name
    const getTranslatedName = (name) => {
        if (!t) return name;
        if (type === 'ppe') {
            return t.my_ppe?.items?.[name] || name;
        }
        return t.my_tools?.items?.[name] || name;
    };

    const themeStyles = {
        orange: {
            bg: 'bg-orange-600',
            text: 'text-orange-600',
            border: 'border-orange-600',
            bgLight: 'bg-orange-50',
            bgDark: 'dark:bg-orange-900/20',
            ring: 'focus:ring-orange-500',
            shadow: 'shadow-orange-600/20'
        },
        indigo: {
            bg: 'bg-indigo-600',
            text: 'text-indigo-600',
            border: 'border-indigo-600',
            bgLight: 'bg-indigo-50',
            bgDark: 'dark:bg-indigo-900/20',
            ring: 'focus:ring-indigo-500',
            shadow: 'shadow-indigo-600/20'
        }
    }[finalAccentColor];

    useEffect(() => {
        if (activeUserId) {
            fetchData();
        } else {
            // Guest mode: Initialize with empty but available checklist if not fetching
            const initialChecklist = itemsConfig.map(item => ({
                ...item,
                available: false,
                id: null,
                count: 1,
                condition: 'Good',
                age_months: 0,
                details: ''
            }));
            setChecklist(initialChecklist);
        }
    }, [activeUserId, type]);

    const fetchData = async () => {
        if (!activeUserId) return;
        const cacheKey = `${tableName}_${activeUserId}`;
        const cachedData = cacheHelper.get(cacheKey);

        let data = cachedData;
        if (!data) {
            setLoading(true);
            try {
                const { data: fetchedData, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('user_id', activeUserId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                data = fetchedData || [];
                cacheHelper.set(cacheKey, data, 10);
            } catch (error) {
                console.error(`Error fetching ${type}:`, error);
                data = [];
            } finally {
                setLoading(false);
            }
        }

        // Initialize checklist based on fetched data
        const initialChecklist = itemsConfig.map(item => {
            const existing = data.find(p => p.name === item.name);
            return {
                ...item,
                available: !!existing,
                id: existing?.id || null,
                count: existing?.count || 1,
                condition: existing?.condition || 'Good',
                age_months: existing?.age_months || 0,
                details: existing?.details || ''
            };
        });
        setChecklist(initialChecklist);
    };

    const handleSave = async () => {
        if (!activeUserId) return;
        setIsSaving(true);

        try {
            const itemsToUpdate = [];
            const itemsToInsert = [];
            const deleteIds = [];

            for (const item of checklist) {
                if (item.available) {
                    const payload = {
                        user_id: activeUserId,
                        name: item.name,
                        count: parseInt(item.count),
                        condition: item.condition,
                        age_months: parseInt(item.age_months),
                        details: item.details || ''
                    };

                    if (item.id) {
                        itemsToUpdate.push({ ...payload, id: item.id });
                    } else {
                        itemsToInsert.push(payload);
                    }
                } else if (item.id) {
                    deleteIds.push(item.id);
                }
            }

            if (deleteIds.length > 0) {
                const { error } = await supabase.from(tableName).delete().in('id', deleteIds);
                if (error) throw error;
            }

            if (itemsToUpdate.length > 0) {
                const { error } = await supabase.from(tableName).upsert(itemsToUpdate, { onConflict: 'id' });
                if (error) throw error;
            }

            if (itemsToInsert.length > 0) {
                const { error } = await supabase.from(tableName).insert(itemsToInsert);
                if (error) throw error;
            }

            cacheHelper.clear(`${tableName}_${activeUserId}`);
            await fetchData();
            setShowSuccessModal(true);

        } catch (error) {
            console.error(`Error saving ${type}:`, error);
            alert(language === 'en' ? 'Failed to save changes' : 'পরিবর্তন সংরক্ষণ করতে ব্যর্থ হয়েছে');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChecklistChange = (index, field, value) => {
        const updated = [...checklist];
        updated[index] = { ...updated[index], [field]: value };
        setChecklist(updated);
    };

    const EquipmentCard = ({ item, index }) => {
        const isExpanded = expandedIndex === index;
        const usage = item.details?.startsWith('Usage: Shared') ? 'Shared' : 'Personal';
        const remarks = item.details?.includes('|') ? item.details.split('|')[1].trim() : (item.details?.replace(/Usage: (Personal|Shared)\s*\|?\s*/, '') || '');

        const handleUsageChange = (newUsage) => {
            const newDetails = `Usage: ${newUsage}${remarks ? ` | ${remarks}` : ''}`;
            handleChecklistChange(index, 'details', newDetails);
        };

        const handleRemarksChange = (newRemarks) => {
            const newDetails = `Usage: ${usage}${newRemarks ? ` | ${newRemarks}` : ''}`;
            handleChecklistChange(index, 'details', newDetails);
        };

        return (
            <div className={`group relative rounded-2xl transition-all duration-300 overflow-hidden ${item.available
                ? `bg-white dark:bg-slate-800 shadow-sm border ${finalAccentColor === 'orange' ? 'border-orange-100 dark:border-orange-900/30' : 'border-indigo-100 dark:border-indigo-900/30'}`
                : 'bg-slate-50/50 dark:bg-slate-900/30 border border-transparent'}`}>

                <div onClick={() => item.available && setExpandedIndex(isExpanded ? null : index)}
                    className="p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${item.available
                            ? `${themeStyles.bgLight} ${themeStyles.text} ${themeStyles.bgDark}`
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                            {item.icon}
                        </div>
                        <div>
                            <h3 className={`font-bold text-sm ${item.available ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                                {getTranslatedName(item.name)}
                            </h3>
                            {item.available && (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] font-bold ${themeStyles.text} ${themeStyles.bgLight} ${themeStyles.bgDark} px-1.5 py-0.5 rounded uppercase`}>
                                        Qty: {item.count}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${item.condition === 'Good' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                                        item.condition === 'Fair' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'
                                        }`}>
                                        {item.condition}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {item.essential && !item.available && (
                            <span className="text-[10px] uppercase font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">Required</span>
                        )}
                        {isEditable && (
                            <input
                                type="checkbox"
                                checked={item.available}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    handleChecklistChange(index, 'available', e.target.checked);
                                    if (e.target.checked) setExpandedIndex(index);
                                }}
                                className={`w-6 h-6 rounded-lg border-slate-300 ${themeStyles.text} ${themeStyles.ring} cursor-pointer`}
                            />
                        )}
                    </div>
                </div>

                {item.available && (
                    <div className={`px-4 pb-4 space-y-4 transition-all duration-300 origin-top ${isExpanded ? 'block animate-slide-down' : 'hidden'}`}>
                        <div className="h-px bg-slate-100 dark:bg-slate-700/50 w-full" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Quantity</label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button key={n} disabled={!isEditable}
                                            onClick={() => handleChecklistChange(index, 'count', n)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${parseInt(item.count) === n
                                                ? `${themeStyles.bg} ${themeStyles.border} text-white shadow-md ${themeStyles.shadow}`
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Condition</label>
                                <select value={item.condition} disabled={!isEditable}
                                    onChange={(e) => handleChecklistChange(index, 'condition', e.target.value)}
                                    className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-${finalAccentColor}-500 disabled:opacity-70`}>
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Poor">Poor</option>
                                    <option value="Expired">Expired</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Age (Months)</label>
                            <input type="number" value={item.age_months} disabled={!isEditable}
                                onChange={(e) => handleChecklistChange(index, 'age_months', e.target.value)}
                                className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-${finalAccentColor}-500 disabled:opacity-70`} />
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Usage Type</label>
                            <div className="flex gap-2">
                                {['Personal', 'Shared'].map(t => (
                                    <button key={t} disabled={!isEditable} onClick={() => handleUsageChange(t)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${usage === t
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}>
                                        <span className="text-base">{t === 'Personal' ? '👤' : '👥'}</span>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">Additional Remarks</label>
                            <textarea value={remarks} disabled={!isEditable}
                                onChange={(e) => handleRemarksChange(e.target.value)}
                                placeholder="Note down any issues or details..."
                                className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-${finalAccentColor}-500 min-h-[60px] resize-none disabled:opacity-70`} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const missingEssentials = checklist.filter(item => item.essential && !item.available);
    const myGear = checklist.filter(item => item.available);
    const otherAvailable = checklist.filter(item => !item.essential && !item.available);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {showSaveButton && (
                <div className="sticky top-0 z-20 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm py-4 border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {language === 'en' ? `My ${type === 'ppe' ? 'PPE' : 'Tools'} Checklist` : `আমার ${type === 'ppe' ? 'পিপিই' : 'সরঞ্জাম'} চেকলিস্ট`}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {myGear.length}/{itemsConfig.length} Items • {missingEssentials.length} Missing Essentials
                        </p>
                    </div>
                    {activeUserId ? (
                        <button onClick={handleSave} disabled={isSaving}
                            className={`w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100`}>
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ) : (
                        setCurrentView && (
                            <button onClick={() => setCurrentView('login')} className={`text-sm px-3 py-1.5 ${themeStyles.bg} text-white rounded-lg`}>
                                Login
                            </button>
                        )
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-6">
                    {showCategories ? (
                        <>
                            {missingEssentials.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-100 dark:border-red-900/30">
                                    <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                        <span className="text-lg">⚠️</span> {language === 'en' ? 'Missing Essentials' : 'প্রয়োজনীয় সরঞ্জাম নেই'}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {missingEssentials.map(item => {
                                            const realIndex = checklist.findIndex(p => p.name === item.name);
                                            return <EquipmentCard key={item.name} item={item} index={realIndex} />;
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide px-1">
                                    {language === 'en' ? 'My Gear' : 'আমার সরঞ্জাম'} ({myGear.length})
                                </h3>
                                {myGear.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <p className="text-sm text-slate-500">No items added yet</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {myGear.map(item => {
                                            const realIndex = checklist.findIndex(p => p.name === item.name);
                                            return <EquipmentCard key={item.name} item={item} index={realIndex} />;
                                        })}
                                    </div>
                                )}
                            </div>

                            {otherAvailable.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide px-1">
                                        {language === 'en' ? 'Add Others' : 'অন্যান্য যোগ করুন'}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {otherAvailable.map(item => {
                                            const realIndex = checklist.findIndex(p => p.name === item.name);
                                            return (
                                                <div key={item.name} onClick={() => isEditable && handleChecklistChange(realIndex, 'available', true)}
                                                    className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors opacity-60 hover:opacity-100">
                                                    <span className="text-xl opacity-50">{item.icon}</span>
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{getTranslatedName(item.name)}</span>
                                                    {isEditable && activeUserId && <span className="ml-auto text-slate-400 text-lg">+</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {checklist.map((item, idx) => (
                                <EquipmentCard key={item.name} item={item} index={idx} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <SaveSuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} language={language} />
        </div>
    );
});

export default EquipmentManager;
