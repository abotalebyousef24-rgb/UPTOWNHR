// File: src/components/headers/AdminHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AdminHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Admin buttons with requested routes:
  // Manage Employees, Add Employee, Reports, Leave Types, Leave Balances, Holidays, Schedules, Bulk Update
  const nav = [
    { href: '/admin/employees', label: 'Manage Employees' },
    { href: '/admin/employees/create', label: 'Add Employee' },
    { href: '/dashboard/reports', label: 'Reports' },
    { href: '/dashboard/settings/leave-types', label: 'Leave Types' },
    { href: '/dashboard/settings/leave-balances', label: 'Leave Balances' },
    { href: '/admin/holidays', label: 'Holidays' },
    { href: '/admin/work-schedules', label: 'Schedules' },
    { href: '/dashboard/settings/bulk-update', label: 'Bulk Update' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border-b">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Company Logo" className="h-32 w-32 object-contain" />
            <span>Uptown October HR</span>
          </Link>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome, {session?.user?.email} (Admin)
        </p>
      </div>
      <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href);
          return (
            <Button
              key={item.href}
              asChild
              size="sm"
              className={cn(active ? 'btn-primary' : 'btn-primary-outline')}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          );
        })}
        <Button
          onClick={() => signOut({ callbackUrl: '/login' })}
          size="sm"
          className="btn-primary"
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}