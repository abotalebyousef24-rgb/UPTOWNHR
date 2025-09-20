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

type LeaveType = {
  id: string;
  name: string;
  defaultAllowance: number;
  unit: 'DAYS' | 'HOURS';
  cadence: 'ANNUAL' | 'MONTHLY';
}

export default function ManageLeaveTypesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [defaultAllowance, setDefaultAllowance] = useState('');
  const [unit, setUnit] = useState<'DAYS' | 'HOURS'>('DAYS');
  const [cadence, setCadence] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/leave-types');
      if (!response.ok) throw new Error('Failed to fetch leave types');
      const data = await response.json();
      setLeaveTypes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && (session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN')) {
      fetchLeaveTypes();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Start loading state for the button
    setIsLoading(true);

    try {
      const response = await fetch('/api/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, defaultAllowance, unit, cadence }),
      });
      if (!response.ok) {
        const data = await response.text();
        throw new Error(data || 'Failed to create leave type');
      }
      // Reset form and refresh list
      setName('');
      setDefaultAllowance('');
      setUnit('DAYS');
      setCadence('ANNUAL');
      fetchLeaveTypes(); // This will also set isLoading to false
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false); // Make sure to stop loading on error
    }
  };

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Existing Leave Types</CardTitle>
            <CardDescription>All leave types available in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Default Allowance</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cadence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((lt) => (
                  <TableRow key={lt.id}>
                    <TableCell>{lt.name}</TableCell>
                    <TableCell>{lt.defaultAllowance}</TableCell>
                    <TableCell>{lt.unit}</TableCell>
                    <TableCell>{lt.cadence}</TableCell>
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
            <CardTitle>Add New Leave Type</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Annual Leave" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultAllowance">Default Allowance</Label>
                <Input id="defaultAllowance" type="number" value={defaultAllowance} onChange={(e) => setDefaultAllowance(e.target.value)} placeholder="e.g., 21" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select onValueChange={(value: 'DAYS' | 'HOURS') => setUnit(value)} value={unit}>
                  <SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAYS">Days</SelectItem>
                    <SelectItem value="HOURS">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cadence">Cadence</Label>
                <Select onValueChange={(value: 'ANNUAL' | 'MONTHLY') => setCadence(value)} value={cadence}>
                  <SelectTrigger><SelectValue placeholder="Select a cadence" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}