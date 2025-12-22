import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';

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

export default function Admin({ user, userProfile, language, setCurrentView }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const fetchUsers = async (page = 1) => {
    // Check cache for this specific page
    const cacheKey = `admin_users_page_${page}`;
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
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, district, avatar_url, created_at', { count: 'exact' })
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

    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user.');
    } else {
      // Clear admin cache
      cacheHelper.clear('admin_user_list');

      setEditingUser(null);
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchUsers(); // Refresh users list
      setShowSuccessModal(true);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingUser(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          {userProfile?.role === 'safety mitra' ? 'Safety Mitra Dashboard' : 'Admin - User Management'}
        </h1>
        {setCurrentView && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowNotificationModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Send Notification
            </button>
            <button
              onClick={() => setCurrentView('admin-services')}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Manage Emergency Services
            </button>
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
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-x-auto">
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
                <tr key={targetUser.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{targetUser.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{targetUser.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{targetUser.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{targetUser.district}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!(userProfile?.role === 'safety mitra' && targetUser.role === 'admin') && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditPPE(targetUser)}
                          className="text-orange-600 hover:text-orange-900 border border-orange-200 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                        >
                          PPE
                        </button>
                        <button
                          onClick={() => handleEdit(targetUser)}
                          disabled={userProfile?.role === 'safety mitra' && targetUser.role === 'admin'}
                          className={`text-indigo-600 hover:text-indigo-900 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50 transition-colors ${userProfile?.role === 'safety mitra' && targetUser.role === 'admin'
                            ? 'opacity-50 cursor-not-allowed grayscale'
                            : ''
                            }`}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 dark:border-slate-700 animate-scale-in">
            <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit User Profile</h2>
              <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* ... Existing User Edit Form Content ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Avatar & Basic Info */}
              <div className="flex flex-col items-center">
                {/* Avatar Preview Section - Compact */}
                <div className="relative group mb-4">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-md">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 text-3xl font-bold">
                        {editingUser.full_name ? editingUser.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>

                  {/* Hidden File Input & Custom Button */}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-105"
                    title="Change Photo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="w-full space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
                    <input type="text" name="full_name" value={editingUser.full_name || ''} onChange={handleChange} placeholder="Full Name" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                    <input type="email" name="email" value={editingUser.email || ''} onChange={handleChange} placeholder="Email" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed" readOnly />
                  </div>
                </div>
              </div>

              {/* Right Column - Details - Compact */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                    <input type="text" name="phone" value={editingUser.phone || ''} onChange={handleChange} placeholder="Phone" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">District</label>
                    <input type="text" name="district" value={editingUser.district || ''} onChange={handleChange} placeholder="District" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Blood Group</label>
                    <input type="text" name="blood_group" value={editingUser.blood_group || ''} onChange={handleChange} placeholder="B Group" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Points</label>
                    <input type="number" name="points" value={editingUser.points || 0} onChange={handleChange} placeholder="Points" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 cursor-not-allowed" readOnly />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                  <select
                    name="role"
                    value={editingUser.role || 'lineman'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    disabled={userProfile?.role === 'safety mitra' && editingUser.role === 'admin'}
                  >
                    <option value="lineman">Lineman</option>
                    <option value="safety mitra">Safety Mitra</option>
                    {userProfile?.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>

                <div className="flex items-center p-2.5 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                  <input type="checkbox" id="is_donor" name="is_donor" checked={editingUser.is_donor || false} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                  <label htmlFor="is_donor" className="ml-2 text-xs text-slate-700 dark:text-slate-200 font-medium cursor-pointer">Register as Blood Donor</label>
                </div>

                {editingUser.is_donor && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Last Donation Date</label>
                    <input type="date" name="last_donation_date" value={editingUser.last_donation_date || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={handleCancelEdit} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin PPE Modal - NEW */}
      {editingPPEUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-hidden h-full w-full flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-100 dark:border-slate-700 animate-scale-in flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-slate-700 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage PPE for User</h2>
                <p className="text-sm text-slate-500">{editingPPEUser.full_name}</p>
              </div>
              <button onClick={() => setEditingPPEUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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

            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t dark:border-slate-700 shrink-0 bg-gray-50 dark:bg-slate-800/50">
              <button
                onClick={() => setEditingPPEUser(null)}
                className="px-5 py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserPPE}
                disabled={isSavingPPE}
                className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                {isSavingPPE ? 'Saving...' : 'Save PPE Changes'}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-scale-in">
            <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-slate-700">
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

            <form onSubmit={handleSendNotification} className="space-y-4">
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

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingNotification}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50"
                >
                  {isSendingNotification ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
