// File: src/components/headers/ManagerHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ManagerHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Manager: only Reports + Logout
  const nav = [
    { href: '/dashboard/reports', label: 'Reports' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border-b shadow-sm">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Company Logo" className="h-32 w-32 object-contain" />
            <span>Dashboard</span>
          </Link>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
          Welcome, {session?.user?.email} (Manager)
        </p>
        <p className="text-sm text-muted-foreground mt-1 sm:hidden">
          Manager Mode
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
          className="w-full sm:w-auto btn-primary"
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}