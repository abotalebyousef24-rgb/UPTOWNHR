// File: src/components/headers/EmployeeHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmployeeHeader() {
  const { data: session } = useSession();

  // Employee: show Reports + Logout
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border-b">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Company Logo" className="h-32 w-32 object-contain" />
            <span>Dashboard</span>
          </Link>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
          Welcome, {session?.user?.email}
        </p>
      </div>
      <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
        <Button asChild size="sm" className="btn-primary-outline">
          <Link href="/dashboard/reports">Reports</Link>
        </Button>
        <Button 
          onClick={() => signOut({ callbackUrl: '/login' })} 
          size="sm"
          className="w-full sm:w-auto btn-primary"
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}