import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { cacheHelper } from '../../utils/cacheHelper';

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

const MyPPE = ({ user, setCurrentView, language }) => {
    const [ppeList, setPpeList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [ppeChecklist, setPpeChecklist] = useState([]);

    useEffect(() => {
        if (user) {
            fetchPPE();
        }
    }, [user]);

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
        if (!user) {
            setCurrentView('login');
            return;
        }
        setIsSaving(true);

        try {
            // Prepare data for batch operations
            const upsertItems = [];
            const deleteIds = [];

            for (const item of ppeChecklist) {
                const ageMonths = item.age === '<6m' ? 3 :
                    item.age === '6-12m' ? 9 :
                        item.age === '1-2y' ? 18 : 36;

                const details = `Usage: ${item.usage}`;

                if (item.available) {
                    // Prepare for upsert (handles both insert and update)
                    upsertItems.push({
                        id: item.id || undefined, // Include ID for updates, undefined for inserts
                        user_id: user.id,
                        name: item.name,
                        count: parseInt(item.count),
                        condition: item.condition,
                        age_months: ageMonths,
                        details: details
                    });
                } else if (item.id) {
                    // Collect IDs for deletion
                    deleteIds.push(item.id);
                }
            }

            // Perform Deletions
            if (deleteIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('user_ppe')
                    .delete()
                    .in('id', deleteIds);

                if (deleteError) throw deleteError;
            }

            // Perform Upserts
            if (upsertItems.length > 0) {
                const { error: upsertError } = await supabase
                    .from('user_ppe')
                    .upsert(upsertItems, { onConflict: 'id' }); // Supposing 'id' is unique, or rely on another constraint if needed. 
                // Note: If id is undefined, Supabase will insert. If id is present, it updates.

                if (upsertError) throw upsertError;
            }

            // Update Cache & Local State
            cacheHelper.clear(`user_ppe_${user.id}`);
            await fetchPPE();
            alert(language === 'en' ? 'PPE list updated successfully!' : 'পিপিই তালিকা সফলভাবে আপডেট করা হয়েছে!');

        } catch (error) {
            console.error('Error saving PPE:', error);
            alert(language === 'en' ? 'Failed to save changes' : 'পরিবর্তন সংরক্ষণ করতে ব্যর্থ হয়েছে');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChecklistChange = (index, field, value) => {
        const updated = [...ppeChecklist];
        updated[index] = { ...updated[index], [field]: value };
        setPpeChecklist(updated);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {language === 'en' ? 'My PPE Checklist' : 'আমার পিপিই চেকলিস্ট'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {language === 'en' ? 'Select the items you currently have' : 'আপনার কাছে বর্তমানে থাকা সরঞ্জামগুলি নির্বাচন করুন'}
                    </p>
                </div>
                {!user ? (
                    <button
                        onClick={() => setCurrentView('login')}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                    >
                        {language === 'en' ? 'Login to Save' : 'সংরক্ষণ করতে লগইন করুন'}
                    </button>
                ) : (
                    <button
                        onClick={handleSavePPE}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {language === 'en' ? 'Saving...' : 'সংরক্ষণ হচ্ছে...'}
                            </>
                        ) : (
                            <>
                                <span>💾</span>
                                {language === 'en' ? 'Save Changes' : 'পরিবর্তন সংরক্ষণ করুন'}
                            </>
                        )}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ppeChecklist.map((item, index) => (
                        <div
                            key={item.name}
                            className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${item.available
                                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10 shadow-md ring-1 ring-orange-500/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-200 dark:hover:border-orange-800 opacity-75 hover:opacity-100'
                                }`}
                        >
                            {/* Selection Checkbox */}
                            <div className="absolute top-4 right-4 z-10">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={item.available || false}
                                        onChange={(e) => handleChecklistChange(index, 'available', e.target.checked)}
                                        className="peer sr-only"
                                        id={`checkbox-${index}`}
                                    />
                                    <label
                                        htmlFor={`checkbox-${index}`}
                                        className={`block w-6 h-6 rounded-md border-2 transition-all cursor-pointer ${item.available
                                            ? 'bg-orange-500 border-orange-500'
                                            : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-orange-400'
                                            }`}
                                    >
                                        <svg className={`w-full h-full text-white transform transition-transform ${item.available ? 'scale-100' : 'scale-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mb-4 pr-10">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl shadow-sm transition-colors ${item.available ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                    {item.icon}
                                </div>
                                <h3 className={`font-bold text-lg leading-tight ${item.available ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {item.name}
                                </h3>
                            </div>

                            {/* Details Form - Slide Down */}
                            <div className={`space-y-3 overflow-hidden transition-all duration-300 ${item.available ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Count</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.count}
                                            onChange={(e) => handleChecklistChange(index, 'count', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Condition</label>
                                        <select
                                            value={item.condition}
                                            onChange={(e) => handleChecklistChange(index, 'condition', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all shadow-sm"
                                        >
                                            <option>Good</option>
                                            <option>Worn</option>
                                            <option>Damaged</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Age</label>
                                        <select
                                            value={item.age}
                                            onChange={(e) => handleChecklistChange(index, 'age', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all shadow-sm"
                                        >
                                            <option>{'<'}6m</option>
                                            <option>6-12m</option>
                                            <option>1-2y</option>
                                            <option>{'>'}2y</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Usage</label>
                                        <select
                                            value={item.usage}
                                            onChange={(e) => handleChecklistChange(index, 'usage', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all shadow-sm"
                                        >
                                            <option>Personal</option>
                                            <option>Team</option>
                                            <option>Spare</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyPPE;
