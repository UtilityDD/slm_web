import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { requestManager } from '../utils/requestManager';

const StatCard = ({ title, value, subValue, icon, color, delay }) => (
    <div
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all animate-fade-in"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{value}</h3>
                {subValue && <p className="text-xs font-medium text-slate-500 mt-1">{subValue}</p>}
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${color}`}>
                {icon}
            </div>
        </div>
    </div>
);

const ProgressBar = ({ label, percentage, color, icon }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{icon}</span>
                <span className="text-slate-600 dark:text-slate-300">{label}</span>
            </div>
            <span className="text-slate-400">{percentage}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden border border-slate-50 dark:border-slate-700">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    </div>
);

export default function AdminAnalytics({ language, userRole }) {
    if (!['admin', 'safety mitra'].includes(userRole)) {
        return <div className="p-8 text-center font-bold text-red-500">Access Restricted</div>;
    }
    const [stats, setStats] = useState({
        admins: 0,
        safetyMitras: 0,
        linemen: 0,
        avgAge: 0,
        ppeStats: [],
        toolsStats: []
    });
    const [loading, setLoading] = useState(true);

    const PPE_ITEMS = [
        { name: "Safety Helmet", icon: "🪖", color: "bg-orange-500" },
        { name: "Safety Shoes/Boots", icon: "🥾", color: "bg-orange-500" },
        { name: "Insulated Gloves", icon: "🧤", color: "bg-orange-500" },
        { name: "Reflective Jacket", icon: "🦺", color: "bg-orange-500" },
        { name: "Safety Belt", icon: "🧗", color: "bg-orange-500" },
        { name: "Voltage Detector", icon: "🔌", color: "bg-orange-500" },
        { name: "Discharge Rod", icon: "🦯", color: "bg-orange-500" }
    ];

    const TOOLS_ITEMS = [
        { name: "Pliers", icon: "🔧", color: "bg-blue-500" },
        { name: "Screwdriver Set", icon: "🪛", color: "bg-blue-500" },
        { name: "Multimeter", icon: "📟", color: "bg-blue-500" },
        { name: "Tester", icon: "⚡", color: "bg-blue-500" },
        { name: "Ladder", icon: "🪜", color: "bg-blue-500" }
    ];

    useEffect(() => {
        fetchAnalytics();
    }, []);

    async function fetchAnalytics() {
        setLoading(true);
        try {
            const data = await requestManager.fetch(
                'admin_analytics_summary',
                async () => {
                    // 1. Fetch User Counts & Ages
                    const { data: profiles, error: pError } = await supabase
                        .from('profiles')
                        .select('role, age, id');

                    if (pError) throw pError;

                    const admins = profiles.filter(p => p.role === 'admin').length;
                    const safetyMitras = profiles.filter(p => p.role === 'safety mitra').length;
                    const linemenProfiles = profiles.filter(p => p.role === 'lineman');
                    const linemen = linemenProfiles.length;

                    const totalAge = linemenProfiles.reduce((acc, p) => acc + (p.age || 0), 0);
                    const avgAge = linemen > 0 ? (totalAge / linemen).toFixed(1) : 0;

                    // 2. Fetch PPE Stats
                    const { data: ppe, error: ppeError } = await supabase.from('user_ppe').select('user_id, name');
                    if (ppeError) throw ppeError;

                    const ppeSummary = PPE_ITEMS.map(item => {
                        const uniqueHolders = new Set(
                            ppe.filter(p => p.name === item.name).map(p => p.user_id)
                        );
                        const linemenHolders = linemenProfiles.filter(lp => uniqueHolders.has(lp.id)).length;
                        const percentage = linemen > 0 ? Math.round((linemenHolders / linemen) * 100) : 0;
                        return { ...item, percentage };
                    });

                    // 3. Fetch Tools Stats
                    const { data: tools, error: tError } = await supabase.from('user_tools').select('user_id, name');
                    if (tError) throw tError;

                    const toolsSummary = TOOLS_ITEMS.map(item => {
                        const uniqueHolders = new Set(
                            tools.filter(p => p.name === item.name).map(p => p.user_id)
                        );
                        const linemenHolders = linemenProfiles.filter(lp => uniqueHolders.has(lp.id)).length;
                        const percentage = linemen > 0 ? Math.round((linemenHolders / linemen) * 100) : 0;
                        return { ...item, percentage };
                    });

                    return {
                        admins,
                        safetyMitras,
                        linemen,
                        avgAge,
                        ppeStats: ppeSummary,
                        toolsStats: toolsSummary
                    };
                },
                { ttl: 15, swr: true } // Cache for 15 mins, update in background
            );

            if (data) {
                setStats(data);
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                ))}
                <div className="md:col-span-3 h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Top Row Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard
                    title={language === 'en' ? "Total Linemen" : "মোট লাইনম্যান"}
                    value={stats.linemen}
                    subValue={language === 'en' ? "Active Workforce" : "সক্রিয় কর্মী বাহিনী"}
                    icon="👥"
                    color="bg-blue-50 dark:bg-blue-900/30 text-blue-500"
                    delay={0}
                />
                <StatCard
                    title={language === 'en' ? "Safety Mitras" : "সেফটি মিত্র"}
                    value={stats.safetyMitras}
                    subValue={language === 'en' ? "Supervisors" : "তত্ত্বাবধায়ক"}
                    icon="🛡️"
                    color="bg-orange-50 dark:bg-orange-900/30 text-orange-500"
                    delay={100}
                />
                <StatCard
                    title={language === 'en' ? "Administrators" : "অ্যাডমিনিস্ট্রেটর"}
                    value={stats.admins}
                    subValue={language === 'en' ? "System Control" : "সিস্টেম কন্ট্রোল"}
                    icon="⚡"
                    color="bg-purple-50 dark:bg-purple-900/30 text-purple-500"
                    delay={200}
                />
                <StatCard
                    title={language === 'en' ? "Avg. Lineman Age" : "গড় লাইনম্যান বয়স"}
                    value={stats.avgAge}
                    subValue={language === 'en' ? "Years old" : "বছর বয়স"}
                    icon="📅"
                    color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500"
                    delay={300}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PPE Availability Section */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-xl">🦺</div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                            {language === 'en' ? "PPE Availability" : "পিপিই প্রাপ্যতা"}
                        </h4>
                    </div>
                    <div className="space-y-6">
                        {stats.ppeStats.map((item, idx) => (
                            <ProgressBar
                                key={idx}
                                label={language === 'en' ? item.name : item.name} // Translation needed for item names if complex
                                percentage={item.percentage}
                                icon={item.icon}
                                color={item.color}
                            />
                        ))}
                    </div>
                </div>

                {/* Tools Availability Section */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl">🛠️</div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                            {language === 'en' ? "Tools Availability" : "সরঞ্জাম প্রাপ্যতা"}
                        </h4>
                    </div>
                    <div className="space-y-6">
                        {stats.toolsStats.map((item, idx) => (
                            <ProgressBar
                                key={idx}
                                label={language === 'en' ? item.name : item.name}
                                percentage={item.percentage}
                                icon={item.icon}
                                color={item.color}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
