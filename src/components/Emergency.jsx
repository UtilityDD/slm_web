import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';

// Skeleton Loaders
const DonorCardSkeleton = () => (
    <div className="material-card elevation-1 p-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shimmer"></div>
                <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shimmer"></div>
        </div>
    </div>
);

const ServiceCardSkeleton = () => (
    <div className="material-card elevation-1 p-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shimmer"></div>
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                </div>
            </div>
        </div>
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                <div className="h-3 flex-1 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
                <div className="h-3 flex-1 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div>
            </div>
        </div>
        <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-xl shimmer mt-4"></div>
    </div>
);

const EmptyState = ({ icon, title, message }) => (
    <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-2xl text-slate-400">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm">{message}</p>
    </div>
);

const Toast = ({ message, type, show, onDismiss }) => {
    if (!show) return null;

    const baseClasses = "fixed top-20 right-5 p-4 rounded-xl shadow-xl text-white transition-all duration-300 z-50 elevation-5";
    const typeClasses = {
        success: "bg-green-600",
        error: "bg-red-600",
        info: "bg-blue-600"
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`} onClick={onDismiss}>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{message}</span>
            </div>
        </div>
    );
};


export default function Emergency({ language = 'en', user, setCurrentView }) {
    const [activeTab, setActiveTab] = useState('blood');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
    const [selectedDistrict, setSelectedDistrict] = useState('All');
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', show: false });
    const [serviceSearch, setServiceSearch] = useState('');
    const [expandedServiceId, setExpandedServiceId] = useState(null);
    const [expandedDonorId, setExpandedDonorId] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, show: true });
        setTimeout(() => {
            setToast(t => ({ ...t, show: false }));
        }, 3000);
    };


    // Registration Form State
    const [regForm, setRegForm] = useState({
        fullName: '',
        bloodGroup: '',
        lastDonated: '',
        district: '',
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
                    bloodGroup: data.blood_group || '',
                    lastDonated: data.last_donation_date || '',
                    district: data.district || '',
                    phone: data.phone || ''
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
    }, [activeTab, selectedBloodGroup, selectedDistrict]);

    const fetchServices = async () => {
        const cachedServices = cacheHelper.get('emergency_services');
        if (cachedServices) {
            setServices(cachedServices);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('emergency_services')
                .select('*');

            if (error) throw error;
            setServices(data || []);
            cacheHelper.set('emergency_services', data || [], 30); // Cache for 30 mins
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDonors = async () => {
        const cacheKey = `donors_${selectedBloodGroup}_${selectedDistrict}`;
        const cachedDonors = cacheHelper.get(cacheKey);
        if (cachedDonors) {
            setDonors(cachedDonors);
            return;
        }

        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*')
                .eq('is_donor', true);

            if (selectedBloodGroup !== 'All') {
                query = query.eq('blood_group', selectedBloodGroup);
            }
            if (selectedDistrict !== 'All') {
                query = query.eq('district', selectedDistrict);
            }

            const { data, error } = await query;
            if (error) throw error;
            setDonors(data || []);
            cacheHelper.set(cacheKey, data || [], 5); // Cache for 5 mins
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
                blood_group: regForm.bloodGroup,
                district: regForm.district,
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
            title: "Emergency Hub",
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
            title: "জরুরি হাব",
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

    return (
        <div className="compact-container py-6 sm:py-10 mb-20">
            <Toast message={toast.message} type={toast.type} show={toast.show} onDismiss={() => setToast(t => ({ ...t, show: false }))} />

            {/* Modern Header - Compact */}
            <div className="mb-8 text-center">
                <div className="inline-block p-2.5 rounded-full bg-red-100 text-red-600 text-2xl mb-3">
                    🚨
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                    {language === 'en' ? (
                        <>Emer<span className="text-red-600">gency</span></>
                    ) : (
                        <>{t.title}</>
                    )}
                </h1>
            </div>

            {/* Refined Tabs - Compact */}
            <div className="mb-6">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl inline-flex gap-1 border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('blood')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'blood'
                            ? 'bg-white dark:bg-slate-800 text-red-600 shadow-lg shadow-red-500/10'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100'
                            }`}
                    >
                        {t.tabs.blood}
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'services'
                            ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-lg shadow-blue-500/10'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100'
                            }`}
                    >
                        {t.tabs.services}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'blood' ? (
                <div className="space-y-6">
                    {/* Clean Hero Card - Compact */}
                    <div className="material-card p-5 sm:p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 dark:bg-red-900/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1 relative z-10">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">{t.blood.heroTitle}</h2>
                                <button
                                    onClick={() => {
                                        if (!user) setCurrentView('login');
                                        else setShowRegisterModal(true);
                                    }}
                                    className="material-button-primary bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/20 text-xs px-5 py-2"
                                >
                                    {t.blood.registerBtn}
                                </button>
                            </div>
                            <div className="hidden sm:block text-5xl opacity-10 relative z-0">
                                ❤️
                            </div>
                        </div>
                    </div>

                    {/* Compact Filters */}
                    <div className="material-card p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <select
                                    value={selectedBloodGroup}
                                    onChange={(e) => setSelectedBloodGroup(e.target.value)}
                                    className="material-input py-2.5 text-sm font-medium"
                                >
                                    <option value="All">All Groups</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                                <select
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    className="material-input py-2.5 text-sm font-medium"
                                >
                                    <option value="All">All Districts</option>
                                    <option value="Kolkata">Kolkata</option>
                                    <option value="Howrah">Howrah</option>
                                    <option value="Hooghly">Hooghly</option>
                                    <option value="North 24 Parganas">North 24 Parganas</option>
                                    <option value="South 24 Parganas">South 24 Parganas</option>
                                    <option value="Siliguri">Siliguri</option>
                                    <option value="Durgapur">Durgapur</option>
                                </select>
                            </div>
                            <button
                                onClick={fetchDonors}
                                className="material-button-primary bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white shadow-none py-2.5 px-6 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {t.blood.findBtn}
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <DonorCardSkeleton />
                            <DonorCardSkeleton />
                            <DonorCardSkeleton />
                        </div>
                    ) : donors.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            title="No Donors Found"
                            message="No donors match your search criteria. Try adjusting filters."
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {donors.map((donor) => {
                                const isExpanded = expandedDonorId === donor.id;
                                return (
                                    <div
                                        key={donor.id}
                                        onClick={() => setExpandedDonorId(isExpanded ? null : donor.id)}
                                        className={`material-card elevation-1 p-4 hover:elevation-2 transition-all cursor-pointer group ${isExpanded ? 'ring-2 ring-red-500' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-red-50 flex-shrink-0 flex items-center justify-center">
                                                    <span className="text-red-600 font-bold text-xs">{donor.blood_group}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{donor.full_name || 'Unknown'}</h3>
                                                    <p className="text-[11px] text-slate-500 truncate">{donor.district}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                <a
                                                    href={`tel:${donor.phone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-shrink-0"
                                                >
                                                    <button className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                    </button>
                                                </a>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 animate-fade-in space-y-2">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-500">{t.blood.lastDonated}:</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{donor.last_donation_date || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-500">Contact:</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{donor.phone}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-500">Status:</span>
                                                    <span className="text-green-600 font-bold uppercase tracking-wider">Available</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {loading ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            <ServiceCardSkeleton />
                            <ServiceCardSkeleton />
                            <ServiceCardSkeleton />
                            <ServiceCardSkeleton />
                            <ServiceCardSkeleton />
                            <ServiceCardSkeleton />
                        </div>
                    ) : services.length === 0 ? (
                        <EmptyState
                            icon="📋"
                            title="No Services Found"
                            message="Emergency services data is currently unavailable."
                        />
                    ) : (
                        <div className="space-y-6">
                            {/* Search Bar */}
                            <div className="material-card elevation-1 p-4">
                                <div className="relative">
                                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={serviceSearch}
                                        onChange={(e) => setServiceSearch(e.target.value)}
                                        placeholder={language === 'en' ? 'Search services by name or location...' : 'নাম বা অবস্থান দ্বারা সার্চ করুন...'}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-slate-50 text-sm transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-blue-900"
                                    />
                                    {serviceSearch && (
                                        <button
                                            onClick={() => setServiceSearch('')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category Tabs */}
                            <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                <div className="flex gap-2">
                                    {['all', 'hospitals', 'ambulance', 'fire', 'police', 'power'].map((type) => {
                                        const typeConfig = {
                                            all: { label: language === 'en' ? 'All Services' : 'সকল পরিষেবা', icon: 'grid', color: 'slate' },
                                            hospitals: { label: t.services.hospitals, icon: 'hospital', color: 'blue' },
                                            ambulance: { label: t.services.ambulance, icon: 'ambulance', color: 'red' },
                                            fire: { label: t.services.fire, icon: 'fire', color: 'orange' },
                                            police: { label: t.services.police, icon: 'police', color: 'slate' },
                                            power: { label: t.services.power, icon: 'power', color: 'yellow' }
                                        };
                                        const config = typeConfig[type];
                                        const isActive = activeCategory === type;

                                        return (
                                            <button
                                                key={type}
                                                onClick={() => setActiveCategory(type)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${isActive
                                                    ? `bg-${config.color === 'slate' ? 'slate-800' : `${config.color}-600`} text-white shadow-md transform scale-105`
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:border-slate-600'
                                                    }`}
                                            >
                                                <span>{config.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Services Display */}
                            <div className={activeCategory === 'all' ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start" : "space-y-4"}>
                                {(() => {
                                    const searchLower = serviceSearch.toLowerCase();
                                    const filteredServices = services.filter(s => {
                                        const matchesSearch = !serviceSearch ||
                                            s.name?.toLowerCase().includes(searchLower) ||
                                            s.location?.toLowerCase().includes(searchLower);
                                        const matchesCategory = activeCategory === 'all' || s.type === activeCategory;
                                        return matchesSearch && matchesCategory;
                                    });

                                    if (filteredServices.length === 0) {
                                        return (
                                            <div className="col-span-full">
                                                <EmptyState
                                                    icon="🔍"
                                                    title={language === 'en' ? 'No Results' : 'কোন ফলাফল নেই'}
                                                    message={language === 'en' ? `No services found` : `কোন পরিষেবা পাওয়া যায়নি`}
                                                />
                                            </div>
                                        );
                                    }

                                    const groupedServices = filteredServices.reduce((acc, service) => {
                                        const type = service.type || 'other';
                                        if (!acc[type]) acc[type] = [];
                                        acc[type].push(service);
                                        return acc;
                                    }, {});

                                    const typeConfig = {
                                        hospitals: { label: t.services.hospitals, icon: 'hospital', color: 'blue' },
                                        ambulance: { label: t.services.ambulance, icon: 'ambulance', color: 'red' },
                                        fire: { label: t.services.fire, icon: 'fire', color: 'orange' },
                                        police: { label: t.services.police, icon: 'police', color: 'slate' },
                                        power: { label: t.services.power, icon: 'power', color: 'yellow' }
                                    };

                                    const typeOrder = ['hospitals', 'ambulance', 'fire', 'police', 'power'];

                                    // If specific category is selected, just show the grid of cards directly
                                    if (activeCategory !== 'all') {
                                        const servicesOfType = filteredServices;
                                        const type = activeCategory;
                                        const config = typeConfig[type] || { label: type, icon: 'other', color: 'slate' };

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {servicesOfType.map((service) => {
                                                    const isExpanded = expandedServiceId === service.id;
                                                    return (
                                                        <div
                                                            key={service.id}
                                                            onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                                                            className={`material-card elevation-1 p-5 hover:elevation-3 transition-all cursor-pointer group ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="min-w-0 pr-4">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.color === 'blue' ? 'bg-blue-500' :
                                                                            config.color === 'red' ? 'bg-red-500' :
                                                                                config.color === 'orange' ? 'bg-orange-500' :
                                                                                    config.color === 'yellow' ? 'bg-yellow-500' :
                                                                                        'bg-slate-500'
                                                                            }`}></span>
                                                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{service.name}</h4>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 truncate pl-4 dark:text-slate-400">{service.location}</p>
                                                                </div>

                                                                <a
                                                                    href={`tel:${service.phone}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="flex-shrink-0"
                                                                >
                                                                    <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${config.color === 'blue' ? 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white' :
                                                                        config.color === 'red' ? 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' :
                                                                            config.color === 'orange' ? 'bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white' :
                                                                                config.color === 'yellow' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-600 hover:text-white' :
                                                                                    'bg-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-600 hover:text-white dark:bg-slate-700'
                                                                        }`}>
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                        </svg>
                                                                    </button>
                                                                </a>
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in space-y-3">
                                                                    <div className="flex items-start gap-2">
                                                                        <svg className="w-4 h-4 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Address</p>
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400">{service.address || service.location || 'Address not available'}</p>
                                                                        </div>
                                                                    </div>
                                                                    {service.description && (
                                                                        <div className="flex items-start gap-2">
                                                                            <svg className="w-4 h-4 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                            </svg>
                                                                            <div>
                                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Details</p>
                                                                                <p className="text-xs text-slate-500 dark:text-slate-400">{service.description}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-start gap-2">
                                                                        <svg className="w-4 h-4 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                        </svg>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Contact</p>
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400">{service.phone}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    // 'All' view: Show Masonry Groups (same as before)
                                    return typeOrder.map(type => {
                                        const servicesOfType = groupedServices[type];
                                        if (!servicesOfType || servicesOfType.length === 0) return null;

                                        const config = typeConfig[type] || { label: type, icon: 'other', color: 'slate' };

                                        return (
                                            <div key={type} className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                                {/* Category Header */}
                                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-50 dark:border-slate-700">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                                        config.color === 'red' ? 'bg-red-100 text-red-600' :
                                                            config.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                                                config.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                                                                    'bg-slate-100 text-slate-600 dark:text-slate-400'
                                                        }`}>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            {type === 'hospitals' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
                                                            {type === 'ambulance' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                                            {type === 'fire' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />}
                                                            {type === 'police' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
                                                            {type === 'power' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />}
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{config.label}</h3>
                                                        <p className="text-xs text-slate-500">{servicesOfType.length} {servicesOfType.length === 1 ? 'service' : 'services'}</p>
                                                    </div>
                                                </div>

                                                {/* Services List (Compact) */}
                                                <div className="space-y-3">
                                                    {servicesOfType.map((service) => {
                                                        const isExpanded = expandedServiceId === service.id;
                                                        return (
                                                            <div
                                                                key={service.id}
                                                                onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                                                                className={`p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group dark:bg-slate-700 dark:hover:bg-slate-600 ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="min-w-0 pr-3">
                                                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{service.name}</h4>
                                                                        <p className="text-xs text-slate-500 truncate dark:text-slate-400">{service.location}</p>
                                                                    </div>

                                                                    <a
                                                                        href={`tel:${service.phone}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex-shrink-0"
                                                                    >
                                                                        <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${config.color === 'blue' ? 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white' :
                                                                            config.color === 'red' ? 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' :
                                                                                config.color === 'orange' ? 'bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white' :
                                                                                    config.color === 'yellow' ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-600 hover:text-white' :
                                                                                        'bg-slate-200 text-slate-600 dark:text-slate-400 hover:bg-slate-600 hover:text-white'
                                                                            }`}>
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                                            </svg>
                                                                        </button>
                                                                    </a>
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 animate-fade-in space-y-2">
                                                                        <div className="flex items-start gap-2">
                                                                            <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            </svg>
                                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{service.address || service.location || 'Address not available'}</p>
                                                                        </div>
                                                                        {service.description && (
                                                                            <div className="flex items-start gap-2">
                                                                                <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{service.description}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modern Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="material-card elevation-5 w-full max-w-md p-6 sm:p-8 animate-scale-up">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {isDonor ? (language === 'en' ? 'Update Donor Profile' : 'রক্তদাতা প্রোফাইল আপডেট') : (language === 'en' ? 'Register as Blood Donor' : 'রক্তদাতা হিসেবে নিবন্ধন')}
                            </h3>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={regForm.fullName}
                                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                                    className="material-input"
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Blood Group</label>
                                    <select
                                        required
                                        value={regForm.bloodGroup}
                                        onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                                        className="material-input"
                                    >
                                        <option value="">Select</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Last Donated</label>
                                    <input
                                        type="date"
                                        value={regForm.lastDonated}
                                        onChange={(e) => setRegForm({ ...regForm, lastDonated: e.target.value })}
                                        className="material-input"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">District</label>
                                <select
                                    required
                                    value={regForm.district}
                                    onChange={(e) => setRegForm({ ...regForm, district: e.target.value })}
                                    className="material-input"
                                >
                                    <option value="">Select District</option>
                                    <option value="Kolkata">Kolkata</option>
                                    <option value="Howrah">Howrah</option>
                                    <option value="Hooghly">Hooghly</option>
                                    <option value="North 24 Parganas">North 24 Parganas</option>
                                    <option value="South 24 Parganas">South 24 Parganas</option>
                                    <option value="Siliguri">Siliguri</option>
                                    <option value="Durgapur">Durgapur</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
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
                                    className="material-input"
                                    placeholder="10-digit mobile number"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterModal(false)}
                                    className="material-button-outlined ripple-dark flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isRegistering}
                                    className="material-button-primary ripple flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRegistering ? 'Processing...' : (isDonor ? 'Update' : 'Register')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
