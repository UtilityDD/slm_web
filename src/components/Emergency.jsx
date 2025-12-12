import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Emergency({ language = 'en', user }) {
    const [activeTab, setActiveTab] = useState('blood');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
    const [selectedDistrict, setSelectedDistrict] = useState('All');
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);

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

    // Fetch Donors
    useEffect(() => {
        if (activeTab === 'blood') {
            fetchDonors();
        }
    }, [activeTab, selectedBloodGroup, selectedDistrict]);

    const fetchDonors = async () => {
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
        } catch (error) {
            console.error('Error fetching donors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!user) {
            alert('Please login to register as a donor.');
            return;
        }

        setIsRegistering(true);
        try {
            // Prepare profile updates
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

            // Use upsert to create profile if it doesn't exist
            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            alert(isDonor ? 'Donor profile updated successfully!' : 'Successfully registered as a donor!');
            setIsDonor(true);
            setShowRegisterModal(false);
            fetchDonors(); // Refresh list
        } catch (error) {
            console.error('Error registering:', error);
            alert(`Failed to register: ${error.message || 'Unknown error'}`);
        } finally {
            setIsRegistering(false);
        }
    };

    const t = {
        en: {
            title: "Emergency Response Hub",
            subtitle: "Quick access to life-saving resources and community support.",
            tabs: {
                blood: "Blood Network",
                services: "Emergency Services"
            },
            blood: {
                heroTitle: "Every Drop Counts",
                heroDesc: "Connect with voluntary blood donors in your area or register to save a life.",
                registerBtn: isDonor ? "Update Donor Info" : "Register as Donor",
                findBtn: "Find Donors",
                filters: {
                    group: "Blood Group",
                    district: "District/Zone"
                },
                donorsFound: "Donors Found",
                lastDonated: "Last Donated",
                call: "Call Now",
                unavailable: "Unavailable"
            },
            services: {
                hospitals: "Hospitals",
                ambulance: "Ambulance",
                fire: "Fire Station",
                police: "Police",
                power: "Power Dept (WBSEDCL)",
                call: "Call",
                directions: "Directions"
            }
        },
        bn: {
            title: "জরুরি পরিষেবা হাব",
            subtitle: "জীবন রক্ষাকারী রিসোর্স এবং কমিউনিটি সাপোর্টে দ্রুত অ্যাক্সেস।",
            tabs: {
                blood: "রক্তের নেটওয়ার্ক",
                services: "জরুরি পরিষেবা"
            },
            blood: {
                heroTitle: "প্রতিটি ফোঁটা মূল্যবান",
                heroDesc: "আপনার এলাকার রক্তদাতাদের সাথে যোগাযোগ করুন বা জীবন বাঁচাতে নিবন্ধন করুন।",
                registerBtn: isDonor ? "রক্তদাতা তথ্য আপডেট করুন" : "রক্তদাতা হিসেবে নিবন্ধন করুন",
                findBtn: "রক্তদাতা খুঁজুন",
                filters: {
                    group: "রক্তের গ্রুপ",
                    district: "জেলা/জোন"
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
                power: "বিদ্যুৎ দপ্তর (WBSEDCL)",
                call: "কল",
                directions: "দিকনির্দেশ"
            }
        }
    }[language];

    const services = [
        { id: 1, type: "hospitals", name: "SSKM Hospital", location: "Kolkata", phone: "033 2223 6001", distance: "2.5 km" },
        { id: 2, type: "hospitals", name: "Howrah District Hospital", location: "Howrah", phone: "033 2641 2000", distance: "5.1 km" },
        { id: 3, type: "fire", name: "Fire Brigade HQ", location: "Kolkata", phone: "101", distance: "3.0 km" },
        { id: 4, type: "police", name: "Lalbazar Police HQ", location: "Kolkata", phone: "100", distance: "4.2 km" },
        { id: 5, type: "power", name: "WBSEDCL Control Room", location: "Salt Lake", phone: "1912", distance: "6.5 km" },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-8 text-center">
                <div className="inline-block p-3 rounded-full bg-red-100 text-red-600 text-3xl mb-4 animate-pulse">
                    🚑
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                    {language === 'en' ? (
                        <>Emergency <span className="text-red-600">Response</span></>
                    ) : (
                        <>{t.title}</>
                    )}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    {t.subtitle}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-10">
                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                    <button
                        onClick={() => setActiveTab('blood')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'blood'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <span>🩸</span> {t.tabs.blood}
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'services'
                            ? 'bg-blue-700 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <span>🏥</span> {t.tabs.services}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'blood' ? (
                <div className="animate-slide-down">
                    {/* Blood Network Hero */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-3xl p-8 sm:p-12 text-white mb-10 relative overflow-hidden shadow-xl shadow-red-900/20">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="text-center md:text-left">
                                <h2 className="text-3xl font-bold mb-4">{t.blood.heroTitle}</h2>
                                <p className="text-red-100 text-lg mb-8 max-w-xl">
                                    {t.blood.heroDesc}
                                </p>
                                <button
                                    onClick={() => {
                                        if (!user) alert('Please login first');
                                        else setShowRegisterModal(true);
                                    }}
                                    className="px-8 py-3 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all shadow-lg"
                                >
                                    {t.blood.registerBtn}
                                </button>
                            </div>
                            <div className="text-9xl opacity-20 animate-pulse">
                                ❤️
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">{t.blood.filters.group}</label>
                                <select
                                    value={selectedBloodGroup}
                                    onChange={(e) => setSelectedBloodGroup(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500 bg-slate-50"
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
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">{t.blood.filters.district}</label>
                                <select
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-red-500 bg-slate-50"
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
                            <div className="flex items-end">
                                <button
                                    onClick={fetchDonors}
                                    className="w-full px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                                >
                                    {t.blood.findBtn}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Grid */}
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Searching donors...</div>
                    ) : donors.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No donors found matching your criteria.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {donors.map((donor) => (
                                <div key={donor.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-red-100 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-100">
                                                {donor.blood_group}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{donor.full_name || 'Unknown'}</h3>
                                                <div className="text-xs text-slate-500">{donor.district}</div>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-md">Available</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg">
                                        <span>🕒</span>
                                        <span>{t.blood.lastDonated}: <span className="font-medium text-slate-700">{donor.last_donation_date || 'N/A'}</span></span>
                                    </div>

                                    <a href={`tel:${donor.phone}`} className="block w-full">
                                        <button className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-red-200">
                                            <span>📞</span> {t.blood.call}
                                        </button>
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-slide-down">
                    {/* Services Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service) => (
                            <div key={service.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${service.type === 'hospitals' ? 'bg-blue-50 text-blue-600' :
                                        service.type === 'fire' ? 'bg-orange-50 text-orange-600' :
                                            service.type === 'police' ? 'bg-slate-100 text-slate-600' :
                                                service.type === 'power' ? 'bg-yellow-50 text-yellow-600' :
                                                    'bg-slate-50 text-slate-600'
                                        }`}>
                                        {service.type === 'hospitals' ? '🏥' :
                                            service.type === 'fire' ? '🚒' :
                                                service.type === 'police' ? '👮' :
                                                    service.type === 'power' ? '⚡' : '🚑'}
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{service.distance}</span>
                                </div>

                                <h3 className="font-bold text-lg text-slate-900 mb-1">{service.name}</h3>
                                <p className="text-sm text-slate-500 mb-6">{service.location}</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <button className="py-2.5 bg-slate-50 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-all text-sm">
                                        {t.services.directions}
                                    </button>
                                    <button className="py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-green-200">
                                        <span>📞</span> {t.services.call}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">
                                {isDonor ? (language === 'en' ? 'Update Donor Profile' : 'রক্তদাতা প্রোফাইল আপডেট') : (language === 'en' ? 'Register as Blood Donor' : 'রক্তদাতা হিসেবে নিবন্ধন')}
                            </h3>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={regForm.fullName}
                                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500 bg-slate-50"
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                                    <select
                                        required
                                        value={regForm.bloodGroup}
                                        onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500"
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Donated</label>
                                    <input
                                        type="date"
                                        value={regForm.lastDonated}
                                        onChange={(e) => setRegForm({ ...regForm, lastDonated: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                                <select
                                    required
                                    value={regForm.district}
                                    onChange={(e) => setRegForm({ ...regForm, district: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500"
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
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    required
                                    value={regForm.phone}
                                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500"
                                    placeholder="+91"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isRegistering}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md disabled:opacity-70"
                                >
                                    {isRegistering ? 'Processing...' : (isDonor ? 'Update Profile' : 'Register Now')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
