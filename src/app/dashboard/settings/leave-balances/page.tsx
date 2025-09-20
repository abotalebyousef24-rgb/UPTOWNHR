'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define types for our data
type Employee = { id: string; firstName: string; lastName: string; };
type LeaveType = { id: string; name: string; cadence: 'ANNUAL' | 'MONTHLY'; };
type LeaveBalance = {
  id: string;
  employee: { firstName: string; lastName: string; };
  leaveType: { name: string; unit: string; };
  year: number;
  month: number | null;
  total: number;
  remaining: number;
};

const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

export default function AssignBalancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [total, setTotal] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [empRes, ltRes, balRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/leave-types'),
        fetch('/api/leave-balances'),
      ]);
      if (!empRes.ok || !ltRes.ok || !balRes.ok) throw new Error('Failed to fetch initial data');
      
      const empData = await empRes.json();
      const ltData = await ltRes.json();
      const balData = await balRes.json();

      setEmployees(empData);
      setLeaveTypes(ltData);
      setBalances(balData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && (session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN')) {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);
  
  const selectedLeaveType = leaveTypes.find(lt => lt.id === selectedLeaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const body = {
        employeeId: selectedEmployeeId,
        leaveTypeId: selectedLeaveTypeId,
        year: year,
        total: total,
        month: selectedLeaveType?.cadence === 'MONTHLY' ? month : undefined,
      };

      const response = await fetch('/api/leave-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.text();
        throw new Error(data || 'Failed to assign balance');
      }
      setSuccess('Balance assigned successfully!');
      fetchData(); // Refresh all data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardHeader><CardTitle>Assigned Leave Balances</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((bal) => (
                  <TableRow key={bal.id}>
                    <TableCell>{bal.employee.firstName} {bal.employee.lastName}</TableCell>
                    <TableCell>{bal.leaveType.name}</TableCell>
                    <TableCell>{bal.month ? `${months.find(m => m.value === bal.month?.toString())?.label} ${bal.year}` : bal.year}</TableCell>
                    <TableCell>{bal.total} {bal.leaveType.unit.toLowerCase()}</TableCell>
                    <TableCell>{bal.remaining} {bal.leaveType.unit.toLowerCase()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Assign New Balance</CardTitle>
            <CardDescription>Select an employee and leave type to assign an allowance.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Employee</Label>
                <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(emp => emp && emp.id).map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Leave Type</Label>
                <Select onValueChange={setSelectedLeaveTypeId} value={selectedLeaveTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select a leave type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.filter(lt => lt && lt.id).map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedLeaveType?.cadence === 'MONTHLY' && (
                <div className="grid gap-2">
                    <Label>Month</Label>
                    <Select onValueChange={setMonth} value={month}>
                        <SelectTrigger><SelectValue placeholder="Select a month" /></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="total">Total Allowance</Label>
                <Input id="total" type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g., 21" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Balance'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}