import React from 'react';
import { createPortal } from 'react-dom';

export default function EditUserModal({
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
    supervisors,
    onOpenDeleteConfirm
}) {
    if (!editingUser) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center p-0 bg-slate-50 dark:bg-slate-950 sm:bg-slate-900/60 sm:backdrop-blur-sm animate-fade-in safe-area-inset-top">
            {/* Modal Container */}
            <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[92vh] sm:rounded-[32px] sm:max-w-2xl shadow-2xl flex flex-col animate-scale-in overflow-hidden border-none sm:border dark:border-slate-800 pt-4 sm:pt-0">

                {/* Android Native Toolbar */}
                <div className="flex justify-between items-center px-2 py-3 sm:p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 shrink-0 sticky top-0 z-20">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCancelEdit}
                            className="p-3 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-90"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 leading-tight">Edit Profile</h2>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-orange-600 dark:text-orange-400">
                                {editingUser.role || 'Member'} • {editingUser.slm_id || 'ID N/A'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className="mr-2 p-3 bg-orange-600 dark:bg-orange-500 text-white rounded-full shadow-lg shadow-orange-600/30 hover:bg-orange-700 dark:hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center"
                        title="Save Changes"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">

                    {/* Header: Avatar Selection */}
                    <div className="bg-white dark:bg-slate-900 px-6 py-8 flex flex-col items-center">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-[40px] overflow-hidden border-[6px] border-white dark:border-slate-800 shadow-xl relative group">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-4xl font-black">
                                        {editingUser.full_name ? editingUser.full_name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <label
                                htmlFor="avatar-upload-redesign"
                                className="absolute -bottom-2 -right-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer shadow-xl border-4 border-white dark:border-slate-900 hover:scale-110 transition-transform active:scale-95 z-30"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                </svg>
                            </label>
                            <input id="avatar-upload-redesign" type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">{editingUser.full_name || 'Set Your Name'}</h3>
                    </div>

                    {/* MD3 Style Pill Tabs */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-6 py-2 flex gap-4 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'basic', label: 'Basic' },
                            { id: 'family', label: 'Family' },
                            { id: 'health', label: 'Safety' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveEditTab(tab.id)}
                                className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${activeEditTab === tab.id
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 active:scale-95'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Form Sections */}
                    <div className="p-6 space-y-6">
                        {activeEditTab === 'basic' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Personal Info Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                        Personal Information
                                    </h4>
                                    <div className="space-y-5">
                                        <InputField
                                            label="Full Name"
                                            name="full_name"
                                            value={editingUser.full_name}
                                            onChange={handleChange}
                                            readOnly={userProfile?.role !== 'admin'}
                                            icon="👤"
                                        />
                                        <InputField label="Email Address" name="email" value={editingUser.email} readOnly icon="📧" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField
                                                label="Phone"
                                                name="phone_number"
                                                value={editingUser.phone_number || editingUser.phone}
                                                onChange={handleChange}
                                                readOnly={true}
                                                icon="📱"
                                            />
                                            <SelectField label="Blood Group" name="blood_group" value={editingUser.blood_group} onChange={handleChange} options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} icon="🩸" />
                                        </div>
                                    </div>
                                </div>

                                {/* Location & Work Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        Location & Work
                                    </h4>
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectField label="District" name="district" value={editingUser.district} onChange={handleChange} options={Object.keys(wbLocations)} icon="📍" placeholder="Select District" />
                                            <SelectField label="Block" name="block" value={editingUser.block} onChange={handleChange} options={editingUser.district ? wbLocations[editingUser.district] : []} disabled={!editingUser.district} icon="🗺️" placeholder="Select Block" />
                                        </div>
                                        <SelectField label="Job Type" name="job" value={editingUser.job} onChange={handleChange} options={['HT-Mobile Van', 'LT-Mobile Van', 'HT-LT Others']} icon="👷" placeholder="Select Job Type" />
                                        <SelectField label="Role" name="role" value={editingUser.role} onChange={handleChange} options={['lineman', 'safety mitra', ...(userProfile?.role === 'admin' ? ['admin'] : [])]} disabled={userProfile?.role !== 'admin'} icon="🎖️" />
                                        {userProfile?.role === 'admin' && (
                                            <SelectField
                                                label="Supervisor"
                                                name="supervisor_id"
                                                value={editingUser.supervisor_id}
                                                onChange={handleChange}
                                                options={supervisors.map(s => ({ value: s.id, label: `${s.full_name} (${s.role})` }))}
                                                icon="👔"
                                                placeholder="No Supervisor"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Donor Toggle */}
                                <div className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${editingUser.is_donor ? 'bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30' : 'bg-white border-transparent dark:bg-slate-800'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${editingUser.is_donor ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>🩸</div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-slate-100">Blood Donor</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Join the rescue mission</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" name="is_donor" checked={editingUser.is_donor} onChange={handleChange} className="sr-only peer" />
                                        <div className="w-14 h-8 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-500"></div>
                                    </label>
                                </div>
                                {editingUser.is_donor && (
                                    <div className="animate-fade-in bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                        <InputField label="Last Donation Date" name="last_donation_date" type="date" value={editingUser.last_donation_date} onChange={handleChange} icon="📅" />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeEditTab === 'family' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Life Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                        <InputField label="Date of Birth" name="dob" type="date" value={editingUser.dob} onChange={handleChange} icon="🎂" />
                                        <InputField label="Age" name="age" type="number" value={editingUser.age} onChange={handleChange} icon="🔢" />
                                    </div>
                                    <InputField label="Education" name="education" value={editingUser.education} onChange={handleChange} icon="🎓" />
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                        Family
                                    </h4>
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField label="Children Count" name="children_count" type="number" value={editingUser.children_count} onChange={handleChange} icon="👶" />
                                            <InputField label="Children Ages" name="children_ages" value={editingUser.children_ages} onChange={handleChange} placeholder="5, 8" icon="🎂" />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">🏡</span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Live with Parents?</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" name="parents_stay" checked={editingUser.parents_stay} onChange={handleChange} className="sr-only peer" />
                                                <div className="w-12 h-7 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-purple-500"></div>
                                            </label>
                                        </div>
                                        <InputField label="Parents' Occupation" name="parents_occupation" value={editingUser.parents_occupation} onChange={handleChange} icon="💼" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeEditTab === 'health' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                        Health Status
                                    </h4>
                                    <div className="space-y-5">
                                        <TextAreaField label="Major Diseases" name="major_diseases" value={editingUser.major_diseases} onChange={handleChange} placeholder="List any chronic conditions" icon="🏥" />
                                        <TextAreaField label="Regular Medicines" name="regular_medicines" value={editingUser.regular_medicines} onChange={handleChange} placeholder="Daily medications..." icon="💊" />
                                    </div>
                                </div>

                                <div className="bg-red-500/5 dark:bg-red-500/10 rounded-3xl p-6 border-2 border-red-100 dark:border-red-900/20">
                                    <h4 className="text-xs font-black text-red-500 dark:text-red-400 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Accident History
                                    </h4>
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField label="Total Count" name="accident_count" type="number" value={editingUser.accident_count} onChange={handleChange} icon="💥" />
                                            <SelectField label="Highest Voltage" name="accident_voltage" value={editingUser.accident_voltage} onChange={handleChange} options={['LT', '11kV', '33kV', 'Other']} icon="⚡" />
                                        </div>
                                        <TextAreaField label="Accident Details" name="accidents_details" value={editingUser.accidents_details} onChange={handleChange} placeholder="Describe the incidents (Date, Cause, Recovery)" icon="📝" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Danger Zone - Admin Only */}
                        {userProfile?.role === 'admin' && (
                            <div className="pt-4 animate-fade-in">
                                <div className="p-6 rounded-3xl border-2 border-red-100 dark:border-red-900/20 bg-red-500/5 dark:bg-red-500/10 mb-2">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-2xl shadow-sm">
                                            ⚠️
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-red-600 dark:text-red-400">Danger Zone</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                                Deleting this user will permanently remove their profile, equipment records, posts, and history.
                                                This action <strong>cannot be undone</strong>.
                                            </p>
                                            <button
                                                onClick={() => onOpenDeleteConfirm(editingUser)}
                                                className="w-full py-3.5 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl font-black text-sm hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all active:scale-95 shadow-sm"
                                            >
                                                Delete User Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Padding for Scroll */}
                    <div className="h-24 sm:h-8 shrink-0"></div>
                </div>

                {/* Desktop Specific Floating Footer */}
                <div className="hidden sm:flex border-t dark:border-slate-800 px-8 py-5 bg-white dark:bg-slate-900 gap-4 justify-end shrink-0">
                    <button
                        onClick={handleCancelEdit}
                        className="px-8 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 rounded-2xl font-bold bg-orange-600 dark:bg-orange-500 text-white shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all active:scale-95 flex items-center gap-2"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

{/* Refactored UI Components for better Redesign Consistency */ }

function InputField({ label, icon, ...props }) {
    return (
        <div className="relative group">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 transition-colors group-focus-within:text-orange-600 pulse-dot">{label}</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg filter dark:grayscale-[0.5]">{icon}</span>
                <input
                    {...props}
                    value={props.value ?? ''}
                    className={`w-full pl-12 pr-4 py-4 sm:py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-900 dark:text-slate-100 transition-all outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5 ${props.readOnly ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : ''}`}
                />
            </div>
        </div>
    );
}

function SelectField({ label, icon, options, placeholder, ...props }) {
    return (
        <div className="relative group">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 transition-colors group-focus-within:text-orange-600">{label}</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg filter dark:grayscale-[0.5] pointer-events-none">{icon}</span>
                <select
                    {...props}
                    value={props.value ?? ''}
                    className="w-full pl-12 pr-10 py-4 sm:py-3.5 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-900 dark:text-slate-100 transition-all outline-none appearance-none focus:bg-white dark:focus:bg-slate-900 focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5 disabled:opacity-50"
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map(opt => {
                        const val = typeof opt === 'string' ? opt : opt.value;
                        const lbl = typeof opt === 'string' ? opt : opt.label;
                        return <option key={val} value={val}>{lbl}</option>;
                    })}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
    );
}

function TextAreaField({ label, icon, ...props }) {
    return (
        <div className="relative group">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 mb-1.5 transition-colors group-focus-within:text-orange-600">{label}</label>
            <div className="relative">
                <span className="absolute left-4 top-5 text-lg filter dark:grayscale-[0.5]">{icon}</span>
                <textarea
                    {...props}
                    value={props.value ?? ''}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent rounded-[24px] text-sm font-bold text-slate-900 dark:text-slate-100 transition-all outline-none min-h-[120px] resize-none focus:bg-white dark:focus:bg-slate-900 focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5"
                />
            </div>
        </div>
    );
}
