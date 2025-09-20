// File: src/app/admin/work-schedules/page.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';

// Define the type for a WorkSchedule object
interface WorkSchedule {
  id: string;
  name: string;
  isDefault: boolean;
  startTime: string;
  endTime: string;
  isMonday: boolean;
  isTuesday: boolean;
  isWednesday: boolean;
  isThursday: boolean;
  isFriday: boolean;
  isSaturday: boolean;
  isSunday: boolean;
}

const initialDaysState = {
  isMonday: true, isTuesday: true, isWednesday: true, isThursday: true,
  isFriday: false, isSaturday: true, isSunday: true,
};

export default function WorkSchedulePage() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isDefault, setIsDefault] = useState(false);
  const [days, setDays] = useState(initialDaysState);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingScheduleId(null);
    setName('');
    setStartTime('09:00');
    setEndTime('17:00');
    setIsDefault(false);
    setDays(initialDaysState);
    setError(null);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setDays(prevDays => ({ ...prevDays, [name]: checked }));
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/work-schedules');
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error(error);
      setError('Could not load schedules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // CORRECTED: Create date from local time, then convert to UTC for storage
    const today = new Date().toISOString().split('T')[0];
    const startTimeISO = new Date(`${today}T${startTime}`).toISOString();
    const endTimeISO = new Date(`${today}T${endTime}`).toISOString();
    
    const scheduleData = { name, startTime: startTimeISO, endTime: endTimeISO, isDefault, ...days };

    try {
      let response;
      if (editingScheduleId) {
        response = await fetch(`/api/work-schedules/${editingScheduleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleData),
        });
      } else {
        response = await fetch('/api/work-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scheduleData),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save schedule');
      }

      resetForm();
      await fetchSchedules();

    } catch (error: any) {
      console.error(error);
      setError(error.message);
    }
  };
  
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this schedule? This action cannot be undone.")) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/work-schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete schedule');
      }
      await fetchSchedules();
    } catch (error: any) {
      console.error(error);
      setError(error.message);
    }
  };

  const handleEditClick = (schedule: WorkSchedule) => {
    setEditingScheduleId(schedule.id);
    setName(schedule.name);
    setStartTime(formatTime(schedule.startTime));
    setEndTime(formatTime(schedule.endTime));
    setIsDefault(schedule.isDefault);
    setDays({
      isMonday: schedule.isMonday, isTuesday: schedule.isTuesday, isWednesday: schedule.isWednesday,
      isThursday: schedule.isThursday, isFriday: schedule.isFriday, isSaturday: schedule.isSaturday,
      isSunday: schedule.isSunday,
    });
  };

  // IMPROVED: This function is now more reliable for displaying local time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
  };

  if (isLoading) { return <div className="p-8">Loading schedules...</div>; }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Work Schedule Management</h1>
      
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          {editingScheduleId ? 'Edit Schedule' : 'Add New Schedule'}
        </h2>
        <form onSubmit={handleFormSubmit}>
          {error && <p className="text-red-500 mb-4">Could not load schedules.</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
             <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Schedule Name</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
             </div>
             <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
              <input type="time" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
             </div>
             <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
              <input type="time" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
             </div>
          </div>
          <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
             <div className="flex flex-wrap gap-4">
                {Object.keys(days).map((day) => (
                    <label key={day} className="flex items-center gap-2">
                        <input type="checkbox" name={day} checked={days[day as keyof typeof days]} onChange={handleDayChange} className="rounded"/>
                        {day.substring(2)}
                    </label>
                ))}
             </div>
          </div>
           <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded"/>
                Set as Default Schedule
            </label>
            <div>
              {editingScheduleId && (
                <button type="button" onClick={resetForm} className="px-4 py-2 btn-primary-outline mr-2">
                  Cancel
                </button>
              )}
              <button type="submit" className="px-4 py-2 btn-primary">
                {editingScheduleId ? 'Update Schedule' : 'Add Schedule'}
              </button>
            </div>
           </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Working Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => (
                <tr key={schedule.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {schedule.name}
                      {schedule.isDefault && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Object.entries(schedule)
                        .filter(([key, value]) => key.startsWith('is') && value && key !== 'isDefault')
                        .map(([key]) => key.substring(2, 5))
                        .join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => handleEditClick(schedule)} className="text-brand-600 hover:text-brand-700">Edit</button>
                      <button 
                        onClick={() => handleDeleteSchedule(schedule.id)} 
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