import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';

const ServiceTableSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-600 rounded shimmer"></div>
                        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-600 rounded shimmer"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-8 w-16 bg-slate-200 dark:bg-slate-600 rounded shimmer"></div>
                        <div className="h-8 w-16 bg-slate-200 dark:bg-slate-600 rounded shimmer"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ServiceItem = React.memo(({ service, serviceTypes, onEdit, onDelete }) => {
    const typeConfig = serviceTypes[service.type] || serviceTypes.hospitals;
    return (
        <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{typeConfig.icon}</span>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{service.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold bg-${typeConfig.color}-100 text-${typeConfig.color}-700 dark:bg-${typeConfig.color}-900/30 dark:text-${typeConfig.color}-400`}>
                            {typeConfig.label}
                        </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{service.location || 'No location'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <a href={`tel:${service.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {service.phone}
                            </a>
                        </div>
                        {service.address && (
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                {service.address}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(service)}
                        className="px-3 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(service.id)}
                        className="px-3 py-1.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        Delete
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
    const [serviceForm, setServiceForm] = useState({
        name: '',
        type: 'hospitals',
        location: '',
        phone: '',
        address: '',
        description: ''
    });

    const serviceTypes = {
        hospitals: { label: 'Hospital', color: 'blue', icon: '🏥' },
        ambulance: { label: 'Ambulance', color: 'red', icon: '🚑' },
        fire: { label: 'Fire', color: 'orange', icon: '🚒' },
        police: { label: 'Police', color: 'slate', icon: '👮' },
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
            phone: '',
            address: '',
            description: ''
        });
        setShowServiceModal(true);
    };

    const handleEditService = (service) => {
        setEditingService(service);
        setServiceForm({
            name: service.name || '',
            type: service.type || 'hospitals',
            location: service.location || '',
            phone: service.phone || '',
            address: service.address || '',
            description: service.description || ''
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

                if (error) throw error;
                alert('Service updated successfully!');
            } else {
                const { error } = await supabase
                    .from('emergency_services')
                    .insert([serviceForm]);

                if (error) throw error;
                alert('Service added successfully!');
            }

            cacheHelper.clear('emergency_services');
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
            alert('Service deleted successfully!');
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
        <div className="p-4 sm:p-6 lg:p-8 md:mb-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Emergency Services Management
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Manage emergency contact information for hospitals, ambulances, fire stations, police, and power department
                    </p>
                </div>

                {/* Actions Bar */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex-1 w-full sm:w-auto">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or location..."
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                    </div>
                    <button
                        onClick={handleAddService}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-red-500/20 whitespace-nowrap"
                    >
                        + Add Service
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setServiceFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${serviceFilter === 'all'
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        All ({services.length})
                    </button>
                    {Object.entries(serviceTypes).map(([type, config]) => {
                        const count = services.filter(s => s.type === type).length;
                        return (
                            <button
                                key={type}
                                onClick={() => setServiceFilter(type)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${serviceFilter === type
                                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                    }`}
                            >
                                {config.icon} {config.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Services List */}
                {loading ? (
                    <ServiceTableSkeleton />
                ) : filteredServices.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-4xl mb-4">📋</div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">No Services Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {searchQuery || serviceFilter !== 'all' ? 'Try adjusting your filters' : 'Click "Add Service" to get started'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
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

                {/* Add/Edit Service Modal */}
                {showServiceModal && (
                    <div className="fixed top-0 left-0 right-0 bottom-0 z-[120] p-4 pb-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-100 dark:border-slate-700 overflow-y-auto">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                    {editingService ? 'Edit Service' : 'Add New Service'}
                                </h2>
                            </div>

                            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Service Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={serviceForm.name}
                                            onChange={handleServiceFormChange}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                            placeholder="e.g., City General Hospital"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Type *
                                        </label>
                                        <select
                                            name="type"
                                            value={serviceForm.type}
                                            onChange={handleServiceFormChange}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                        >
                                            {Object.entries(serviceTypes).map(([type, config]) => (
                                                <option key={type} value={type}>{config.icon} {config.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={serviceForm.phone}
                                            onChange={handleServiceFormChange}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                            placeholder="e.g., +91 1234567890"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Location
                                        </label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={serviceForm.location}
                                            onChange={handleServiceFormChange}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                            placeholder="e.g., Kolkata"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Full Address
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={serviceForm.address}
                                        onChange={handleServiceFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                        placeholder="e.g., 123 Main Street, City - 700001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Description / Additional Info
                                    </label>
                                    <textarea
                                        name="description"
                                        value={serviceForm.description}
                                        onChange={handleServiceFormChange}
                                        rows="3"
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                                        placeholder="Any additional information..."
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowServiceModal(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveService}
                                    disabled={loading}
                                    className="px-5 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
