import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';
import wbLocations from '../data/wb_locations.json';
import { BLOOD_GROUPS } from '../data/profileFieldOptions';
import { emergencyTel, mergeOfficialEmergencyServices, serviceMatchesPlace } from '../data/officialEmergencyServices';

// Reliable, static color maps for service categories (avoids dynamic Tailwind classes)
const SERVICE_COLORS = {
    blue: { iconBg: 'bg-blue-100 text-blue-600', activePill: 'bg-blue-600 text-white shadow-blue-500/30', call: 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white' },
    red: { iconBg: 'bg-red-100 text-red-600', activePill: 'bg-red-500 text-white shadow-red-500/30', call: 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' },
    orange: { iconBg: 'bg-orange-100 text-orange-600', activePill: 'bg-orange-500 text-white shadow-orange-500/30', call: 'bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white' },
    slate: { iconBg: 'bg-slate-100 text-slate-600', activePill: 'bg-slate-800 text-white shadow-slate-800/30', call: 'bg-slate-200 text-slate-600 hover:bg-slate-700 hover:text-white' },
    yellow: { iconBg: 'bg-amber-100 text-amber-600', activePill: 'bg-amber-500 text-white shadow-amber-500/30', call: 'bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white' },
};
const getServiceColor = (color) => SERVICE_COLORS[color] || SERVICE_COLORS.slate;

const SERVICE_EMOJI = {
    hospital: '🏥', ambulance: '🚑', fire: '🚒', police: '👮', power: '⚡', grid: '🧭', other: '🏢',
};

/** Canonical A+ / AB- from messy stored values; empty if unknown. */
function normalizeBloodGroup(raw) {
    if (raw == null) return '';
    const s = String(raw)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/[＋﹢]/g, '+')
        .replace(/[－﹣]/g, '-');
    if (!s) return '';
    if (BLOOD_GROUPS.includes(s)) return s;
    const compact = s.replace(/[^ABO+\-]/g, '');
    return BLOOD_GROUPS.includes(compact) ? compact : '';
}

function donorPhone(donor) {
    const raw = donor?.phone || donor?.phone_number || '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
}

function formatDonationDate(raw, language) {
    if (!raw) return language === 'bn' ? 'জানা নেই' : 'Unknown';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString(language === 'bn' ? 'bn-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function sortByLabel(items, key, language) {
    const locales = language === 'bn' ? ['bn', 'en'] : ['en', 'bn'];
    return [...(items || [])].sort((a, b) =>
        String(a?.[key] || '').localeCompare(String(b?.[key] || ''), locales, {
            sensitivity: 'base',
            numeric: true,
            ignorePunctuation: true,
        })
    );
}

const SERVICE_TYPES = {
    hospitals: { icon: 'hospital', color: 'blue' },
    ambulance: { icon: 'ambulance', color: 'red' },
    fire: { icon: 'fire', color: 'orange' },
    police: { icon: 'police', color: 'slate' },
    power: { icon: 'power', color: 'yellow' },
};

// Skeleton Loaders
const DonorCardSkeleton = () => (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 shimmer" />
                <div className="space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-slate-200 shimmer" />
                    <div className="h-2.5 w-16 rounded bg-slate-200 shimmer" />
                </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-slate-200 shimmer" />
        </div>
    </div>
);

const ServiceCardSkeleton = () => (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200 shimmer" />
                <div className="space-y-1.5">
                    <div className="h-3.5 w-28 rounded bg-slate-200 shimmer" />
                    <div className="h-2.5 w-16 rounded bg-slate-200 shimmer" />
                </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-slate-200 shimmer" />
        </div>
    </div>
);

const EmptyState = ({ icon, title, message, language }) => (
    <div className="px-4 py-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center text-3xl shadow-sm">
            {icon}
        </div>
        <h3 className={`text-lg font-black text-slate-800 mb-2 ${language === 'bn' ? 'font-bengali' : ''}`}>{title}</h3>
        <p className={`text-slate-500 text-sm font-semibold max-w-xs mx-auto leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>{message}</p>
    </div>
);

const Toast = ({ message, type, show, onDismiss }) => {
    if (!show) return null;

    const tone =
        type === 'error'
            ? 'border-l-rose-500 bg-white text-rose-800'
            : type === 'success'
              ? 'border-l-emerald-500 bg-white text-emerald-800'
              : 'border-l-orange-500 bg-white text-slate-800';

    return (
        <div
            className={`fixed top-[max(5rem,env(safe-area-inset-top,0px)+4rem)] right-4 left-4 sm:left-auto sm:w-[min(100%-2rem,24rem)] z-[350] p-3.5 rounded-2xl shadow-xl border border-slate-200/80 border-l-4 ${tone} backdrop-blur-md transition-all duration-300 animate-toast-in`}
            onClick={onDismiss}
            role="status"
        >
            <p className="text-sm font-semibold leading-snug pr-6">{message}</p>
        </div>
    );
};



const DonorCard = React.memo(({ donor, isExpanded, onToggle, language, t }) => {
    const group = normalizeBloodGroup(donor.blood_group);
    const phone = donorPhone(donor);
    const place = [donor.block, donor.district].filter(Boolean).join(', ');

    return (
        <div
            onClick={onToggle}
            className={`cursor-pointer rounded-2xl border bg-white px-3 py-2.5 shadow-sm transition-all ${
                isExpanded ? 'border-red-300 ring-2 ring-red-200/60' : 'border-slate-200/80 hover:shadow-md active:scale-[0.99]'
            }`}
        >
            <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 ring-1 ring-red-100">
                    <span className="font-sans text-[12px] font-black leading-none tracking-tight text-red-600">
                        {group || '—'}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className={`truncate text-[13px] font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {donor.full_name || (language === 'bn' ? 'নাম নেই' : 'No name')}
                    </h3>
                    <p className={`truncate text-[11px] font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {place || (language === 'bn' ? 'এলাকা নেই' : 'Location unknown')}
                    </p>
                </div>
                {phone ? (
                    <a
                        href={`tel:${phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm shadow-red-500/25 transition-all hover:bg-red-600 active:scale-95"
                        aria-label={t.blood.call}
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </a>
                ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
                        —
                    </span>
                )}
            </div>

            {isExpanded && (
                <div className={`mt-2.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] ${language === 'bn' ? 'font-bengali' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-500">{t.blood.lastDonated}</span>
                        <span className="font-bold text-slate-800">{formatDonationDate(donor.last_donation_date, language)}</span>
                    </div>
                    {phone ? (
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-500">{language === 'bn' ? 'ফোন' : 'Phone'}</span>
                            <span className="font-sans font-bold tabular-nums text-slate-800">{phone}</span>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
});

const ServiceCard = React.memo(({ service, config, isExpanded, onToggle, language }) => {
    const colors = getServiceColor(config.color);
    const tel = emergencyTel(service.phone);
    const place = [service.block, service.district || service.location].filter(Boolean).join(' · ')
        || service.address
        || '';

    return (
        <div
            onClick={onToggle}
            className={`cursor-pointer rounded-2xl border bg-white px-3 py-2.5 shadow-sm transition-all ${
                isExpanded ? 'border-orange-300 ring-2 ring-orange-200/60' : 'border-slate-200/80 hover:shadow-md active:scale-[0.99]'
            }`}
        >
            <div className="flex items-center gap-2.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${colors.iconBg}`}>
                    {SERVICE_EMOJI[config.icon] || SERVICE_EMOJI.other}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className={`truncate text-[13px] font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {service.name}
                    </h4>
                    <p className={`truncate text-[11px] font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {place || (language === 'bn' ? 'এলাকা নেই' : 'Location unknown')}
                    </p>
                </div>
                {tel ? (
                    <a
                        href={`tel:${tel}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-95"
                        aria-label={language === 'bn' ? 'কল করুন' : 'Call'}
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </a>
                ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
                        —
                    </span>
                )}
            </div>

            {isExpanded && (
                <div className={`mt-2.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {(service.address || service.location) && (
                        <p className="font-semibold leading-relaxed text-slate-600">{service.address || service.location}</p>
                    )}
                    {service.description ? (
                        <p className="leading-relaxed text-slate-500">{service.description}</p>
                    ) : null}
                    {service.phone ? (
                        <p className="font-sans font-bold tabular-nums text-slate-800">{service.phone}</p>
                    ) : null}
                </div>
            )}
        </div>
    );
});

export default function Emergency({ language = 'en', user, setCurrentView }) {
    const [activeTab, setActiveTab] = useState('blood');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
    const [selectedDistrict, setSelectedDistrict] = useState('All');
    const [selectedBlock, setSelectedBlock] = useState('All');
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', show: false });
    const toastHideTimerRef = useRef(null);
    const [serviceSearch, setServiceSearch] = useState('');
    const [serviceDistrict, setServiceDistrict] = useState('All');
    const [serviceBlock, setServiceBlock] = useState('All');
    const [expandedServiceId, setExpandedServiceId] = useState(null);
    const [expandedDonorId, setExpandedDonorId] = useState(null);

    const showToast = (message, type = 'info') => {
        if (toastHideTimerRef.current) {
            clearTimeout(toastHideTimerRef.current);
            toastHideTimerRef.current = null;
        }
        setToast({ message, type, show: true });
        toastHideTimerRef.current = setTimeout(() => {
            setToast((t) => ({ ...t, show: false }));
            toastHideTimerRef.current = null;
        }, 3600);
    };

    useEffect(() => {
        return () => {
            if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
        };
    }, []);


    // Registration Form State
    const [regForm, setRegForm] = useState({
        fullName: '',
        bloodGroup: '',
        lastDonated: '',
        district: '',
        block: '',
        phone: ''
    });
    const [isRegistering, setIsRegistering] = useState(false);

    const [isDonor, setIsDonor] = useState(false);

    // Check if user is already a donor
    useEffect(() => {
        if (user) {
            checkDonorStatus();
        }
    }, [user]);

    const checkDonorStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data && data.is_donor) {
                setIsDonor(true);
                setRegForm({
                    fullName: data.full_name || '',
                    bloodGroup: normalizeBloodGroup(data.blood_group) || data.blood_group || '',
                    lastDonated: data.last_donation_date || '',
                    district: data.district || '',
                    block: data.block || '',
                    phone: data.phone || data.phone_number || ''
                });
            }
        } catch (error) {
            console.error('Error checking donor status:', error);
        }
    };

    const [services, setServices] = useState([]);

    // Fetch Donors & Services
    useEffect(() => {
        if (activeTab === 'blood') {
            fetchDonors();
        } else if (activeTab === 'services') {
            fetchServices();
        }
    }, [activeTab, selectedBloodGroup, selectedDistrict, selectedBlock, language]);

    const fetchServices = async () => {
        const cachedServices = cacheHelper.get('emergency_services_v5');
        if (cachedServices) {
            setServices(mergeOfficialEmergencyServices(cachedServices));
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('emergency_services')
                .select('*');

            if (error) throw error;
            const merged = mergeOfficialEmergencyServices(data || []);
            setServices(merged);
            cacheHelper.set('emergency_services_v5', data || [], 30);
        } catch (error) {
            console.error('Error fetching services:', error);
            setServices(mergeOfficialEmergencyServices([]));
        } finally {
            setLoading(false);
        }
    };

    const fetchDonors = async () => {
        const cacheKey = `donors_v3_${selectedBloodGroup}_${selectedDistrict}_${selectedBlock}_${language}`;
        const cachedDonors = cacheHelper.get(cacheKey);
        if (cachedDonors) {
            setDonors(cachedDonors);
            return;
        }

        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, blood_group, district, block, phone, phone_number, last_donation_date')
                .eq('is_donor', true);

            if (selectedDistrict !== 'All') {
                query = query.eq('district', selectedDistrict);
            }
            if (selectedBlock !== 'All') {
                query = query.eq('block', selectedBlock);
            }

            const { data, error } = await query;
            if (error) throw error;
            const rows = (data || [])
                .map((row) => ({ ...row, blood_group: normalizeBloodGroup(row.blood_group) }))
                .filter((row) => row.blood_group);
            const filtered =
                selectedBloodGroup === 'All'
                    ? rows
                    : rows.filter((row) => row.blood_group === selectedBloodGroup);
            const sorted = sortByLabel(filtered, 'full_name', language);
            setDonors(sorted);
            cacheHelper.set(cacheKey, sorted, 5);
        } catch (error) {
            console.error('Error fetching donors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!user) {
            setCurrentView('login');
            return;
        }

        if (regForm.phone.length !== 10) {
            showToast('Please enter a valid 10-digit phone number.', 'error');
            return;
        }

        setIsRegistering(true);
        try {
            const updates = {
                id: user.id,
                blood_group: normalizeBloodGroup(regForm.bloodGroup) || regForm.bloodGroup,
                district: regForm.district,
                block: regForm.block,
                phone: regForm.phone,
                last_donation_date: regForm.lastDonated || null,
                is_donor: true,
                email: user.email,
                full_name: regForm.fullName,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            // Clear donor caches
            cacheHelper.clearAll();

            showToast(isDonor ? 'Donor profile updated successfully!' : 'Successfully registered as a donor!', 'success');
            setIsDonor(true);
            setShowRegisterModal(false);
            fetchDonors();
        } catch (error) {
            console.error('Error registering:', error);
            showToast(`Failed to register: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            setIsRegistering(false);
        }
    };

    const t = {
        en: {
            title: "Emergency",
            tabs: {
                blood: "Blood Network",
                services: "Emergency Services"
            },
            blood: {
                heroTitle: "Save Lives Through Blood Donation",
                registerBtn: isDonor ? "Update Info" : "Register as Donor",
                findBtn: "Search Donors",
                filters: {
                    group: "Blood Group",
                    district: "District"
                },
                donorsFound: "Donors Found",
                lastDonated: "Last donated",
                call: "Call",
                unavailable: "Unavailable"
            },
            services: {
                hospitals: "Hospitals",
                ambulance: "Ambulance",
                fire: "Fire Station",
                police: "Police",
                power: "Power Dept",
                call: "Call"
            }
        },
        bn: {
            title: "জরুরি",
            tabs: {
                blood: "রক্তের নেটওয়ার্ক",
                services: "জরুরি পরিষেবা"
            },
            blood: {
                heroTitle: "রক্তদানের মাধ্যমে জীবন বাঁচান",
                registerBtn: isDonor ? "তথ্য আপডেট করুন" : "রক্তদাতা হিসেবে নিবন্ধন",
                findBtn: "রক্তদাতা খুঁজুন",
                filters: {
                    group: "রক্তের গ্রুপ",
                    district: "জেলা"
                },
                donorsFound: "রক্তদাতা পাওয়া গেছে",
                lastDonated: "শেষ রক্তদান",
                call: "কল করুন",
                unavailable: "অনুপলব্ধ"
            },
            services: {
                hospitals: "হাসপাতাল",
                ambulance: "অ্যাম্বুলেন্স",
                fire: "দমকল কেন্দ্র",
                police: "পুলিশ",
                power: "বিদ্যুৎ দপ্তর",
                call: "কল"
            }
        }
    }[language];

    const searchLower = serviceSearch.toLowerCase();
    const filteredServices = sortByLabel(
        services.filter((s) => {
            const haystack = [s.name, s.location, s.address, s.district, s.block, s.description]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const matchesSearch = !serviceSearch || haystack.includes(searchLower);
            const matchesCategory = activeCategory === 'all' || s.type === activeCategory;
            const matchesPlace = serviceMatchesPlace(s, serviceDistrict, serviceBlock);
            return matchesSearch && matchesCategory && matchesPlace;
        }),
        'name',
        language
    );

    const serviceChipTypes = ['all', 'hospitals', 'ambulance', 'fire', 'police', 'power'];
    const serviceChipLabel = (type) => {
        if (type === 'all') return language === 'en' ? 'All' : 'সব';
        return t.services[type] || type;
    };

    const filterSelectClass =
        'w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 disabled:opacity-50';

    return (
        <div className="min-h-screen bg-[#fffdf7] pb-24 text-slate-900">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
            <Toast message={toast.message} type={toast.type} show={toast.show} onDismiss={() => setToast(t => ({ ...t, show: false }))} />

            {/* Header */}
            <div className="mb-4">
                <h1 className={`text-xl font-black tracking-tight text-slate-900 sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {t.title}
                </h1>
            </div>

            {/* Tabs */}
            <div className="mb-4">
                <div className="inline-flex w-full gap-1 rounded-full border border-slate-200/80 bg-white p-1 shadow-sm sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('blood')}
                        className={`min-h-[40px] flex-1 rounded-full px-4 py-2 text-xs font-black transition-all active:scale-[0.98] sm:flex-none sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
                            activeTab === 'blood'
                                ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                                : 'text-slate-600 hover:bg-orange-50'
                        }`}
                    >
                        {t.tabs.blood}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('services')}
                        className={`min-h-[40px] flex-1 rounded-full px-4 py-2 text-xs font-black transition-all active:scale-[0.98] sm:flex-none sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
                            activeTab === 'services'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                : 'text-slate-600 hover:bg-orange-50'
                        }`}
                    >
                        {t.tabs.services}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'blood' ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
                        <p className={`min-w-0 text-[13px] font-bold leading-snug text-slate-800 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {t.blood.heroTitle}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                if (!user) setCurrentView('login');
                                else setShowRegisterModal(true);
                            }}
                            className={`shrink-0 rounded-full bg-red-500 px-3.5 py-2 text-[11px] font-black text-white shadow-sm shadow-red-500/25 transition-all active:scale-95 ${language === 'bn' ? 'font-bengali' : ''}`}
                        >
                            {t.blood.registerBtn}
                        </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setSelectedBloodGroup('All')}
                                className={`min-h-[32px] rounded-full px-2.5 py-1 text-[11px] font-black transition-all active:scale-95 ${language === 'bn' ? 'font-bengali' : ''} ${
                                    selectedBloodGroup === 'All'
                                        ? 'bg-red-500 text-white shadow-sm'
                                        : 'border border-slate-200/80 bg-slate-50 text-slate-600'
                                }`}
                            >
                                {language === 'en' ? 'All' : 'সব'}
                            </button>
                            {BLOOD_GROUPS.map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => setSelectedBloodGroup(group)}
                                    className={`min-h-[32px] rounded-full px-2.5 py-1 font-sans text-[11px] font-black leading-none tracking-tight transition-all active:scale-95 ${
                                        selectedBloodGroup === group
                                            ? 'bg-red-500 text-white shadow-sm'
                                            : 'border border-slate-200/80 bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                            <select
                                value={selectedDistrict}
                                onChange={(e) => {
                                    setSelectedDistrict(e.target.value);
                                    setSelectedBlock('All');
                                }}
                                className={filterSelectClass}
                                aria-label={t.blood.filters.district}
                            >
                                <option value="All">{language === 'en' ? 'All districts' : 'সব জেলা'}</option>
                                {Object.keys(wbLocations).sort().map((dist) => (
                                    <option key={dist} value={dist}>{dist}</option>
                                ))}
                            </select>
                            <select
                                value={selectedBlock}
                                onChange={(e) => setSelectedBlock(e.target.value)}
                                disabled={selectedDistrict === 'All'}
                                className={filterSelectClass}
                                aria-label={language === 'en' ? 'Block' : 'ব্লক'}
                            >
                                <option value="All">{language === 'en' ? 'All blocks' : 'সব ব্লক'}</option>
                                {selectedDistrict !== 'All' && wbLocations[selectedDistrict]?.map((block) => (
                                    <option key={block} value={block}>{block}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!loading && donors.length > 0 && (
                        <p className={`text-[11px] font-bold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {donors.length} {t.blood.donorsFound}
                        </p>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <DonorCardSkeleton />
                            <DonorCardSkeleton />
                            <DonorCardSkeleton />
                        </div>
                    ) : donors.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            language={language}
                            title={language === 'en' ? 'No donors found' : 'কোন রক্তদাতা পাওয়া যায়নি'}
                            message={language === 'en' ? 'Try another group or district.' : 'অন্য গ্রুপ বা জেলা বেছে দেখুন।'}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {donors.map((donor) => (
                                <DonorCard
                                    key={donor.id}
                                    donor={donor}
                                    language={language}
                                    isExpanded={expandedDonorId === donor.id}
                                    onToggle={() => setExpandedDonorId(expandedDonorId === donor.id ? null : donor.id)}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap gap-1.5">
                            {serviceChipTypes.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setActiveCategory(type)}
                                    className={`min-h-[32px] rounded-full px-2.5 py-1 text-[11px] font-black transition-all active:scale-95 ${language === 'bn' ? 'font-bengali' : ''} ${
                                        activeCategory === type
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'border border-slate-200/80 bg-slate-50 text-slate-600'
                                    }`}
                                >
                                    {serviceChipLabel(type)}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                            <select
                                value={serviceDistrict}
                                onChange={(e) => {
                                    setServiceDistrict(e.target.value);
                                    setServiceBlock('All');
                                }}
                                className={filterSelectClass}
                                aria-label={language === 'en' ? 'District' : 'জেলা'}
                            >
                                <option value="All">{language === 'en' ? 'All districts' : 'সব জেলা'}</option>
                                {Object.keys(wbLocations).sort().map((dist) => (
                                    <option key={dist} value={dist}>{dist}</option>
                                ))}
                            </select>
                            <select
                                value={serviceBlock}
                                onChange={(e) => setServiceBlock(e.target.value)}
                                disabled={serviceDistrict === 'All'}
                                className={filterSelectClass}
                                aria-label={language === 'en' ? 'Block' : 'ব্লক'}
                            >
                                <option value="All">{language === 'en' ? 'All blocks' : 'সব ব্লক'}</option>
                                {serviceDistrict !== 'All' && wbLocations[serviceDistrict]?.map((block) => (
                                    <option key={block} value={block}>{block}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative mt-2.5">
                            <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={serviceSearch}
                                onChange={(e) => setServiceSearch(e.target.value)}
                                placeholder={language === 'en' ? 'Search by name or location' : 'নাম বা এলাকা খুঁজুন'}
                                className={`w-full rounded-xl border border-slate-200/80 bg-white py-2 pl-9 pr-9 text-xs font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-200/60 ${language === 'bn' ? 'font-bengali' : ''}`}
                            />
                            {serviceSearch ? (
                                <button
                                    type="button"
                                    onClick={() => setServiceSearch('')}
                                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-orange-50 hover:text-slate-600 active:scale-95"
                                    aria-label={language === 'en' ? 'Clear search' : 'সার্চ মুছুন'}
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {!loading && filteredServices.length > 0 && (
                        <p className={`text-[11px] font-bold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {filteredServices.length} {language === 'en' ? 'services found' : 'টি পরিষেবা পাওয়া গেছে'}
                        </p>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <ServiceCardSkeleton />
                            <ServiceCardSkeleton />
                            <ServiceCardSkeleton />
                        </div>
                    ) : services.length === 0 ? (
                        <EmptyState
                            icon="📋"
                            language={language}
                            title={language === 'en' ? 'No Services Found' : 'কোন পরিষেবা পাওয়া যায়নি'}
                            message={language === 'en' ? 'Emergency services data is currently unavailable.' : 'জরুরি পরিষেবার তথ্য এখন উপলব্ধ নয়।'}
                        />
                    ) : filteredServices.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            language={language}
                            title={language === 'en' ? 'No Results' : 'কোন ফলাফল নেই'}
                            message={language === 'en' ? 'No services found' : 'কোন পরিষেবা পাওয়া যায়নি'}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredServices.map((service) => (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    config={SERVICE_TYPES[service.type] || { icon: 'other', color: 'slate' }}
                                    language={language}
                                    isExpanded={expandedServiceId === service.id}
                                    onToggle={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Registration Modal */}
            {showRegisterModal && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/45 p-0 animate-fade-in sm:items-center sm:p-4"
                    role="presentation"
                    onClick={() => !isRegistering && setShowRegisterModal(false)}
                >
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl animate-slide-up-sheet sm:rounded-2xl sm:animate-scale-in"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 pb-4 pt-6 sm:px-6">
                            <div className="min-w-0">
                                <p className={`mb-0.5 text-[11px] font-black text-orange-600 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                    {language === 'en' ? 'Blood network' : 'রক্তের নেটওয়ার্ক'}
                                </p>
                                <h3 className={`text-lg font-black leading-tight text-slate-900 sm:text-xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {isDonor
                                        ? (language === 'en' ? 'Update Donor Profile' : 'রক্তদাতা প্রোফাইল আপডেট')
                                        : (language === 'en' ? 'Register as Blood Donor' : 'রক্তদাতা হিসেবে নিবন্ধন')}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRegisterModal(false)}
                                disabled={isRegistering}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-orange-50 active:scale-95 disabled:opacity-50"
                                aria-label={language === 'en' ? 'Close' : 'বন্ধ করুন'}
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5 custom-scrollbar sm:px-6">
                            <div>
                                <label className={`mb-1.5 ml-1 block text-xs font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                    {language === 'en' ? 'Full Name' : 'পূর্ণ নাম'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={regForm.fullName}
                                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60"
                                    placeholder={language === 'en' ? 'Enter your name' : 'আপনার নাম লিখুন'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`mb-1.5 ml-1 block text-xs font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                        {language === 'en' ? 'Blood Group' : 'রক্তের গ্রুপ'}
                                    </label>
                                    <select
                                        required
                                        value={regForm.bloodGroup}
                                        onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                                        className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60"
                                    >
                                        <option value="">{language === 'en' ? 'Select' : 'বেছে নিন'}</option>
                                        {BLOOD_GROUPS.map((group) => (
                                            <option key={group} value={group}>{group}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`mb-1.5 ml-1 block text-xs font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                        {language === 'en' ? 'Last Donated' : 'শেষ রক্তদান'}
                                    </label>
                                    <input
                                        type="date"
                                        value={regForm.lastDonated}
                                        onChange={(e) => setRegForm({ ...regForm, lastDonated: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={`mb-1.5 ml-1 block text-xs font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                    {language === 'en' ? 'District' : 'জেলা'}
                                </label>
                                <select
                                    required
                                    value={regForm.district}
                                    onChange={(e) => setRegForm({ ...regForm, district: e.target.value, block: '' })}
                                    className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60"
                                >
                                    <option value="">{language === 'en' ? 'Select District' : 'জেলা বেছে নিন'}</option>
                                    {Object.keys(wbLocations).sort().map(dist => (
                                        <option key={dist} value={dist}>{dist}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={`mb-1.5 ml-1 block text-xs font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                    {language === 'en' ? 'Block Name' : 'ব্লকের নাম'}
                                </label>
                                <select
                                    required
                                    value={regForm.block}
                                    onChange={(e) => setRegForm({ ...regForm, block: e.target.value })}
                                    disabled={!regForm.district}
                                    className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60 disabled:opacity-50"
                                >
                                    <option value="">{language === 'en' ? 'Select Block' : 'ব্লক বেছে নিন'}</option>
                                    {regForm.district && wbLocations[regForm.district]?.map(block => (
                                        <option key={block} value={block}>{block}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={`mb-1.5 ml-1 block text-xs font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                                    {language === 'en' ? 'Phone Number' : 'ফোন নম্বর'}
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={regForm.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setRegForm({ ...regForm, phone: val });
                                    }}
                                    pattern="[0-9]{10}"
                                    title="Please enter a valid 10-digit phone number"
                                    className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60"
                                    placeholder={language === 'en' ? '10-digit mobile number' : '১০ সংখ্যার মোবাইল নম্বর'}
                                />
                            </div>

                            <div className="flex flex-col gap-2.5 border-t border-slate-200/80 pt-4 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterModal(false)}
                                    disabled={isRegistering}
                                    className={`order-2 min-h-[48px] flex-1 rounded-full border border-slate-200/80 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98] disabled:opacity-50 sm:order-1 ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {language === 'en' ? 'Cancel' : 'বাতিল'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isRegistering}
                                    className={`order-1 min-h-[48px] flex-1 rounded-full bg-red-500 py-3 text-sm font-black text-white shadow-md shadow-red-500/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {isRegistering
                                        ? (language === 'en' ? 'Processing...' : 'প্রক্রিয়াকরণ...')
                                        : (isDonor
                                            ? (language === 'en' ? 'Update' : 'আপডেট')
                                            : (language === 'en' ? 'Register' : 'নিবন্ধন'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            </div>
        </div>
    );
}
