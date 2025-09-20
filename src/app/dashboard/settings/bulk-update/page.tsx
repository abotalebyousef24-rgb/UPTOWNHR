'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';

type LeaveType = { id: string; name: string; };

export default function BulkUpdatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  
  // Form state
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [newTotal, setNewTotal] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || (session?.user.role !== 'ADMIN' && session?.user.role !== 'SUPER_ADMIN')) {
      router.push('/dashboard');
    } else {
        const fetchLeaveTypes = async () => {
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
        fetchLeaveTypes();
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/leave-balances/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveTypeId: selectedLeaveTypeId,
          year: year,
          newTotal: newTotal,
          applyToAll: applyToAll,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to run bulk update');
      }
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === 'loading' || isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className="flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Bulk Update Leave Balances</CardTitle>
            <CardDescription>
              Update leave allowances for employees. This is useful for annual policy changes.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Leave Type</Label>
                <Select onValueChange={setSelectedLeaveTypeId} value={selectedLeaveTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select a leave type to update" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year">For Year</Label>
                <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newTotal">New Total Allowance</Label>
                <Input id="newTotal" type="number" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} placeholder="e.g., 22" required />
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox id="applyToAll" checked={applyToAll} onCheckedChange={(checked) => setApplyToAll(checked as boolean)} />
                <Label htmlFor="applyToAll" className="text-sm font-normal text-muted-foreground">
                  Apply to all employees, including those with manual overrides.
                </Label>
              </div>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
              {success && <p className="text-sm text-green-600 mt-2">{success}</p>}
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
              <Button type="submit" variant="destructive" disabled={isLoading}>{isLoading ? 'Updating...' : 'Run Bulk Update'}</Button>
            </div>
          </form>
        </Card>
    </div>
  );
}