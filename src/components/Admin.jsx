import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Admin({ user, language }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleEdit = (user) => {
    setEditingUser({ ...user });
    setAvatarFile(null);
    setAvatarPreview(user.avatar_url);
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

    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user.');
    } else {
      setEditingUser(null);
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchUsers(); // Refresh users list
      alert('User updated successfully!');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingUser(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Admin - User Management</h1>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.full_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.district}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100">
            <h2 className="text-xl font-bold mb-6 text-slate-800 border-b pb-2">Edit User Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Avatar & Basic Info */}
              <div className="flex flex-col items-center">
                {/* Avatar Preview Section */}
                <div className="relative group mb-6">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-md">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-4xl font-bold">
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

                <input type="text" name="full_name" value={editingUser.full_name || ''} onChange={handleChange} placeholder="Full Name" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4" />
                <input type="email" name="email" value={editingUser.email || ''} onChange={handleChange} placeholder="Email" className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 mb-4 cursor-not-allowed" readOnly />
              </div>

              {/* Right Column - Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="text" name="phone" value={editingUser.phone || ''} onChange={handleChange} placeholder="Phone" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                  <input type="text" name="district" value={editingUser.district || ''} onChange={handleChange} placeholder="District" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                    <input type="text" name="blood_group" value={editingUser.blood_group || ''} onChange={handleChange} placeholder="Blood Group" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Points</label>
                    <input type="number" name="points" value={editingUser.points || 0} onChange={handleChange} placeholder="Points" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select name="role" value={editingUser.role || 'lineman'} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="lineman">Lineman</option>
                    <option value="safety mitra">Safety Mitra</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <input type="checkbox" id="is_donor" name="is_donor" checked={editingUser.is_donor || false} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                  <label htmlFor="is_donor" className="ml-2 text-sm text-slate-700 font-medium cursor-pointer">Register as Blood Donor</label>
                </div>

                {editingUser.is_donor && (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Donation Date</label>
                    <input type="date" name="last_donation_date" value={editingUser.last_donation_date || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={handleCancelEdit} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
