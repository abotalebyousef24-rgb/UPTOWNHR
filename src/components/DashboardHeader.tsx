// File: src/components/DashboardHeader.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AdminHeader } from './headers/AdminHeader';
import { SuperAdminHeader } from './headers/SuperAdminHeader';
import { ManagerHeader } from './headers/ManagerHeader';
import { EmployeeHeader } from './headers/EmployeeHeader';

export function DashboardHeader() {
  // Correctly read session from useSession
  const { data: session, status } = useSession();
  const [isManager, setIsManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      setIsLoading(true);
      fetch('/api/me/is-manager')
        .then(res => {
          if (!res.ok) throw new Error('Failed to check manager status');
          return res.json();
        })
        .then(data => {
          setIsManager(!!data.isManager); // Ensure boolean
        })
        .catch(err => {
          console.error('Error fetching manager status:', err);
          setError(err.message || 'An error occurred');
        })
        .finally(() => setIsLoading(false));
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  if (isLoading || status === 'loading') {
    return (
      <div className="flex justify-between items-center h-16 px-4 bg-gray-50 border-b">
        <div className="text-sm text-muted-foreground">Loading header...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-between items-center h-16 px-4 bg-destructive/10 border-b border-destructive">
        <div className="text-sm text-destructive">Header error: {error}</div>
      </div>
    );
  }

  const userRole = session?.user?.role;

  // Render the correct header based on role and manager status
  if (userRole === 'SUPER_ADMIN') {
    return <SuperAdminHeader />;
  }
  if (userRole === 'ADMIN') {
    return <AdminHeader />;
  }
  if (isManager) {
    return <ManagerHeader />;
  }

  return <EmployeeHeader />;
}