// File: src/app/admin/manage-admins/page.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useSession } from 'next-auth/react';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
}

interface User {
  id: string;
  email: string;
  profile: UserProfile | null;
}

export default function ManageAdminsPage() {
  const { data: session, status } = useSession();
  const [view, setView] = useState('promote');
  const [admins, setAdmins] = useState<User[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('HR Admin');
  const [startDate, setStartDate] = useState('');

  const fetchData = async () => {
    try {
      const [adminsRes, employeesRes] = await Promise.all([
        fetch('/api/admins'),
        fetch('/api/users?role=EMPLOYEE'),
      ]);

      if (!adminsRes.ok) throw new Error('Failed to fetch admins');
      if (!employeesRes.ok) throw new Error('Failed to fetch employees');

      const adminsData = await adminsRes.json();
      const employeesData = await employeesRes.json();
      
      setAdmins(adminsData);
      setEmployees(employeesData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'SUPER_ADMIN') {
      fetchData();
    }
  }, [session]);

  const handlePromoteUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedUserId) {
      setError('Please select an employee to promote.');
      return;
    }
    try {
      const response = await fetch(`/api/admins/${selectedUserId}`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to promote user');
      }
      setSelectedUserId('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, position, startDate }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create admin');
      }
      setEmail(''); setPassword(''); setFirstName('');
      setLastName(''); setPosition('HR Admin'); setStartDate('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDemoteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to demote this admin back to an employee role?")) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/admins/${userId}/demote`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to demote user');
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (status === 'loading') {
    return <div className="p-8">Loading session...</div>;
  }

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Manage Admins</h1>

      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="flex border-b mb-4">
          <button onClick={() => setView('promote')} className={`py-2 px-4 ${view === 'promote' ? 'border-b-2 border-brand-600 font-semibold' : 'text-gray-500'}`}>
            Promote Employee
          </button>
          <button onClick={() => setView('create')} className={`py-2 px-4 ${view === 'create' ? 'border-b-2 border-brand-600 font-semibold' : 'text-gray-500'}`}>
            Create New Admin
          </button>
        </div>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {view === 'promote' && (
          <form onSubmit={handlePromoteUser}>
            <h2 className="text-xl font-semibold mb-4">Promote Employee to Admin</h2>
            <div className="flex items-end gap-4">
              <div className="flex-grow">
                <label htmlFor="employee" className="block text-sm font-medium text-gray-700">Select Employee</label>
                <select id="employee" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                  <option value="">-- Select an employee --</option>
                  {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.profile?.firstName} {emp.profile?.lastName} ({emp.email})</option>))}
                </select>
              </div>
              <button type="submit" className="btn-primary h-10">
                Promote to Admin
              </button>
            </div>
          </form>
        )}

        {view === 'create' && (
          <form onSubmit={handleAddAdmin}>
            <h2 className="text-xl font-semibold mb-4">Add New Admin</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="border border-gray-300 p-2 rounded-md" />
              <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required className="border border-gray-300 p-2 rounded-md" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="border border-gray-300 p-2 rounded-md" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="border border-gray-300 p-2 rounded-md" />
              <input type="text" placeholder="Position" value={position} onChange={e => setPosition(e.target.value)} required className="border border-gray-300 p-2 rounded-md" />
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-500">Start Date</label>
                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required className="border border-gray-300 p-2 rounded-md w-full" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" className="btn-primary">
                Add Admin
              </button>
            </div>
          </form>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <h2 className="text-xl font-semibold p-6">Current Admins</h2>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map(admin => (
              <tr key={admin.id}>
                <td className="px-6 py-4 whitespace-nowrap">{admin.profile?.firstName} {admin.profile?.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{admin.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{admin.profile?.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleDemoteUser(admin.id)} className="text-red-600 hover:text-red-900">Demote</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}