// File: src/app/admin/holidays/page.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useSession } from 'next-auth/react';

// Define types for our data objects
interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: string;
  employeeId?: string | null;
  repeatWeekly?: boolean;
}

interface Employee {
  id: string;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function HolidayManagementPage() {
  const { data: session } = useSession();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the form
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('COMPANY');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);

  const resetForm = () => {
    setEditingHolidayId(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setType('COMPANY');
    setSelectedEmployeeId('');
    setRepeatWeekly(false);
    setError(null);
  };

  const fetchData = async () => {
    try {
      const [holidaysRes, employeesRes] = await Promise.all([
        fetch('/api/holidays'),
        fetch('/api/users?role=EMPLOYEE')
      ]);

      if (!holidaysRes.ok) throw new Error('Failed to fetch holidays');
      if (!employeesRes.ok) throw new Error('Failed to fetch employees');

      const holidaysData = await holidaysRes.json();
      const employeesData = await employeesRes.json();
      
      setHolidays(holidaysData);
      setEmployees(employeesData);

    } catch (error: any) {
      console.error(error);
      setError('Failed to load page data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const createdBy = session?.user?.id;
    if (!createdBy) {
      setError("You must be logged in.");
      return;
    }

    if (type === 'EMPLOYEE' && !selectedEmployeeId) {
        setError('Please select an employee for this holiday type.');
        return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date.');
      return;
    }

    const body = {
        name,
        startDate,
        endDate,
        type,
        createdBy, // For POST requests
        employeeId: type === 'EMPLOYEE' ? selectedEmployeeId : null,
        repeatWeekly: type === 'EMPLOYEE' ? repeatWeekly : false,
    };

    try {
        let response;
        if (editingHolidayId) {
            // UPDATE logic
            response = await fetch(`/api/holidays/${editingHolidayId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } else {
            // CREATE logic
            response = await fetch('/api/holidays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        }

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to save holiday');
        }

        resetForm();
        await fetchData();
        
    } catch (error: any) {
        console.error(error);
        setError(error.message);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    setError(null);
    try {
      const response = await fetch(`/api/holidays/${holidayId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete holiday');
      }
      await fetchData();
    } catch (error: any) {
      console.error(error);
      setError(error.message);
    }
  };

  const handleEditClick = (holiday: Holiday) => {
    setEditingHolidayId(holiday.id);
    setName(holiday.name);
    setStartDate(new Date(holiday.startDate).toISOString().split('T')[0]);
    setEndDate(new Date(holiday.endDate).toISOString().split('T')[0]);
    setType(holiday.type);
    setSelectedEmployeeId(holiday.employeeId || '');
    setRepeatWeekly(Boolean(holiday.repeatWeekly));
  };

  if (isLoading) { return <div className="p-8">Loading...</div>; }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Holiday Management</h1>
      
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          {editingHolidayId ? 'Edit Holiday' : 'Add New Holiday'}
        </h2>
        <form onSubmit={handleFormSubmit}>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Holiday Name</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
                </div>
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start date</label>
                    <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End date</label>
                    <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
                </div>
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
                    <select id="type" value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                        <option value="COMPANY">Company-Wide</option>
                        <option value="NATIONAL">National</option>
                        <option value="EMPLOYEE">Employee-Specific</option>
                    </select>
                </div>
            </div>
            {type === 'EMPLOYEE' && (
                <div className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="employee" className="block text-sm font-medium text-gray-700">Select Employee</label>
                      <select id="employee" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-md p-2">
                          <option value="">-- Please select an employee --</option>
                          {employees.map(emp => (
                              <option key={emp.id} value={emp.profile.id}>
                                  {emp.profile.firstName} {emp.profile.lastName}
                              </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="repeatWeekly"
                        type="checkbox"
                        checked={repeatWeekly}
                        onChange={(e) => setRepeatWeekly(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label htmlFor="repeatWeekly" className="ml-2 block text-sm text-gray-700">
                        Repeat weekly (every {startDate ? new Date(startDate).toLocaleDateString(undefined, { weekday: 'long' }) : 'week'})
                      </label>
                    </div>
                </div>
            )}
             <div className="flex justify-end mt-6">
                {editingHolidayId && (
                  <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400 mr-2">
                    Cancel
                  </button>
                )}
                <button type="submit" className="px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90">
                  {editingHolidayId ? 'Update Holiday' : 'Add Holiday'}
                </button>
            </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {holidays.map((holiday) => (
                <tr key={holiday.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{holiday.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(holiday.startDate).toLocaleDateString()} — {new Date(holiday.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-now-rap">{holiday.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleEditClick(holiday)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                        <button 
                          onClick={() => handleDeleteHoliday(holiday.id)} 
                          className="text-red-600 hover:text-red-900 ml-4"
                        >
                          Delete
                        </button>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}