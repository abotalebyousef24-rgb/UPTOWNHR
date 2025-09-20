// File: src/app/admin/employees/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  user: {
    email: string;
    role: string;
  };
  manager: {
    firstName: string;
    lastName: string;
  } | null;
};

export default function ManageEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [view, setView] = useState('active'); // 'active' or 'inactive'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmployees = async (currentView: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees?status=${currentView}`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(view);
  }, [view]);

  const handleDeactivate = async (profileId: string) => {
    if (window.confirm("Are you sure you want to deactivate this user?")) {
      await fetch(`/api/employees/${profileId}`, { method: 'DELETE' });
      fetchEmployees(view);
    }
  };

  const handleReactivate = async (profileId: string) => {
    if (window.confirm("Are you sure you want to reactivate this user?")) {
      await fetch(`/api/employees/${profileId}/reactivate`, { method: 'PATCH' });
      fetchEmployees(view);
    }
  };

  if (error) { return <div className="p-8 text-destructive">{error}</div>; }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Employees</h1>
          <p className="text-muted-foreground">View and manage all employees in the system.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                <Button onClick={() => setView('active')} variant={view === 'active' ? 'secondary' : 'ghost'} size="sm">Active</Button>
                <Button onClick={() => setView('inactive')} variant={view === 'inactive' ? 'secondary' : 'ghost'} size="sm">Inactive</Button>
            </div>
            <Button asChild className="btn-primary"><Link href="/admin/employees/create">Add New Employee</Link></Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Position</TableHead><TableHead>Role</TableHead><TableHead>Manager</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
              ) : employees.length > 0 ? (
                employees.map(employee => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.user.email}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell><Badge variant="secondary">{employee.user.role}</Badge></TableCell>
                    <TableCell>{employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button asChild variant="link" size="sm"><Link href={`/admin/employees/${employee.id}/edit`}>Edit</Link></Button>
                      {view === 'active' ? (
                        <Button variant="link" size="sm" className="text-destructive" onClick={() => handleDeactivate(employee.id)}>Deactivate</Button>
                      ) : (
                        <Button variant="link" size="sm" className="text-brand-600" onClick={() => handleReactivate(employee.id)}>Reactivate</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center">No {view} employees found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}