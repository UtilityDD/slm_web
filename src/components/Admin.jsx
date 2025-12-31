import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';
import wbLocations from '../data/wb_locations.json';

import EditUserModal from './EditUserModal';

const UserTableSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
      <thead className="bg-gray-50 dark:bg-slate-700">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Full Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Email</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Role</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">District</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i}>
            <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div></td>
            <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div></td>
            <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div></td>
            <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded shimmer"></div></td>
            <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded shimmer ml-auto"></div></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SuccessModal = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  const t = {
    en: {
      title: 'Success!',
      message: 'User profile has been updated successfully.',
      close: 'Close'
    },
    bn: {
      title: 'সফল!',
      message: 'ব্যবহারকারীর প্রোফাইল সফলভাবে আপডেট করা হয়েছে।',
      close: 'বন্ধ করুন'
    }
  }[language || 'en'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100 dark:border-slate-700 animate-scale-in">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ✓
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{t.title}</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6">{t.message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-white transition-colors"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

export default function Admin({ user, userProfile, language, setCurrentView }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('basic'); // 'basic', 'family', 'health'

  /* Pagination State */
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage] = useState(20);



  /* PPE Management State */
  const [editingPPEUser, setEditingPPEUser] = useState(null);
  const [ppeChecklist, setPpeChecklist] = useState([]);
  const [isSavingPPE, setIsSavingPPE] = useState(false);

  /* Notification State */
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info'
  });
  const [supervisors, setSupervisors] = useState([]);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, userProfile?.role]);

  useEffect(() => {
    const fetchSupervisors = async () => {
      if (userProfile?.role !== 'admin') return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('role', ['admin', 'safety mitra'])
          .order('full_name');
        if (error) throw error;
        setSupervisors(data || []);
      } catch (err) {
        console.error('Error fetching supervisors:', err);
      }
    };
    fetchSupervisors();
  }, [userProfile?.role]);

  const fetchUsers = async (page = 1) => {
    // Check cache for this specific page and role
    const cacheKey = `admin_users_${userProfile?.role}_${userProfile?.role === 'safety mitra' ? user.id : 'all'}_page_${page}`;
    const cachedData = cacheHelper.get(cacheKey);
    if (cachedData) {
      setUsers(cachedData.users);
      setTotalUsers(cachedData.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(false);
    try {
      const start = (page - 1) * usersPerPage;
      const end = start + usersPerPage - 1;

      // Fetch paginated users with total count
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, district, block, avatar_url, created_at, dob, age, education, children_count, children_ages, parents_stay, parents_occupation, major_diseases, regular_medicines, accidents_details, accident_count, accident_voltage, is_donor, last_donation_date, blood_group, phone, supervisor_id', { count: 'exact' });

      // If Safety Mitra, only show their team
      if (userProfile?.role === 'safety mitra') {
        query = query.eq('supervisor_id', user.id);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      setUsers(data || []);
      setTotalUsers(count || 0);

      // Cache this page
      cacheHelper.set(cacheKey, { users: data || [], total: count || 0 }, 5); // 5 min cache
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  /* PPE Logic */
  const PPE_ITEMS = [
    { name: "Safety Helmet", icon: "🪖" },
    { name: "Safety Shoes/Boots", icon: "🥾" },
    { name: "Insulated Gloves", icon: "🧤" },
    { name: "Reflective Jacket", icon: "🦺" },
    { name: "Safety Belt", icon: "🧗" },
    { name: "Full Body Harness", icon: "🧗‍♂️" },
    { name: "Voltage Detector", icon: "🔌" },
    { name: "Discharge Rod", icon: "🦯" },
    { name: "Safety Goggles", icon: "🥽" },
    { name: "Raincoat", icon: "🧥" },
    { name: "Torch/Emergency Light", icon: "🔦" }
  ];

  const handleEditPPE = async (targetUser) => {
    setEditingPPEUser(targetUser);
    setPpeChecklist([]); // Reset while loading

    try {
      const { data: fetchedData, error } = await supabase
        .from('user_ppe')
        .select('*')
        .eq('user_id', targetUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const data = fetchedData || [];

      // Initialize checklist based on fetched data
      const checklist = PPE_ITEMS.map(item => {
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
      setPpeChecklist(checklist);

    } catch (error) {
      console.error('Error fetching user PPE:', error);
      alert('Failed to fetch PPE data');
    }
  };

  const handlePPEChecklistChange = (index, field, value) => {
    const updated = [...ppeChecklist];
    updated[index] = { ...updated[index], [field]: value };
    setPpeChecklist(updated);
  };

  const handleSaveUserPPE = async () => {
    if (!editingPPEUser) return;
    setIsSavingPPE(true);

    try {
      for (const item of ppeChecklist) {
        const ageMonths = item.age === '<6m' ? 3 :
          item.age === '6-12m' ? 9 :
            item.age === '1-2y' ? 18 : 36;

        const details = `Usage: ${item.usage}`;

        if (item.available) {
          if (item.id) {
            // Update
            await supabase.from('user_ppe').update({
              count: parseInt(item.count),
              condition: item.condition,
              age_months: ageMonths,
              details: details
            }).eq('id', item.id);
          } else {
            // Insert
            await supabase.from('user_ppe').insert([{
              user_id: editingPPEUser.id,
              name: item.name,
              count: parseInt(item.count),
              condition: item.condition,
              age_months: ageMonths,
              details: details
            }]);
          }
        } else if (item.id) {
          // Delete if it was available but now unchecked
          await supabase.from('user_ppe').delete().eq('id', item.id);
        }
      }

      // Clear cache for this user so they see updates immediately
      cacheHelper.clear(`user_ppe_${editingPPEUser.id}`);

      alert('PPE Status updated successfully!');
      setEditingPPEUser(null);
      setEditingPPEUser(null);
    } catch (error) {
      console.error('Error saving user PPE:', error);
      alert('Failed to save PPE status');
    } finally {
      setIsSavingPPE(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message) {
      alert('Please fill in both title and message.');
      return;
    }

    setIsSendingNotification(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          title: notificationForm.title,
          message: notificationForm.message,
          type: notificationForm.type,
          admin_id: user.id
        }]);

      if (error) throw error;

      alert('Notification sent successfully!');
      setNotificationForm({ title: '', message: '', type: 'info' });
      setShowNotificationModal(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      alert(`Failed to send notification: ${error.message}`);
    } finally {
      setIsSendingNotification(false);
    }
  };


  const handleEdit = (targetUser) => {
    // Safety Mitra Restriction: Cannot edit Admins
    if (userProfile?.role === 'safety mitra' && targetUser.role === 'admin') {
      alert("Permission Denied: Safety Mitras cannot edit Administrators.");
      return;
    }
    setEditingUser({ ...targetUser });
    setAvatarFile(null);
    setAvatarPreview(targetUser.avatar_url);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setActiveEditTab('basic');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // File size validation (2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit. Please choose a smaller image.");
        return;
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    // Safeguard: Safety Mitra cannot edit Admin
    if (userProfile?.role === 'safety mitra' && editingUser.role === 'admin') {
      alert('Safety Mitras are not allowed to edit Admin profiles.');
      return;
    }

    let avatar_url = editingUser.avatar_url;

    if (avatarFile) {
      // Delete old avatar if it exists
      if (editingUser.avatar_url) {
        try {
          const oldUrl = editingUser.avatar_url;
          // Extract filename from URL - assumes standard Supabase storage URL format
          // Format: .../storage/v1/object/public/avatars/filename
          const oldFileName = oldUrl.split('/').pop().split('?')[0];

          if (oldFileName && !oldUrl.includes('googleusercontent')) { // Avoid deleting Google auth avatars
            await supabase.storage.from('avatars').remove([oldFileName]);
          }
        } catch (err) {
          console.error("Error deleting old avatar:", err);
          // Continue with upload even if delete fails
        }
      }

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${editingUser.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        alert('Failed to upload new avatar.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      if (!publicUrlData) {
        console.error("Could not get public URL for uploaded avatar");
        alert("Failed to get public URL for new avatar.");
        return;
      }

      avatar_url = publicUrlData.publicUrl;
    }


    const { id, ...updates } = editingUser;
    updates.avatar_url = avatar_url;
    delete updates.email; // Do not update email
    delete updates.points; // Do not allow manual point updates via Admin UI
    delete updates.created_at; // Do not update created_at timestamp

    console.log('Saving user updates:', updates); // Debug log
    console.log('User ID:', id); // Debug log

    if (!id) {
      alert('Error: User ID is missing');
      return;
    }

    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id);

    if (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message}`);
    } else {
      console.log('User updated successfully', data); // Debug log

      // Clear ALL admin user cache (all pages and roles)
      // We'll clear a broad range to be safe
      for (let i = 1; i <= 10; i++) {
        cacheHelper.clear(`admin_users_page_${i}`);
        cacheHelper.clear(`admin_users_admin_all_page_${i}`);
        cacheHelper.clear(`admin_users_safety mitra_${user.id}_page_${i}`);
      }

      // Wait for users list to refresh before closing modal
      await fetchUsers();

      // Now close the modal
      setEditingUser(null);
      setAvatarFile(null);
      setAvatarPreview(null);
      setShowSuccessModal(true);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // If district changes, reset block
    if (name === 'district') {
      setEditingUser(prev => ({ ...prev, district: value, block: '' }));
    } else {
      setEditingUser(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };


  return (
    <div className="mx-auto px-4 sm:px-6 py-6 sm:py-10 md:mb-6 transition-all duration-500">
      {/* LIST VIEW */}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {userProfile?.role === 'safety mitra' ? 'Safety Mitra' : 'Admin'}
          </h1>
        </div>

        {setCurrentView && (
          <div className="flex flex-wrap gap-3">
            {userProfile?.role === 'admin' && (
              <button
                onClick={() => setShowNotificationModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Send Notification
              </button>
            )}
            {userProfile?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin-services')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Services
              </button>
            )}
          </div>
        )}
      </div>
      {loading ? (
        <UserTableSkeleton />
      ) : fetchError ? (
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-12 text-center border border-red-100 dark:border-red-900/30">
          <div className="text-4xl mb-4">📡</div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
            {language === 'en' ? 'Connection Error' : 'কানেকশন এরর'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
            {language === 'en'
              ? 'Unable to load user data. Please check your internet connection.'
              : 'ইউজার ডাটা লোড করা সম্ভব হয়নি। আপনার ইন্টারনেট কানেকশন চেক করুন।'}
          </p>
          <button
            onClick={() => fetchUsers(currentPage)}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
          >
            {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {users.map((targetUser) => (
              <div
                key={targetUser.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {targetUser.full_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {targetUser.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Role:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${targetUser.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : targetUser.role === 'safety mitra'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                      {targetUser.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">📍</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                      {targetUser.district || 'N/A'}
                    </span>
                  </div>
                </div>

                {!(userProfile?.role === 'safety mitra' && targetUser.role === 'admin') && (
                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => handleEditPPE(targetUser)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-all border border-orange-200 dark:border-orange-800"
                    >
                      <span>🦺</span>
                      PPE
                    </button>
                    <button
                      onClick={() => handleEdit(targetUser)}
                      disabled={userProfile?.role === 'safety mitra' && targetUser.role === 'admin'}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${userProfile?.role === 'safety mitra' && targetUser.role === 'admin'
                        ? 'opacity-50 cursor-not-allowed grayscale bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
                        : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800'
                        }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Full Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">District</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {users.map((targetUser) => (
                  <tr key={targetUser.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{targetUser.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-slate-400">{targetUser.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${targetUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : targetUser.role === 'safety mitra'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                        {targetUser.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-slate-400">{targetUser.district || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!(userProfile?.role === 'safety mitra' && targetUser.role === 'admin') && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditPPE(targetUser)}
                            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all font-medium text-xs"
                          >
                            🦺 PPE
                          </button>
                          <button
                            onClick={() => handleEdit(targetUser)}
                            disabled={userProfile?.role === 'safety mitra' && targetUser.role === 'admin'}
                            className={`border px-3 py-1.5 rounded-lg transition-all font-medium text-xs ${userProfile?.role === 'safety mitra' && targetUser.role === 'admin'
                              ? 'opacity-50 cursor-not-allowed grayscale border-slate-200 dark:border-slate-700 text-slate-400'
                              : 'text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                              }`}
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {!loading && totalUsers > usersPerPage && (
        <div className="mt-4 flex items-center justify-between bg-white dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalUsers / usersPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(totalUsers / usersPerPage)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Showing <span className="font-medium">{(currentPage - 1) * usersPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * usersPerPage, totalUsers)}</span> of{' '}
                <span className="font-medium">{totalUsers}</span> users
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {Math.ceil(totalUsers / usersPerPage)}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalUsers / usersPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(totalUsers / usersPerPage)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}


      {/* EDIT USER FULL-PAGE VIEW */}
      {/* Edit User Modal */}
      {/* Edit User Modal */}
      <EditUserModal
        editingUser={editingUser}
        userProfile={userProfile}
        handleCancelEdit={handleCancelEdit}
        handleSave={handleSave}
        activeEditTab={activeEditTab}
        setActiveEditTab={setActiveEditTab}
        avatarPreview={avatarPreview}
        handleFileChange={handleFileChange}
        handleChange={handleChange}
        wbLocations={wbLocations}
        supervisors={supervisors}
      />

      {/* Edit PPE Modal */}
      {editingPPEUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden sm:overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-5xl border-0 sm:border border-slate-100 dark:border-slate-700 animate-scale-in flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setEditingPPEUser(null)}
                  className="sm:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage PPE</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{editingPPEUser.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPPEUser(null)}
                className="hidden sm:block text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ppeChecklist.map((item, index) => (
                  <div key={item.name} className={`relative p-4 rounded-xl border-2 transition-all ${item.available ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-900/10 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-80'}`}>
                    {/* Checkbox Overlay */}
                    <div className="absolute top-3 right-3">
                      <input
                        type="checkbox"
                        checked={item.available || false}
                        onChange={(e) => handlePPEChecklistChange(index, 'available', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl filter drop-shadow-sm">{item.icon}</span>
                      <h3 className={`font-bold leading-tight ${item.available ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>{item.name}</h3>
                    </div>

                    {item.available && (
                      <div className="space-y-3 mt-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Count</label>
                            <input
                              type="number"
                              min="1"
                              value={item.count}
                              onChange={(e) => handlePPEChecklistChange(index, 'count', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Condition</label>
                            <select
                              value={item.condition}
                              onChange={(e) => handlePPEChecklistChange(index, 'condition', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none"
                            >
                              <option>Good</option>
                              <option>Worn</option>
                              <option>Damaged</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Age</label>
                            <select
                              value={item.age}
                              onChange={(e) => handlePPEChecklistChange(index, 'age', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none"
                            >
                              <option>{'<'}6m</option>
                              <option>6-12m</option>
                              <option>1-2y</option>
                              <option>{'>'}2y</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Usage</label>
                            <select
                              value={item.usage}
                              onChange={(e) => handlePPEChecklistChange(index, 'usage', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none"
                            >
                              <option>Personal</option>
                              <option>Team</option>
                              <option>Spare</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex justify-end gap-3 bg-white dark:bg-slate-800 shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:shadow-none">
              <button
                onClick={() => setEditingPPEUser(null)}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserPPE}
                disabled={isSavingPPE}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
              >
                {isSavingPPE ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        language={language}
      />

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-slate-900/60 backdrop-blur-sm z-[120] p-4 pb-20 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-scale-in flex flex-col max-h-[85vh] my-auto overflow-y-auto">
            <div className="flex justify-between items-center p-6 pb-4 border-b dark:border-slate-700 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Send Push Notification
              </h2>
              <button onClick={() => setShowNotificationModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4 flex-1 overflow-y-auto p-6 max-h-[65vh]">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notification Title</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  placeholder="e.g., System Update"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Message Content</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder="Enter the notification message..."
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-32 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Notification Type</label>
                <select
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="info">Information (Blue)</option>
                  <option value="update">Update (Green)</option>
                  <option value="warning">Warning (Orange)</option>
                  <option value="alert">Alert (Red)</option>
                </select>
              </div>

            </form>
            <div className="flex justify-end gap-3 p-6 border-t dark:border-slate-700 shrink-0 bg-gray-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSendNotification}
                disabled={isSendingNotification}
                className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50"
              >
                {isSendingNotification ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


