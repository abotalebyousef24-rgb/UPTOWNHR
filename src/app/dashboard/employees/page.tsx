'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Define a type for our employee data for better code quality
type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  startDate: string;
  user: {
    email: string;
  }
}

export default function EmployeesListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || session?.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        const data = await response.json();
        setEmployees(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, [session, status, router]);

  if (isLoading || status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }
  
  if (!session || session.user.role !== 'ADMIN') {
    return null; // or a redirecting message
  }

  return (
    <div className="flex justify-center items-start p-4 sm:p-8 min-h-screen">
      <Card className="w-full max-w-4xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>View and manage all employees.</CardDescription>
          </div>
          <Link href="/dashboard/employees/add">
            <Button>Add New Employee</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive">Error: {error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.user.email}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{format(new Date(employee.startDate), 'PPP')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No employees found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}