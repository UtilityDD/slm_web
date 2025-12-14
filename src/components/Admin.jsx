import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Admin({ user, language }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);

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
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    const { id, ...updates } = editingUser;
    delete updates.email; // Do not update email
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user.');
    } else {
      setEditingUser(null);
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Edit User: {editingUser.full_name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="full_name" value={editingUser.full_name || ''} onChange={handleChange} placeholder="Full Name" className="p-2 border rounded" />
              <input type="email" name="email" value={editingUser.email || ''} onChange={handleChange} placeholder="Email" className="p-2 border rounded bg-gray-100" readOnly />
              <input type="text" name="phone" value={editingUser.phone || ''} onChange={handleChange} placeholder="Phone" className="p-2 border rounded" />
              <input type="text" name="district" value={editingUser.district || ''} onChange={handleChange} placeholder="District" className="p-2 border rounded" />
              <input type="text" name="blood_group" value={editingUser.blood_group || ''} onChange={handleChange} placeholder="Blood Group" className="p-2 border rounded" />
              <input type="number" name="points" value={editingUser.points || 0} onChange={handleChange} placeholder="Points" className="p-2 border rounded" />
              <div className="flex items-center">
                <input type="checkbox" name="is_donor" checked={editingUser.is_donor || false} onChange={handleChange} className="mr-2" />
                <label>Is Donor</label>
              </div>
              <input type="date" name="last_donation_date" value={editingUser.last_donation_date || ''} onChange={handleChange} className="p-2 border rounded" />
              <select name="role" value={editingUser.role || 'lineman'} onChange={handleChange} className="p-2 border rounded">
                <option value="lineman">Lineman</option>
                <option value="safety mitra">Safety Mitra</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
