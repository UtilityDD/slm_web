import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { cacheHelper } from '../../utils/cacheHelper';

const TOOLS_ITEMS = [
    { name: "Pliers", icon: "🔧" },
    { name: "Screwdriver Set", icon: "🪛" },
    { name: "Wrench", icon: "🔧" },
    { name: "Hammer", icon: "🔨" },
    { name: "Tester", icon: "⚡" },
    { name: "Multimeter", icon: "📟" },
    { name: "Wire Stripper", icon: "✂️" },
    { name: "Drill Machine", icon: "🔫" },
    { name: "Ladder", icon: "🪜" },
    { name: "Rope", icon: "🪢" }
];

const MyTools = ({ user, setCurrentView, language }) => {
    const [toolsList, setToolsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toolsChecklist, setToolsChecklist] = useState([]);

    useEffect(() => {
        if (user) {
            fetchTools();
        }
    }, [user]);

    const fetchTools = async () => {
        if (!user) return;
        const cacheKey = `user_tools_${user.id}`;
        const cachedTools = cacheHelper.get(cacheKey);

        let data = cachedTools;
        if (!data) {
            setLoading(true);
            try {
                const { data: fetchedData, error } = await supabase
                    .from('user_tools')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                data = fetchedData || [];
                cacheHelper.set(cacheKey, data, 10);
            } catch (error) {
                console.error('Error fetching Tools:', error);
                data = [];
            } finally {
                setLoading(false);
            }
        }

        setToolsList(data);

        // Initialize checklist based on fetched data
        const checklist = TOOLS_ITEMS.map(item => {
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
        setToolsChecklist(checklist);
    };

    const handleSaveTools = async () => {
        if (!user) {
            setCurrentView('login');
            return;
        }
        setIsSaving(true);

        try {
            // Prepare data for batch operations
            const upsertItems = [];
            const deleteIds = [];

            for (const item of toolsChecklist) {
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
                    .from('user_tools')
                    .delete()
                    .in('id', deleteIds);

                if (deleteError) throw deleteError;
            }

            // Perform Upserts
            if (upsertItems.length > 0) {
                const { error: upsertError } = await supabase
                    .from('user_tools')
                    .upsert(upsertItems, { onConflict: 'id' });

                if (upsertError) throw upsertError;
            }

            // Update Cache & Local State
            cacheHelper.clear(`user_tools_${user.id}`);
            await fetchTools();
            alert(language === 'en' ? 'Tools list updated successfully!' : 'সরঞ্জাম তালিকা সফলভাবে আপডেট করা হয়েছে!');

        } catch (error) {
            console.error('Error saving Tools:', error);
            alert(language === 'en' ? 'Failed to save changes' : 'পরিবর্তন সংরক্ষণ করতে ব্যর্থ হয়েছে');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChecklistChange = (index, field, value) => {
        const updated = [...toolsChecklist];
        updated[index] = { ...updated[index], [field]: value };
        setToolsChecklist(updated);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {language === 'en' ? 'My Tools Checklist' : 'আমার সরঞ্জাম চেকলিস্ট'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {language === 'en' ? 'Select the tools available with you' : 'আপনার সাথে থাকা সরঞ্জামগুলি নির্বাচন করুন'}
                    </p>
                </div>
                {!user ? (
                    <button
                        onClick={() => setCurrentView('login')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        {language === 'en' ? 'Login to Save' : 'সংরক্ষণ করতে লগইন করুন'}
                    </button>
                ) : (
                    <button
                        onClick={handleSaveTools}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    {toolsChecklist.map((item, index) => (
                        <div
                            key={item.name}
                            className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${item.available
                                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-md ring-1 ring-indigo-500/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 opacity-75 hover:opacity-100'
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
                                        id={`tools-checkbox-${index}`}
                                    />
                                    <label
                                        htmlFor={`tools-checkbox-${index}`}
                                        className={`block w-6 h-6 rounded-md border-2 transition-all cursor-pointer ${item.available
                                            ? 'bg-indigo-500 border-indigo-500'
                                            : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                                            }`}
                                    >
                                        <svg className={`w-full h-full text-white transform transition-transform ${item.available ? 'scale-100' : 'scale-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mb-4 pr-10">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl shadow-sm transition-colors ${item.available ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
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
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Condition</label>
                                        <select
                                            value={item.condition}
                                            onChange={(e) => handleChecklistChange(index, 'condition', e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
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
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
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
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
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

export default MyTools;
