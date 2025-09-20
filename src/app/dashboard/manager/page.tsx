// File: src/app/dashboard/manager/page.tsx

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ManagerRequest {
  id: string;
  startDate: string;
  endDate: string;
  employee: { firstName: string; lastName: string; };
  leaveType: { name: string; };
}

const denialReasons = ["High Work Capacity", "Request Overlaps", "Insufficient Notice", "Other"];

export default function ManagerDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [pendingApprovals, setPendingApprovals] = useState<ManagerRequest[]>([]);
  const [pendingCancellations, setPendingCancellations] = useState<ManagerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State for the denial dialog
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [approvalsRes, cancellationsRes] = await Promise.all([
        fetch('/api/manager/pending-approvals'),
        fetch('/api/manager/pending-cancellations')
      ]);

      if (!approvalsRes.ok) throw new Error('Failed to fetch pending approvals.');
      if (!cancellationsRes.ok) throw new Error('Failed to fetch pending cancellations.');

      const approvalsData = await approvalsRes.json();
      const cancellationsData = await cancellationsRes.json();

      setPendingApprovals(approvalsData);
      setPendingCancellations(cancellationsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [session, status, router]);

  const handleAction = async (requestId: string, newStatus: string, reason?: string) => {
    setError('');
    try {
      const response = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, denialReason: reason }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
      }
      fetchData(); // Refresh data after action
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDenialSubmit = async () => {
    if (!currentRequestId) return;
    const finalReason = denialReason === 'Other' ? otherReason : denialReason;
    if (!finalReason) {
      setError("A reason for denial is required.");
      return;
    }
    await handleAction(currentRequestId, 'DENIED', finalReason);
    setIsDenyDialogOpen(false);
    setCurrentRequestId(null);
    setDenialReason('');
    setOtherReason('');
  };

  if (isLoading) {
    return <div className="p-8">Loading Manager Dashboard...</div>;
  }
  
  return (
    <>
      <div className="container mx-auto py-8 space-y-8">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        {error && <p className="text-destructive">{error}</p>}

        {/* Pending Leave Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Leave Approvals</CardTitle>
            <CardDescription>These employees are waiting for you to approve their time off requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Leave Type</TableHead><TableHead>Dates</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell>
                      <TableCell>{req.leaveType.name}</TableCell>
                      <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setCurrentRequestId(req.id); setIsDenyDialogOpen(true); }}>Deny</Button>
                        <Button size="sm" onClick={() => handleAction(req.id, 'APPROVED_BY_MANAGER')}>Approve</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center">No pending approvals.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Cancellation Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Cancellation Approvals</CardTitle>
            <CardDescription>These employees have requested to cancel their previously approved leave.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* We will make these buttons functional in the next step */}
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Leave Type</TableHead><TableHead>Dates To Cancel</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
              {pendingCancellations.length > 0 ? (
                  pendingCancellations.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell>
                      <TableCell>{req.leaveType.name}</TableCell>
                      <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline">Reject Cancellation</Button>
                        <Button size="sm">Approve Cancellation</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center">No pending cancellation requests.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Denial Dialog */}
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reason for Denial</DialogTitle><DialogDescription>Please provide a reason for denying this request.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="denialReason">Reason</Label>
              <Select onValueChange={setDenialReason} value={denialReason}><SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                <SelectContent>{denialReasons.map((reason) => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {denialReason === 'Other' && (<div className="grid gap-2"><Label htmlFor="otherReason">Please specify</Label><Textarea id="otherReason" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} /></div>)}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDenyDialogOpen(false)}>Cancel</Button><Button onClick={handleDenialSubmit}>Confirm Denial</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}