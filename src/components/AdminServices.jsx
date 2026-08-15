import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';
import SaveSuccessModal from './SaveSuccessModal';

const ServiceTableSkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 animate-pulse">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
            </div>
        ))}
    </div>
);

const ServiceItem = React.memo(({ service, serviceTypes, onEdit, onDelete }) => {
    const typeConfig = serviceTypes[service.type] || serviceTypes.hospitals;
    return (
        <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
            <div className="flex items-center gap-4">
                {/* Icon Circle */}
                <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-xl bg-${typeConfig.color}-500/10 dark:bg-${typeConfig.color}-500/20 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400 shadow-sm border border-${typeConfig.color}-500/10`}>
                    {typeConfig.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-black text-slate-900 dark:text-slate-100 text-[17px] leading-tight">{service.name}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-${typeConfig.color}-500/10 text-${typeConfig.color}-600 border border-${typeConfig.color}-500/20`}>
                            {typeConfig.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{service.location || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                            <a href={`tel:${service.phone}`} className="text-orange-600 dark:text-orange-400 active:scale-95 transition-transform inline-block">
                                {service.phone}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(service)}
                        className="p-2 text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                        title="Edit"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(service.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-xl transition-all"
                        title="Delete"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
});

export default function AdminServices({ language = 'en', userProfile }) {
    if (!userProfile || !['admin', 'safety mitra'].includes(userProfile.role)) {
        return (
            <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                <h2 className="text-xl font-bold mb-4">Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [serviceFilter, setServiceFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        title: '',
        message: ''
    });

    const [serviceForm, setServiceForm] = useState({
        name: '',
        type: 'hospitals',
        location: '',
        phone: ''
    });

    const serviceTypes = {
        hospitals: { label: 'Hospital', color: 'orange', icon: '🏥' },
        ambulance: { label: 'Ambulance', color: 'red', icon: '🚑' },
        fire: { label: 'Fire', color: 'orange', icon: '🚒' },
        police: { label: 'Police', color: 'indigo', icon: '👮' },
        power: { label: 'Power', color: 'yellow', icon: '⚡' }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('emergency_services')
                .select('*')
                .order('type', { ascending: true });

            if (error) throw error;
            setServices(data || []);
            cacheHelper.set('emergency_services', data || [], 30);
        } catch (error) {
            console.error('Error fetching services:', error);
            alert('Failed to fetch services');
        } finally {
            setLoading(false);
        }
    };

    const handleAddService = () => {
        setEditingService(null);
        setServiceForm({
            name: '',
            type: 'hospitals',
            location: '',
            phone: ''
        });
        setShowServiceModal(true);
    };

    const handleEditService = (service) => {
        setEditingService(service);
        setServiceForm({
            name: service.name || '',
            type: service.type || 'hospitals',
            location: service.location || '',
            phone: service.phone || ''
        });
        setShowServiceModal(true);
    };

    const handleServiceFormChange = (e) => {
        const { name, value } = e.target;
        setServiceForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveService = async () => {
        if (!serviceForm.name || !serviceForm.phone) {
            alert('Name and phone are required');
            return;
        }

        setLoading(true);
        try {
            if (editingService) {
                const { error } = await supabase
                    .from('emergency_services')
                    .update(serviceForm)
                    .eq('id', editingService.id);

                setSuccessModal({
                    isOpen: true,
                    title: 'Service Updated',
                    message: `${serviceForm.name} has been updated successfully.`
                });
            } else {
                const { error } = await supabase
                    .from('emergency_services')
                    .insert([serviceForm]);

                if (error) throw error;
                setSuccessModal({
                    isOpen: true,
                    title: 'Service Added',
                    message: `${serviceForm.name} has been added to the registry.`
                });
            }

            cacheHelper.clear('emergency_services');
            cacheHelper.clear('emergency_services_v4');
            cacheHelper.clear('emergency_services_v5');
            setShowServiceModal(false);
            fetchServices();
        } catch (error) {
            console.error('Error saving service:', error);
            alert(`Failed to save service: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteService = async (serviceId) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('emergency_services')
                .delete()
                .eq('id', serviceId);

            if (error) throw error;

            cacheHelper.clear('emergency_services');
            cacheHelper.clear('emergency_services_v4');
            cacheHelper.clear('emergency_services_v5');
            setSuccessModal({
                isOpen: true,
                title: 'Service Deleted',
                message: 'The service has been removed from the registry.'
            });
            fetchServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert(`Failed to delete service: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = services.filter(service => {
        const matchesType = serviceFilter === 'all' || service.type === serviceFilter;
        const matchesSearch = !searchQuery ||
            service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.location?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="p-0 sm:p-6 lg:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-950/20">
            <div className="max-w-4xl mx-auto space-y-6 pb-20">

                {/* Modern Header */}
                <div className="px-6 py-8 sm:px-0 sm:py-0 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-orange-600 rounded-full"></span>
                            Services
                        </h1>
                        <p className="mt-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4">
                            Emergency Contacts Management
                        </p>
                    </div>
                    <button
                        onClick={handleAddService}
                        className="p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl shadow-xl shadow-orange-600/20 transition-all active:scale-90 flex items-center gap-2 font-black text-xs uppercase tracking-widest"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="hidden sm:inline">Add Service</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-4 sm:px-0 sticky top-0 z-20 transition-all">
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search name or location..."
                            className="w-full pl-12 pr-4 py-4 rounded-[32px] border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none text-[15px] font-bold text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* Material Filter Chips */}
                <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 no-scrollbar items-center py-2">
                    <button
                        onClick={() => setServiceFilter('all')}
                        className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all shrink-0 ${serviceFilter === 'all'
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md'
                            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-500 border border-slate-100 dark:border-slate-800'
                            }`}
                    >
                        All
                    </button>
                    {Object.entries(serviceTypes).map(([type, config]) => (
                        <button
                            key={type}
                            onClick={() => setServiceFilter(type)}
                            className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 ${serviceFilter === type
                                ? `bg-${config.color}-500/10 text-${config.color}-600 border border-${config.color}-500/30 shadow-sm`
                                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-500 border border-slate-100 dark:border-slate-800'
                                }`}
                        >
                            <span className="text-sm">{config.icon}</span>
                            {config.label}
                        </button>
                    ))}
                </div>

                {/* Services List */}
                <div className="px-4 sm:px-0">
                    {loading ? (
                        <ServiceTableSkeleton />
                    ) : filteredServices.length === 0 ? (
                        <div className="py-12 bg-white dark:bg-slate-900 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl animate-bounce">📋</div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">No Services Found</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Try another search or filter</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/40 dark:shadow-none rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {filteredServices.map((service) => (
                                    <ServiceItem
                                        key={service.id}
                                        service={service}
                                        serviceTypes={serviceTypes}
                                        onEdit={handleEditService}
                                        onDelete={handleDeleteService}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>


                {/* Add/Edit Service Modal */}
                {showServiceModal && createPortal(
                    <div className="fixed inset-0 z-[200] flex sm:items-center sm:justify-center p-0 bg-slate-50 dark:bg-slate-950 sm:bg-slate-900/60 sm:backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[85vh] sm:rounded-[40px] sm:max-w-2xl shadow-2xl flex flex-col animate-scale-in overflow-hidden border-none sm:border dark:border-slate-800 pt-4 sm:pt-0">

                            {/* Native Android Toolbar */}
                            <div className="flex justify-between items-center px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 shrink-0 sticky top-0 z-20">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowServiceModal(false)}
                                        className="p-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-90"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 leading-tight">
                                            {editingService ? 'Edit Service' : 'Add Service'}
                                        </h2>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-orange-600 dark:text-orange-400">
                                            {editingService ? editingService.type : 'New Entry'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveService}
                                    disabled={loading}
                                    className="p-3 bg-red-600 dark:bg-red-500 text-white rounded-2xl shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                                >
                                    {loading ? (
                                        <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Form Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/20">

                                <FormCard title="Identity" color="orange" icon="🪪">
                                    <FormInputField
                                        label="Service Name *"
                                        name="name"
                                        value={serviceForm.name}
                                        onChange={handleServiceFormChange}
                                        icon="🏢"
                                        placeholder="Hospital or Office Name"
                                    />
                                    <FormSelectField
                                        label="Service Type *"
                                        name="type"
                                        value={serviceForm.type}
                                        onChange={handleServiceFormChange}
                                        options={Object.entries(serviceTypes).map(([id, cfg]) => ({ value: id, label: `${cfg.icon} ${cfg.label}` }))}
                                        icon="🏷️"
                                    />
                                </FormCard>

                                <FormCard title="Contact & Details" color="blue" icon="📍">
                                    <FormInputField
                                        label="Phone Number *"
                                        name="phone"
                                        type="tel"
                                        value={serviceForm.phone}
                                        onChange={handleServiceFormChange}
                                        icon="📱"
                                        placeholder="+91 ..."
                                    />
                                    <FormInputField
                                        label="Location"
                                        name="location"
                                        value={serviceForm.location}
                                        onChange={handleServiceFormChange}
                                        icon="🗺️"
                                        placeholder="City or Area"
                                    />
                                </FormCard>

                                <div className="h-4"></div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Success Confirmation Modal */}
                <SaveSuccessModal
                    isOpen={successModal.isOpen}
                    onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
                    title={successModal.title}
                    message={successModal.message}
                />
            </div>
        </div>
    );
}

{/* MD3 Style Form Components */ }

function FormCard({ title, icon, color, children }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800/50 space-y-5">
            <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-400 dark:text-slate-500`}>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm bg-${color}-500/10 text-${color}-500 shadow-inner`}>
                    {icon}
                </span>
                {title}
            </h4>
            <div className="space-y-5">
                {children}
            </div>
        </div>
    );
}

function FormInputField({ label, icon, ...props }) {
    return (
        <div className="relative group">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4 mb-1.5 transition-colors group-focus-within:text-red-600 pulse-dot">{label}</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg filter dark:grayscale-[0.5] group-focus-within:scale-110 transition-transform">{icon}</span>
                <input
                    {...props}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-900 dark:text-slate-100 transition-all outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-red-500/30 focus:ring-4 focus:ring-red-500/5 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
            </div>
        </div>
    );
}

function FormSelectField({ label, icon, options, ...props }) {
    return (
        <div className="relative group">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4 mb-1.5 transition-colors group-focus-within:text-red-600">{label}</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg filter dark:grayscale-[0.5] pointer-events-none group-focus-within:scale-110 transition-transform">{icon}</span>
                <select
                    {...props}
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-900 dark:text-slate-100 transition-all outline-none appearance-none focus:bg-white dark:focus:bg-slate-900 focus:border-red-500/30 focus:ring-4 focus:ring-red-500/5"
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
    );
}

function FormTextAreaField({ label, icon, ...props }) {
    return (
        <div className="relative group">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-4 mb-1.5 transition-colors group-focus-within:text-red-600">{label}</label>
            <div className="relative">
                <span className="absolute left-4 top-4 text-lg filter dark:grayscale-[0.5] group-focus-within:scale-110 transition-transform">{icon}</span>
                <textarea
                    {...props}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-900 dark:text-slate-100 transition-all outline-none min-h-[120px] resize-none focus:bg-white dark:focus:bg-slate-900 focus:border-red-500/30 focus:ring-4 focus:ring-red-500/5 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
            </div>
        </div>
    );
}
