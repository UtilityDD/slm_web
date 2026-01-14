import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { cacheHelper } from '../utils/cacheHelper';
import wbLocations from '../data/wb_locations.json';

import EditUserModal from './EditUserModal';
import SaveSuccessModal from './SaveSuccessModal';
import AdminAnalytics from './AdminAnalytics';
import DeleteUserConfirmationModal from './DeleteUserConfirmationModal';

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
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [activeEditTab, setActiveEditTab] = useState('basic'); // 'basic', 'family', 'health'

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* Pagination State */
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage] = useState(20);



  /* PPE Management State */
  const [editingPPEUser, setEditingPPEUser] = useState(null);
  const [ppeChecklist, setPpeChecklist] = useState([]);
  const [isSavingPPE, setIsSavingPPE] = useState(false);

  /* Tools Management State */
  const [editingToolsUser, setEditingToolsUser] = useState(null);
  const [toolsChecklist, setToolsChecklist] = useState([]);
  const [isSavingTools, setIsSavingTools] = useState(false);

  /* Notification State */
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info'
  });
  const [supervisors, setSupervisors] = useState([]);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState(null);
  const [showInviteHelp, setShowInviteHelp] = useState(false);

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
        .select('id, slm_id, full_name, email, role, district, block, avatar_url, created_at, dob, age, education, children_count, children_ages, parents_stay, parents_occupation, major_diseases, regular_medicines, accidents_details, accident_count, accident_voltage, is_donor, last_donation_date, blood_group, phone, phone_number, supervisor_id', { count: 'exact' });


      // Apply role-based filtering
      if (userProfile?.role === 'lineman') {
        // Linemen can only see their own profile
        query = query.eq('id', user.id);
      } else if (userProfile?.role === 'safety mitra') {
        // Safety Mitras can see their team
        query = query.eq('supervisor_id', user.id);
      }
      // Admins see all users (no filter)

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

  const TOOLS_ITEMS = [
    { name: "Pliers", icon: "🔧" },
    { name: "Screwdriver Set", icon: "🪛" },
    { name: "Wrench", icon: "🔧" },
    { name: "Hammer", icon: "🔨" },
    { name: "Tester", icon: "⚡" },
    { name: "Multimeter", icon: "📟" },
    { name: "Wire Stripper", icon: "✂️" },
    { name: "Rope", icon: "🪢" },
    { name: "Drill Machine", icon: "🔫" },
    { name: "Ladder", icon: "🪜" }
  ];

  const handleEditPPE = async (targetUser) => {
    // Authorization check
    const canEdit =
      userProfile?.role === 'admin' ||
      (userProfile?.role === 'safety mitra' && targetUser.supervisor_id === user.id) ||
      (userProfile?.role === 'lineman' && targetUser.id === user.id);

    if (!canEdit) {
      alert('You do not have permission to edit this user\'s PPE.');
      return;
    }

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

      setSuccessMessage({
        title: language === 'en' ? 'PPE Updated' : 'পিপিই আপডেট করা হয়েছে',
        message: language === 'en' ? 'PPE Status updated successfully!' : 'পিপিই স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!'
      });
      setShowSuccessModal(true);
      setEditingPPEUser(null);
      setEditingPPEUser(null);
    } catch (error) {
      console.error('Error saving user PPE:', error);
      alert('Failed to save PPE status');
    } finally {
      setIsSavingPPE(false);
    }
  };

  /* Tools Management Logic */
  const handleEditTools = async (targetUser) => {
    // Authorization check
    const canEdit =
      userProfile?.role === 'admin' ||
      (userProfile?.role === 'safety mitra' && targetUser.supervisor_id === user.id) ||
      (userProfile?.role === 'lineman' && targetUser.id === user.id);

    if (!canEdit) {
      alert('You do not have permission to edit this user\'s Tools.');
      return;
    }

    setEditingToolsUser(targetUser);
    setToolsChecklist([]); // Reset while loading

    try {
      const { data: fetchedData, error } = await supabase
        .from('user_tools')
        .select('*')
        .eq('user_id', targetUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const data = fetchedData || [];

      // Initialize checklist based on fetched data
      const checklist = TOOLS_ITEMS.map(item => {
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
      setToolsChecklist(checklist);

    } catch (error) {
      console.error('Error fetching user Tools:', error);
      alert('Failed to fetch Tools data');
    }
  };

  const handleToolsChecklistChange = (index, field, value) => {
    const updated = [...toolsChecklist];
    updated[index] = { ...updated[index], [field]: value };
    setToolsChecklist(updated);
  };

  const handleSaveUserTools = async () => {
    if (!editingToolsUser) return;
    setIsSavingTools(true);

    try {
      for (const item of toolsChecklist) {
        const ageMonths = item.age === '<6m' ? 3 :
          item.age === '6-12m' ? 9 :
            item.age === '1-2y' ? 18 : 36;

        const details = `Usage: ${item.usage}`;

        if (item.available) {
          if (item.id) {
            // Update
            await supabase.from('user_tools').update({
              count: parseInt(item.count),
              condition: item.condition,
              age_months: ageMonths,
              details: details
            }).eq('id', item.id);
          } else {
            // Insert
            await supabase.from('user_tools').insert([{
              user_id: editingToolsUser.id,
              name: item.name,
              count: parseInt(item.count),
              condition: item.condition,
              age_months: ageMonths,
              details: details
            }]);
          }
        } else if (item.id) {
          // Delete
          await supabase.from('user_tools').delete().eq('id', item.id);
        }
      }

      // Clear cache
      cacheHelper.clear(`user_tools_${editingToolsUser.id}`);

      setSuccessMessage({
        title: language === 'en' ? 'Tools Updated' : 'সরঞ্জাম আপডেট করা হয়েছে',
        message: language === 'en' ? 'Tools Status updated successfully!' : 'সরঞ্জাম স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!'
      });
      setShowSuccessModal(true);
      setEditingToolsUser(null);
    } catch (error) {
      console.error('Error saving user Tools:', error);
      alert('Failed to save Tools status');
    } finally {
      setIsSavingTools(false);
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


  const formatPhone = (value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    // Take only first 10 digits
    return cleaned.substring(0, 10);
  };

  const handlePhoneChange = (value) => {
    setInvitePhone(formatPhone(value));
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!invitePhone || invitePhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!inviteName || inviteName.trim() === '') {
      alert('Please enter the user\'s full name.');
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.rpc('create_user_account', {
        p_phone: invitePhone,
        p_full_name: inviteName.trim(),
        p_supervisor_id: userProfile.role === 'safety mitra' ? user.id : null
      });

      if (error) throw error;

      const result = data[0];

      // Show temporary password to admin
      setTempPasswordResult({
        phone: result.phone_number,
        name: inviteName,
        password: result.temp_password
      });

      // Clear form but keep modal open to show password
      setInvitePhone('');
      setInviteName('');

      // Refresh user list
      await fetchUsers(currentPage);
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.message?.includes('already registered')) {
        alert('This phone number is already registered in the system.');
      } else {
        alert(`Failed to create user: ${error.message}`);
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setTempPasswordResult(null);
    setInvitePhone('');
    setInviteName('');
  };


  const handleEdit = (targetUser) => {
    // Authorization check
    const canEdit =
      userProfile?.role === 'admin' ||
      (userProfile?.role === 'safety mitra' && targetUser.supervisor_id === user.id && targetUser.role !== 'admin') ||
      (userProfile?.role === 'lineman' && targetUser.id === user.id);

    if (!canEdit) {
      alert('You do not have permission to edit this user\'s profile.');
      return;
    }

    let userToEdit = { ...targetUser };

    // Fix for users with Email in Full Name and Empty Email
    if (!userToEdit.email && userToEdit.full_name && userToEdit.full_name.includes('@')) {
      userToEdit.email = userToEdit.full_name;
      userToEdit.full_name = ''; // Clear name so Admin can enter real name
    }

    setEditingUser(userToEdit);
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
    updates.avatar_url = avatar_url;
    // delete updates.email; // ALLOW Email updates now (to fix missing emails)
    delete updates.points; // Do not allow manual point updates via Admin UI
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
      setSuccessMessage({
        title: language === 'en' ? 'Profile Updated' : 'প্রোফাইল আপডেট করা হয়েছে',
        message: language === 'en' ? 'User profile has been updated successfully.' : 'ব্যবহারকারীর প্রোফাইল সফলভাবে আপডেট করা হয়েছে।'
      });
      setShowSuccessModal(true);
    }
  };

  const handleOpenDeleteConfirm = (targetUser) => {
    setUserToDelete(targetUser);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Delete from profiles (Cascades based on SQL setup)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      // 2. Clear caches
      for (let i = 1; i <= 10; i++) {
        cacheHelper.clear(`admin_users_page_${i}`);
        cacheHelper.clear(`admin_users_admin_all_page_${i}`);
        cacheHelper.clear(`admin_users_safety mitra_${user.id}_page_${i}`);
      }
      cacheHelper.clear(`user_ppe_${userToDelete.id}`);
      cacheHelper.clear(`user_tools_${userToDelete.id}`);

      // 3. Update local state
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setTotalUsers(prev => prev - 1);

      // 4. Success feedback
      setSuccessMessage({
        title: language === 'en' ? 'User Deleted' : 'ইউজার মুছে ফেলা হয়েছে',
        message: language === 'en'
          ? `User ${userToDelete.full_name} has been permanently removed from the application. Please remember to manually delete them from Supabase Auth if needed.`
          : `ইউজার ${userToDelete.full_name}-কে স্থায়ীভাবে সরিয়ে ফেলা হয়েছে। প্রয়োজন হলে দয়া করে সুপারবেস অথ থেকে ম্যানুয়ালি মুছে ফেলুন।`
      });
      setShowSuccessModal(true);

      // 5. Cleanup
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setEditingUser(null); // Close edit modal if it was open

    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message}`);
    } finally {
      setIsDeleting(false);
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
            {userProfile?.role === 'admin' ? 'Admin Panel' : userProfile?.role === 'safety mitra' ? 'Team Management' : 'My Profile'}
          </h1>
        </div>

        {setCurrentView && (
          <div className="flex flex-wrap gap-3">
            {userProfile?.role === 'admin' && (
              <button
                onClick={() => setShowNotificationModal(true)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Send Notification
              </button>
            )}
            {(userProfile?.role === 'admin' || userProfile?.role === 'safety mitra') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 text-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Invite New Lineman
                </button>
                <button
                  onClick={() => setShowInviteHelp(true)}
                  className="w-10 h-10 flex items-center justify-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl transition-all shadow-sm"
                  title="Guideline"
                >
                  <span className="font-bold text-lg">?</span>
                </button>
              </div>
            )}
            {userProfile?.role === 'admin' && (
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 text-sm ${showAnalytics
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-slate-500/10'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 01-2 2h22a2 2 0 01-2-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {showAnalytics ? 'View User List' : 'View Analytics'}
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
            className="px-8 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-500/20 transition-all"
          >
            {language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন'}
          </button>
        </div>
      ) : showAnalytics ? (
        <AdminAnalytics language={language} />
      ) : (
        users.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-12 text-center border border-slate-200 dark:border-slate-700">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {userProfile?.role === 'safety mitra'
                ? (language === 'en' ? 'No one is yet tagged' : 'এখনও কাউকে ট্যাগ করা হয়নি')
                : (language === 'en' ? 'No users found' : 'কোনো ব্যবহারকারী পাওয়া যায়নি')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {userProfile?.role === 'safety mitra'
                ? (language === 'en'
                  ? 'There are no linemen currently assigned to you. Please contact an administrator.'
                  : 'বর্তমানে আপনার সাথে কোনো লাইনম্যান সংযুক্ত নেই। অনুগ্রহ করে অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন।')
                : (language === 'en'
                  ? 'Try adjusting your filters or add a new user.'
                  : 'আপনার ফিল্টার পরিবর্তন করুন বা নতুন ব্যবহারকারী যোগ করুন।')
              }
            </p>
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
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {targetUser.full_name}
                        </h3>
                        {targetUser.slm_id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded border border-slate-200 dark:border-slate-600">
                            {targetUser.slm_id}
                          </span>
                        )}
                      </div>
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
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
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
                        onClick={() => handleEditTools(targetUser)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                      >
                        <span>🛠️</span>
                        Tools
                      </button>
                      <button
                        onClick={() => handleEdit(targetUser)}
                        disabled={userProfile?.role === 'safety mitra' && targetUser.role === 'admin'}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all border ${userProfile?.role === 'safety mitra' && targetUser.role === 'admin'
                          ? 'opacity-50 cursor-not-allowed grayscale bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
                          : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-200 dark:border-orange-800'
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
                        <div className="flex flex-col">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{targetUser.full_name}</div>
                          {targetUser.slm_id && <div className="text-[10px] font-bold text-slate-400">{targetUser.slm_id}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-600 dark:text-slate-400">{targetUser.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${targetUser.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : targetUser.role === 'safety mitra'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
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
                              onClick={() => handleEditTools(targetUser)}
                              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all font-medium text-xs"
                            >
                              🛠️ Tools
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
        )
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



      {/* Invite User Modal - Portal-ized for Android/Mobile feel */}
      {showInviteModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md flex flex-col border-t sm:border border-slate-100 dark:border-slate-700 animate-slide-up sm:animate-scale-in max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New User</h2>
              <button
                onClick={handleCloseInviteModal}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {tempPasswordResult ? (
              // SHOW TEMP PASSWORD RESULT
              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-inner">
                    ✅
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">User Created!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Share these credentials with the new user</p>
                </div>

                <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Name</label>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{tempPasswordResult.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number</label>
                    <p className="text-lg font-mono font-bold text-slate-900 dark:text-slate-100">{tempPasswordResult.phone}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Temporary Password</label>
                    <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400 tracking-widest">{tempPasswordResult.password}</p>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                  <p className="text-sm text-orange-900 dark:text-orange-300">
                    ⚠️ <strong>Important:</strong> User must change this password on first login
                  </p>
                </div>

                <button
                  onClick={handleCloseInviteModal}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              // CREATE USER FORM
              <form onSubmit={handleInviteUser} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-inner">
                    👤
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">
                    Create a new lineman account. They will receive a temporary password to login.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base lg:text-sm"
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    Phone Number (10 digits)
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <input
                      type="tel"
                      required
                      value={invitePhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base lg:text-sm font-mono tracking-wider"
                      placeholder="9876543210"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                    {invitePhone.length}/10 digits
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-safe-offset-4">
                  <button
                    type="button"
                    onClick={handleCloseInviteModal}
                    className="order-2 sm:order-1 flex-1 py-4 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting || invitePhone.length !== 10 || !inviteName.trim()}
                    className="order-1 sm:order-2 flex-1 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isInviting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Create User</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

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
        onOpenDeleteConfirm={handleOpenDeleteConfirm}
      />

      {/* Edit PPE Modal */}
      {
        editingPPEUser && createPortal(
          <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in safe-area-inset-top">
            <div className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:min-h-0 sm:max-h-[90vh] sm:rounded-2xl sm:max-w-5xl shadow-2xl flex flex-col animate-scale-in overflow-hidden pt-4 sm:pt-0">
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

              <div className="p-6 overflow-y-auto custom-scrollbar grow pb-6">
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

              <div className="flex gap-3 p-4 sm:p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0 z-10 shrink-0 sm:rounded-b-2xl">
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
          </div>,
          document.body
        )
      }

      {/* Edit Tools Modal */}
      {
        editingToolsUser && createPortal(
          <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in safe-area-inset-top">
            <div className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:min-h-0 sm:max-h-[90vh] sm:rounded-2xl sm:max-w-5xl shadow-2xl flex flex-col animate-scale-in overflow-hidden pt-4 sm:pt-0">
              <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setEditingToolsUser(null)}
                    className="sm:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Tools</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{editingToolsUser.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingToolsUser(null)}
                  className="hidden sm:block text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar grow pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {toolsChecklist.map((item, index) => (
                    <div key={item.name} className={`relative p-4 rounded-xl border-2 transition-all ${item.available ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-900/10 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-80'}`}>
                      {/* Checkbox Overlay */}
                      <div className="absolute top-3 right-3">
                        <input
                          type="checkbox"
                          checked={item.available || false}
                          onChange={(e) => handleToolsChecklistChange(index, 'available', e.target.checked)}
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
                                onChange={(e) => handleToolsChecklistChange(index, 'count', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:border-indigo-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Condition</label>
                              <select
                                value={item.condition}
                                onChange={(e) => handleToolsChecklistChange(index, 'condition', e.target.value)}
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
                                onChange={(e) => handleToolsChecklistChange(index, 'age', e.target.value)}
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
                                onChange={(e) => handleToolsChecklistChange(index, 'usage', e.target.value)}
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

              <div className="flex gap-3 p-4 sm:p-6 border-t dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0 z-10 shrink-0 sm:rounded-b-2xl">
                <button
                  onClick={() => setEditingToolsUser(null)}
                  className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl font-bold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserTools}
                  disabled={isSavingTools}
                  className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingTools ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Success Modal - Uses the reusable SaveSuccessModal */}
      <SaveSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
        language={language}
      />

      {/* Send Notification Modal - Portal-ized */}
      {showNotificationModal && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-slate-900/60 backdrop-blur-sm z-[200] p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 animate-scale-in flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                Broadcast
              </h2>
              <button onClick={() => setShowNotificationModal(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Title</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                  placeholder="Notification Headline"
                  className="w-full px-4 py-3 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-orange-500 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Message</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder="Enter your message here..."
                  className="w-full px-4 py-3 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-orange-500 outline-none bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-32 resize-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Urgency</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'info', label: 'Info', color: 'orange' },
                    { id: 'update', label: 'Update', color: 'green' },
                    { id: 'warning', label: 'Warning', color: 'orange' },
                    { id: 'alert', label: 'Alert', color: 'red' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNotificationForm({ ...notificationForm, type: type.id })}
                      className={`py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all ${notificationForm.type === type.id
                        ? `bg-${type.color}-500/10 border-${type.color}-500 text-${type.color}-600 dark:text-${type.color}-400`
                        : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 grayscale opacity-60'
                        }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-6 border-t dark:border-slate-700 flex flex-col sm:flex-row gap-3 bg-gray-50/50 dark:bg-slate-900/20 shrink-0">
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="order-2 sm:order-1 flex-1 py-4 px-4 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSendNotification}
                disabled={isSendingNotification}
                className="order-1 sm:order-2 flex-1 py-4 px-4 rounded-2xl font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-xl shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {isSendingNotification ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Broadcast Now'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteUserConfirmationModal
          onConfirm={handleDeleteUser}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }}
          targetUser={userToDelete}
          language={language}
          loading={isDeleting}
        />
      )}

      {/* Invite Guideline Modal */}
      {showInviteHelp && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in safe-area-inset-top">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-sm">?</span>
                How to Add a Lineman
              </h3>
              <button onClick={() => setShowInviteHelp(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                <div className="flex-none flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">1</div>
                  <div className="w-0.5 grow bg-indigo-50 dark:bg-indigo-900/10 my-1"></div>
                </div>
                <div className="pb-6">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Enter Details</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Click <strong>Invite New Lineman</strong> and enter their <strong>Name</strong> and <strong>Phone Number</strong>.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">2</div>
                  <div className="w-0.5 grow bg-indigo-50 dark:bg-indigo-900/10 my-1"></div>
                </div>
                <div className="pb-6">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Get Temporary Password</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">The system will generate a temporary password (e.g., <code>123456</code>). Write this down.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">3</div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Share & Login</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Share the phone number and password with the lineman. They must login and change their password.</p>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                <p className="text-xs text-orange-800 dark:text-orange-300">
                  <strong>Note:</strong> The new lineman will be automatically tagged to you (Safety Mitra).
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowInviteHelp(false)}
                className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Uniform bottom spacing for all roles to prevent content cut-off by sticky navs or safe areas */}
      <div className="h-24 sm:h-12 w-full"></div>
    </div >
  );
}


