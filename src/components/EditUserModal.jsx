import React from 'react';

const EditUserModal = ({
    editingUser,
    userProfile,
    handleCancelEdit,
    handleSave,
    activeEditTab,
    setActiveEditTab,
    avatarPreview,
    handleFileChange,
    handleChange,
    wbLocations,
    supervisors
}) => {
    if (!editingUser) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden sm:overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-2xl border-0 sm:border border-slate-100 dark:border-slate-700 animate-scale-in flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-slate-700 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Mobile Back Button */}
                        <button
                            onClick={handleCancelEdit}
                            className="sm:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Edit User Profile</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{editingUser.full_name}</p>
                        </div>
                    </div>
                    <button onClick={handleCancelEdit} className="hidden sm:block text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-6">
                    {/* Tab Navigation */}
                    <div className="flex border-b dark:border-slate-700 mb-6 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveEditTab('basic')}
                            className={`px-4 py-3 sm:py-2 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeEditTab === 'basic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Basic Info
                        </button>
                        <button
                            onClick={() => setActiveEditTab('family')}
                            className={`px-4 py-3 sm:py-2 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeEditTab === 'family' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Family Details
                        </button>
                        <button
                            onClick={() => setActiveEditTab('health')}
                            className={`px-4 py-3 sm:py-2 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeEditTab === 'health' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Health & Safety
                        </button>
                    </div>

                    <div className="flex-1">
                        {activeEditTab === 'basic' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                {/* Left Column - Avatar & Basic Info */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group mb-4">
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-md">
                                            {avatarPreview ? (
                                                <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 text-3xl font-bold">
                                                    {editingUser.full_name ? editingUser.full_name.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </label>
                                        <input id="avatar-upload" type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                                    </div>

                                    <div className="w-full space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                                            <input type="text" name="full_name" value={editingUser.full_name || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                            <input type="email" name="email" value={editingUser.email || ''} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed" readOnly />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Details */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                                            <input type="text" name="phone" value={editingUser.phone || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Blood Group</label>
                                            <select name="blood_group" value={editingUser.blood_group || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                                <option value="">Select Blood Group</option>
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
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">District</label>
                                            <select name="district" value={editingUser.district || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                                <option value="">Select District</option>
                                                {Object.keys(wbLocations).map(district => (
                                                    <option key={district} value={district}>{district}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Block</label>
                                            <select name="block" value={editingUser.block || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" disabled={!editingUser.district}>
                                                <option value="">Select Block</option>
                                                {editingUser.district && wbLocations[editingUser.district]?.map(block => (
                                                    <option key={block} value={block}>{block}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                                        <select name="role" value={editingUser.role || 'lineman'} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" disabled={userProfile?.role === 'safety mitra' && editingUser.role === 'admin'}>
                                            <option value="lineman">Lineman</option>
                                            <option value="safety mitra">Safety Mitra</option>
                                            {userProfile?.role === 'admin' && <option value="admin">Admin</option>}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Job Type</label>
                                        <select name="job" value={editingUser.job || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                            <option value="">Select Job Type</option>
                                            <option value="HT-Mobile Van">HT-Mobile Van</option>
                                            <option value="LT-Mobile Van">LT-Mobile Van</option>
                                            <option value="HT-LT Others">HT-LT Others</option>
                                        </select>
                                    </div>

                                    {userProfile?.role === 'admin' && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Supervisor (Safety Mitra / Admin)</label>
                                            <select
                                                name="supervisor_id"
                                                value={editingUser.supervisor_id || ''}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                            >
                                                <option value="">No Supervisor</option>
                                                {supervisors.map(s => (
                                                    <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex items-center p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <input type="checkbox" id="is_donor" name="is_donor" checked={editingUser.is_donor || false} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                        <label htmlFor="is_donor" className="ml-2 text-xs text-slate-700 dark:text-slate-200 font-medium cursor-pointer">Register as Blood Donor</label>
                                    </div>

                                    {editingUser.is_donor && (
                                        <div className="animate-fade-in">
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Last Donation Date</label>
                                            <input type="date" name="last_donation_date" value={editingUser.last_donation_date || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeEditTab === 'family' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Date of Birth</label>
                                        <input type="date" name="dob" value={editingUser.dob || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Age</label>
                                        <input type="number" name="age" value={editingUser.age || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Education</label>
                                        <input type="text" name="education" value={editingUser.education || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Children Count</label>
                                            <input type="number" name="children_count" value={editingUser.children_count || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Children Ages</label>
                                            <input type="text" name="children_ages" value={editingUser.children_ages || ''} onChange={handleChange} placeholder="e.g. 5, 8" className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center p-2.5 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <input type="checkbox" id="parents_stay" name="parents_stay" checked={editingUser.parents_stay || false} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                            <label htmlFor="parents_stay" className="ml-2 text-xs text-slate-700 dark:text-slate-200 font-medium cursor-pointer">Parents stay with them</label>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Parents' Occupation</label>
                                            <input type="text" name="parents_occupation" value={editingUser.parents_occupation || ''} onChange={handleChange} className="w-full px-4 py-3 sm:py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeEditTab === 'health' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Major Diseases</label>
                                        <textarea name="major_diseases" value={editingUser.major_diseases || ''} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-20 resize-none"></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Regular Medicines</label>
                                        <textarea name="regular_medicines" value={editingUser.regular_medicines || ''} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-20 resize-none"></textarea>
                                    </div>
                                </div>

                                <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                                    <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Accident History
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Count</label>
                                            <input type="number" name="accident_count" value={editingUser.accident_count || 0} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Voltage Level</label>
                                            <select name="accident_voltage" value={editingUser.accident_voltage || ''} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                                <option value="">Select Voltage</option>
                                                <option value="LT">LT (Low Tension)</option>
                                                <option value="11kV">11kV</option>
                                                <option value="33kV">33kV</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Details (When, How, Suffering)</label>
                                        <textarea name="accidents_details" value={editingUser.accidents_details || ''} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-24 resize-none"></textarea>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex justify-end gap-3 bg-white dark:bg-slate-800 shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:shadow-none">
                        <button
                            onClick={handleCancelEdit}
                            className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditUserModal;
