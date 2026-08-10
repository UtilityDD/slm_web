import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';
import wbLocations from '../data/wb_locations.json';

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

// Skeleton Loaders
const DonorCardSkeleton = () => (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-200 shimmer"></div>
                <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 rounded shimmer"></div>
                    <div className="h-3 w-16 bg-slate-200 rounded shimmer"></div>
                </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 shimmer"></div>
        </div>
    </div>
);

const ServiceCardSkeleton = () => (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-200 shimmer"></div>
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-slate-200 rounded shimmer"></div>
                    <div className="h-3 w-24 bg-slate-200 rounded shimmer"></div>
                </div>
            </div>
        </div>
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 rounded shimmer"></div>
                <div className="h-3 flex-1 bg-slate-200 rounded shimmer"></div>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 rounded shimmer"></div>
                <div className="h-3 flex-1 bg-slate-200 rounded shimmer"></div>
            </div>
        </div>
        <div className="h-10 w-full bg-slate-200 rounded-xl shimmer mt-4"></div>
    </div>
);

const EmptyState = ({ icon, title, message, language }) => (
    <div className="text-center py-12 px-4">
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



const DonorCard = React.memo(({ donor, isExpanded, onToggle, t }) => (
    <div
        onClick={onToggle}
        className={`rounded-2xl bg-white p-3.5 border shadow-sm transition-all cursor-pointer ${isExpanded ? 'border-red-300 ring-2 ring-red-200/60' : 'border-slate-200/80 hover:-translate-y-0.5 hover:shadow-md'}`}
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-red-100 flex-shrink-0 flex items-center justify-center shadow-sm">
                    <span className="text-red-600 font-black text-sm">{donor.blood_group}</span>
                </div>
                <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-sm truncate">{donor.full_name || 'Unknown'}</h3>
                    <p className="text-xs text-slate-500 font-semibold truncate">{donor.block ? `${donor.block}, ` : ''}{donor.district}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-100"></span>
                <a
                    href={`tel:${donor.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0"
                >
                    <button className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-sm transition-all hover:bg-red-600 hover:text-white active:scale-95">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                </a>
            </div>
        </div>

        {isExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">{t.blood.lastDonated}:</span>
                    <span className="font-black text-slate-700">{donor.last_donation_date || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Contact:</span>
                    <span className="font-black text-slate-700">{donor.phone}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Status:</span>
                    <span className="text-green-600 font-black">Available</span>
                </div>
            </div>
        )}
    </div>
));

const ServiceCard = React.memo(({ service, config, isExpanded, onToggle }) => {
    const colors = getServiceColor(config.color);
    return (
        <div
            onClick={onToggle}
            className={`rounded-2xl bg-white p-3.5 border shadow-sm transition-all cursor-pointer ${isExpanded ? 'border-orange-300 ring-2 ring-orange-200/60' : 'border-slate-200/80 hover:-translate-y-0.5 hover:shadow-md'}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl shadow-sm ${colors.iconBg}`}>
                        {SERVICE_EMOJI[config.icon] || SERVICE_EMOJI.other}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-black text-slate-900 text-sm truncate">{service.name}</h4>
                        <p className="text-xs text-slate-500 font-semibold truncate">{service.location}</p>
                    </div>
                </div>
                <a
                    href={`tel:${service.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0"
                    aria-label="Call"
                >
                    <button
                        type="button"
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-95 ${colors.call}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </button>
                </a>
            </div>

            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 animate-fade-in space-y-2">
                    <div className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{service.address || service.location || 'Address not available'}</p>
                    </div>
                    {service.description && (
                        <div className="flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">{service.description}</p>
                        </div>
                    )}
                    {service.phone && (
                        <a
                            href={`tel:${service.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`mt-1 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-sm font-black text-white shadow-md transition-all active:scale-[0.98] ${
                                config.color === 'red' ? 'bg-red-500 shadow-red-500/30' :
                                config.color === 'blue' ? 'bg-blue-600 shadow-blue-500/30' :
                                config.color === 'yellow' ? 'bg-amber-500 shadow-amber-500/30' :
                                config.color === 'orange' ? 'bg-orange-500 shadow-orange-500/30' :
                                'bg-slate-800 shadow-slate-800/30'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {service.phone}
                        </a>
                    )}
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
                    bloodGroup: data.blood_group || '',
                    lastDonated: data.last_donation_date || '',
                    district: data.district || '',
                    block: data.block || '',
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
    }, [activeTab, selectedBloodGroup, selectedDistrict, selectedBlock]);

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
        const cacheKey = `donors_${selectedBloodGroup}_${selectedDistrict}_${selectedBlock}`;
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
            if (selectedBlock !== 'All') {
                query = query.eq('block', selectedBlock);
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

    const renderServices = () => {
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
                <EmptyState
                    icon="🔍"
                    language={language}
                    title={language === 'en' ? 'No Results' : 'কোন ফলাফল নেই'}
                    message={language === 'en' ? 'No services found' : 'কোন পরিষেবা পাওয়া যায়নি'}
                />
            );
        }

        // If specific category selected, show flat list
        if (activeCategory !== 'all') {
            const type = activeCategory;
            const typeConfig = {
                hospitals: { label: t.services.hospitals, icon: 'hospital', color: 'blue' },
                ambulance: { label: t.services.ambulance, icon: 'ambulance', color: 'red' },
                fire: { label: t.services.fire, icon: 'fire', color: 'orange' },
                police: { label: t.services.police, icon: 'police', color: 'slate' },
                power: { label: t.services.power, icon: 'power', color: 'yellow' }
            };
            const config = typeConfig[type] || { label: type, icon: 'other', color: 'slate' };

            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredServices.map((service) => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            config={config}
                            isExpanded={expandedServiceId === service.id}
                            onToggle={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                        />
                    ))}
                </div>
            );
        }

        // Grouped view (activeCategory === 'all')
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

        return (
            <div className="space-y-5">
                {typeOrder.map(type => {
                    const servicesOfType = groupedServices[type];
                    if (!servicesOfType?.length) return null;
                    const config = typeConfig[type];
                    const colors = getServiceColor(config.color);

                    return (
                        <div key={type} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4 flex items-center gap-3 border-b border-slate-200/80 pb-3">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-sm ${colors.iconBg}`}>
                                    {SERVICE_EMOJI[config.icon] || SERVICE_EMOJI.other}
                                </div>
                                <div className="min-w-0">
                                    <h3 className={`font-black text-slate-900 ${language === 'bn' ? 'font-bengali' : ''}`}>{config.label}</h3>
                                    <p className={`text-xs font-semibold text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {servicesOfType.length} {language === 'en' ? 'services available' : 'টি পরিষেবা উপলব্ধ'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {servicesOfType.map((service) => (
                                    <ServiceCard
                                        key={service.id}
                                        service={service}
                                        config={config}
                                        isExpanded={expandedServiceId === service.id}
                                        onToggle={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const filterSelectClass =
        'w-full rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60 disabled:opacity-50';

    return (
        <div className="min-h-screen bg-[#fffdf7] pb-24 text-slate-900">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 md:mb-6">
            <Toast message={toast.message} type={toast.type} show={toast.show} onDismiss={() => setToast(t => ({ ...t, show: false }))} />

            {/* Header */}
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <p className={`mb-0.5 text-[11px] font-black uppercase tracking-wider text-orange-600 ${language === 'bn' ? 'font-bengali normal-case tracking-normal' : ''}`}>
                        {language === 'en' ? 'Quick help' : 'দ্রুত সাহায্য'}
                    </p>
                    <h1 className={`text-xl font-black tracking-tight text-slate-900 sm:text-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {t.title}
                    </h1>
                </div>

                <div className={`flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-black text-red-700 shadow-sm sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                    <span className="text-base" aria-hidden>🚨</span>
                    {language === 'en' ? 'Emergency' : 'জরুরি'}
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-5">
                <div className="inline-flex w-full gap-1 rounded-full border border-slate-200/80 bg-white p-1 shadow-sm sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('blood')}
                        className={`min-h-[44px] flex-1 rounded-full px-5 py-2.5 text-xs font-black transition-all active:scale-[0.98] sm:flex-none sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
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
                        className={`min-h-[44px] flex-1 rounded-full px-5 py-2.5 text-xs font-black transition-all active:scale-[0.98] sm:flex-none sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
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
                <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                        <div
                            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-orange-300 to-red-400 opacity-80"
                            aria-hidden="true"
                        />
                        <div className="flex items-center justify-between gap-4 pt-1">
                            <div className="min-w-0 flex-1">
                                <h2 className={`mb-3 text-base font-black text-slate-900 sm:text-lg ${language === 'bn' ? 'font-bengali' : ''}`}>
                                    {t.blood.heroTitle}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!user) setCurrentView('login');
                                        else setShowRegisterModal(true);
                                    }}
                                    className={`rounded-full bg-red-500 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-red-500/30 transition-all active:scale-95 ${language === 'bn' ? 'font-bengali' : ''}`}
                                >
                                    {t.blood.registerBtn}
                                </button>
                            </div>
                            <div className="hidden text-5xl opacity-25 sm:block" aria-hidden>
                                ❤️
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                                <select
                                    value={selectedBloodGroup}
                                    onChange={(e) => setSelectedBloodGroup(e.target.value)}
                                    className={filterSelectClass}
                                    aria-label={t.blood.filters.group}
                                >
                                    <option value="All">{language === 'en' ? 'All Groups' : 'সব গ্রুপ'}</option>
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
                                    onChange={(e) => {
                                        setSelectedDistrict(e.target.value);
                                        setSelectedBlock('All');
                                    }}
                                    className={filterSelectClass}
                                    aria-label={t.blood.filters.district}
                                >
                                    <option value="All">{language === 'en' ? 'All Districts' : 'সব জেলা'}</option>
                                    {Object.keys(wbLocations).sort().map(dist => (
                                        <option key={dist} value={dist}>{dist}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedBlock}
                                    onChange={(e) => setSelectedBlock(e.target.value)}
                                    disabled={selectedDistrict === 'All'}
                                    className={`${filterSelectClass} sm:col-span-1`}
                                    aria-label={language === 'en' ? 'Block' : 'ব্লক'}
                                >
                                    <option value="All">{language === 'en' ? 'All Blocks' : 'সব ব্লক'}</option>
                                    {selectedDistrict !== 'All' && wbLocations[selectedDistrict]?.map(block => (
                                        <option key={block} value={block}>{block}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={fetchDonors}
                                className={`flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-95 ${language === 'bn' ? 'font-bengali' : ''}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {t.blood.findBtn}
                            </button>
                        </div>
                    </div>

                    {!loading && donors.length > 0 && (
                        <p className={`text-xs font-black text-slate-500 ${language === 'bn' ? 'font-bengali' : 'uppercase tracking-wider'}`}>
                            {donors.length} {t.blood.donorsFound}
                        </p>
                    )}

                    {/* Results */}
                    {loading ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            <DonorCardSkeleton />
                            <DonorCardSkeleton />
                            <DonorCardSkeleton />
                        </div>
                    ) : donors.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            language={language}
                            title={language === 'en' ? 'No Donors Found' : 'কোন রক্তদাতা পাওয়া যায়নি'}
                            message={language === 'en' ? 'No donors match your search criteria. Try adjusting filters.' : 'আপনার অনুসন্ধানের সাথে মিল নেই। ফিল্টার পরিবর্তন করে দেখুন।'}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {donors.map((donor) => (
                                <DonorCard
                                    key={donor.id}
                                    donor={donor}
                                    isExpanded={expandedDonorId === donor.id}
                                    onToggle={() => setExpandedDonorId(expandedDonorId === donor.id ? null : donor.id)}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {loading ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                            language={language}
                            title={language === 'en' ? 'No Services Found' : 'কোন পরিষেবা পাওয়া যায়নি'}
                            message={language === 'en' ? 'Emergency services data is currently unavailable.' : 'জরুরি পরিষেবার তথ্য এখন উপলব্ধ নয়।'}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
                                <div className="relative">
                                    <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={serviceSearch}
                                        onChange={(e) => setServiceSearch(e.target.value)}
                                        placeholder={language === 'en' ? 'Search services by name or location...' : 'নাম বা অবস্থান দ্বারা সার্চ করুন...'}
                                        className={`w-full rounded-2xl border border-slate-200/80 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-orange-50/40 focus:ring-2 focus:ring-orange-200/60 ${language === 'bn' ? 'font-bengali' : ''}`}
                                    />
                                    {serviceSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setServiceSearch('')}
                                            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
                                            aria-label={language === 'en' ? 'Clear search' : 'সার্চ মুছুন'}
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto pb-1 no-scrollbar">
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
                                        const colors = getServiceColor(config.color);
                                        const isActive = activeCategory === type;

                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setActiveCategory(type)}
                                                className={`flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-black transition-all active:scale-95 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''} ${
                                                    isActive
                                                        ? `${colors.activePill} border-transparent shadow-md`
                                                        : 'border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-orange-50'
                                                }`}
                                            >
                                                <span aria-hidden>{SERVICE_EMOJI[config.icon] || '🗂️'}</span>
                                                <span>{config.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {renderServices()}
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
