import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { cacheHelper } from '../../utils/cacheHelper';
import SaveSuccessModal from '../SaveSuccessModal';

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

const MyTools = ({ user, setCurrentView, language }) => {
    const [toolsList, setToolsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toolsChecklist, setToolsChecklist] = useState([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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
            const itemsToUpdate = [];
            const itemsToInsert = [];
            const deleteIds = [];

            for (const item of toolsChecklist) {
                const ageMonths = item.age === '<6m' ? 3 :
                    item.age === '6-12m' ? 9 :
                        item.age === '1-2y' ? 18 : 36;

                const details = `Usage: ${item.usage}`;

                if (item.available) {
                    const payload = {
                        user_id: user.id,
                        name: item.name,
                        count: parseInt(item.count),
                        condition: item.condition,
                        age_months: ageMonths,
                        details: details
                    };

                    if (item.id) {
                        // Existing item - Update
                        itemsToUpdate.push({ ...payload, id: item.id });
                    } else {
                        // New item - Insert
                        itemsToInsert.push(payload);
                    }
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

            // Perform Updates (Upsert is safe here as IDs exist)
            if (itemsToUpdate.length > 0) {
                const { error: updateError } = await supabase
                    .from('user_tools')
                    .upsert(itemsToUpdate, { onConflict: 'id' });

                if (updateError) throw updateError;
            }

            // Perform Inserts (New items only)
            if (itemsToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('user_tools')
                    .insert(itemsToInsert);

                if (insertError) throw insertError;
            }

            // Update Cache & Local State
            cacheHelper.clear(`user_tools_${user.id}`);
            await fetchTools();
            setShowSuccessModal(true);

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

    // Derived state for categorized view
    const missingEssentials = toolsChecklist.filter(item => item.essential && !item.available);
    const myTools = toolsChecklist.filter(item => item.available);
    const otherAvailable = toolsChecklist.filter(item => !item.essential && !item.available);

    const ToolCard = ({ item, index, compact = false }) => (
        <div
            className={`relative rounded-xl border transition-all duration-300 ${item.available
                ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800'
                : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'
                } ${compact ? 'p-3' : 'p-4'}`}
        >
            <div className="flex items-start gap-3">
                <div
                    onClick={() => handleChecklistChange(index, 'available', !item.available)}
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer transition-colors ${item.available
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 hover:bg-orange-50 hover:text-orange-500'
                        }`}
                >
                    {item.icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug truncate pr-6">
                            {item.name}
                        </h3>
                        <input
                            type="checkbox"
                            checked={item.available || false}
                            onChange={(e) => handleChecklistChange(index, 'available', e.target.checked)}
                            className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                        />
                    </div>

                    {item.essential && !item.available && (
                        <span className="inline-block mt-1 text-[10px] uppercase font-bold text-red-500 tracking-wide bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                            Required
                        </span>
                    )}

                    {/* Compact Details when available */}
                    {item.available && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-semibold">Count</label>
                                <select
                                    className="w-full mt-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-1"
                                    value={item.count}
                                    onChange={(e) => handleChecklistChange(index, 'count', e.target.value)}
                                >
                                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-semibold">Condition</label>
                                <select
                                    className="w-full mt-0.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-1"
                                    value={item.condition}
                                    onChange={(e) => handleChecklistChange(index, 'condition', e.target.value)}
                                >
                                    <option>Good</option>
                                    <option>Fair</option>
                                    <option>Worn</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header with Save */}
            <div className="sticky top-0 z-20 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm py-4 border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {language === 'en' ? 'My Tools Checklist' : 'আমার সরঞ্জাম চেকলিস্ট'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {myTools.length}/{TOOLS_ITEMS.length} Items • {missingEssentials.length} Missing Essentials
                    </p>
                </div>
                {!user ? (
                    <button onClick={() => setCurrentView('login')} className="text-sm px-3 py-1.5 bg-orange-600 text-white rounded-lg">
                        Login
                    </button>
                ) : (
                    <button
                        onClick={handleSaveTools}
                        disabled={isSaving}
                        className="w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        title={language === 'en' ? 'Save Changes' : 'পরিবর্তন সংরক্ষণ করুন'}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="space-y-6">
                    {/* Section 1: Missing Essentials (If any) */}
                    {missingEssentials.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-100 dark:border-red-900/30">
                            <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <span className="text-lg">⚠️</span> {language === 'en' ? 'Missing Essentials' : 'প্রয়োজনীয় সরঞ্জাম নেই'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {missingEssentials.map(item => {
                                    const realIndex = toolsChecklist.findIndex(p => p.name === item.name);
                                    return <ToolCard key={item.name} item={item} index={realIndex} />;
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section 2: My Tools */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide px-1">
                            {language === 'en' ? 'My Tools' : 'আমার সরঞ্জাম'} ({myTools.length})
                        </h3>
                        {myTools.length === 0 ? (
                            <div className="text-center py-8 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                <p className="text-sm text-slate-500">No items added yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {myTools.map(item => {
                                    const realIndex = toolsChecklist.findIndex(p => p.name === item.name);
                                    return <ToolCard key={item.name} item={item} index={realIndex} />;
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Add More Items */}
                    {otherAvailable.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide px-1">
                                {language === 'en' ? 'Add Others' : 'অন্যান্য যোগ করুন'}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {otherAvailable.map(item => {
                                    const realIndex = toolsChecklist.findIndex(p => p.name === item.name);
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={() => handleChecklistChange(realIndex, 'available', true)}
                                            className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors opacity-60 hover:opacity-100"
                                        >
                                            <span className="text-xl opacity-50">{item.icon}</span>
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{item.name}</span>
                                            <span className="ml-auto text-slate-400 text-lg">+</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <SaveSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                language={language}
            />
        </div>
    );
};

export default MyTools;
