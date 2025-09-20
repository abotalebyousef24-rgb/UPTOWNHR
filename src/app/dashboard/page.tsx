// File: src/app/dashboard/page.tsx

'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
type BadgeProps = VariantProps<typeof badgeVariants>;
import { LeaveStatus } from '@prisma/client';

type Request = {
  id: string;
  startDate: string; endDate: string;
  status: LeaveStatus;
  denialReason: string | null;
  cancellationReason: string | null;
  employee: { firstName: string; lastName: string; };
  leaveType: { name: string; };
  approvedAt: string | null;
  approvedBy: { email: string } | null;
  deniedAt: string | null;
  deniedBy: { email: string } | null;
  cancelledAt: string | null;
  cancelledBy: { email: string } | null;
  auditTrail: {
      id: string;
      createdAt: string;
      newStatus: string;
      reason: string | null;
      changedBy: { email: string };
  }[];
  hasOverlap?: boolean;
  skipReason?: string | null;
}
type Balance = {
  id: string;
  leaveType: { name: string; unit: string; cadence: string; };
  year: number; month: number | null; total: number; remaining: number;
}

const getMonthName = (monthNumber: number | null) => {
  if (!monthNumber) return '';
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString('en-US', { month: 'long' });
};

const denialReasons = ["High Work Capacity", "Request Overlaps", "Insufficient Notice", "Other"];

const getDisplayStatus = (status: string): { text: string; variant: BadgeProps["variant"] } => {
  switch (status) {
    case 'PENDING_MANAGER': return { text: 'Pending Manager Approval', variant: 'default' };
    case 'APPROVED_BY_MANAGER':
    case 'PENDING_ADMIN': return { text: 'Pending Final Approval', variant: 'secondary' };
    case 'CANCELLATION_PENDING_MANAGER': return { text: 'Cancellation: Pending Manager', variant: 'default' };
    case 'CANCELLATION_PENDING_ADMIN': return { text: 'Cancellation: Pending Admin', variant: 'secondary' };
    case 'APPROVED_BY_ADMIN': return { text: 'Approved', variant: 'success' };
    case 'DENIED': return { text: 'Denied', variant: 'destructive' };
    case 'CANCELLED': return { text: 'Cancelled', variant: 'outline' };
    default: return { text: status.replace(/_/g, ' '), variant: 'default' };
  }
};

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname(); // Hoisted early to avoid any hook order surprises

  const [isManager, setIsManager] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [pendingManagerRequests, setPendingManagerRequests] = useState<Request[]>([]);
  const [pendingManagerCancellations, setPendingManagerCancellations] = useState<Request[]>([]);
  const [pendingHrRequests, setPendingHrRequests] = useState<Request[]>([]);
  const [pendingHrCancellations, setPendingHrCancellations] = useState<Request[]>([]);
  const [requestHistory, setRequestHistory] = useState<Request[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [currentRequestToAction, setCurrentRequestToAction] = useState<Request | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isCancellationRejection, setIsCancellationRejection] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const isHr = session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';

  const fetchData = async () => {
    if (!session) return;
    try {
      setError('');
      setIsLoading(true);
      const isManagerCheck = await fetch('/api/me/is-manager');
      if (!isManagerCheck.ok) throw new Error('Failed to check manager status');
      const { isManager: userIsManager } = await isManagerCheck.json();
      setIsManager(userIsManager);
      let historyUrl = '/api/leave-requests';
      if (startDate && endDate) {
        historyUrl += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      }
      const promises: Promise<Response>[] = [ fetch('/api/my-balances'), fetch(historyUrl) ];
      if (userIsManager) {
        promises.push(fetch('/api/manager/pending-approvals'));
        promises.push(fetch('/api/manager/pending-cancellations'));
      }
      if (isHr) {
        promises.push(fetch('/api/admin/requests'));
        promises.push(fetch('/api/admin/pending-cancellations'));
      }
      const responses = await Promise.all(promises);
      for (const res of responses) {
        if (!res.ok) {
           const errBody = await res.json().catch(() => ({ message: `An API error occurred (${res.status})` }));
           throw new Error(errBody.message || `Failed to fetch data: ${res.status}`);
        }
      }
      const allData = await Promise.all(responses.map(res => res.json()));
      let currentIndex = 0;
      setBalances(allData[currentIndex++]);
      setRequestHistory(allData[currentIndex++]);
      if (userIsManager) {
        setPendingManagerRequests(allData[currentIndex++]);
        setPendingManagerCancellations(allData[currentIndex++]);
      }
      if (isHr) {
        setPendingHrRequests(allData[currentIndex++]);
        setPendingHrCancellations(allData[currentIndex]);
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') fetchData();
    else if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);
  
  const handleFilter = () => { fetchData(); };

  const handleRequestAction = async (requestId: string, newStatus: string, reason?: string) => {
    try {
      setError('');
      const response = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, denialReason: reason }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
      }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDenialSubmit = async () => {
    if (!currentRequestToAction) return;
    const finalReason = denialReason === 'Other' ? otherReason : denialReason;
    if (!finalReason) {
      setError("A reason is required.");
      return;
    }
    if (isCancellationRejection) {
      await handleCancellationApproval(currentRequestToAction.id, 'REJECT', finalReason);
    } else {
      await handleRequestAction(currentRequestToAction.id, 'DENIED', finalReason);
    }
    setIsDenyDialogOpen(false);
    setDenialReason('');
       setOtherReason('');
    setIsCancellationRejection(false);
  };
  
  const handleCancelRequest = async (requestId: string, status: string) => {
    let endpoint = '';
    let confirmMessage = '';
    if (status === 'PENDING_MANAGER' || status === 'APPROVED_BY_MANAGER') {
      endpoint = `/api/leave-requests/${requestId}/cancel`;
      confirmMessage = 'Are you sure you want to cancel this pending request?';
    } else if (status === 'APPROVED_BY_ADMIN') {
      endpoint = `/api/leave-requests/${requestId}/request-cancellation`;
      confirmMessage = 'This will send a cancellation request to your manager. Are you sure?';
    } else return;
    if (!window.confirm(confirmMessage)) return;
    try {
      setError('');
      const response = await fetch(endpoint, { method: 'PATCH' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
      }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancellationApproval = async (requestId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    const currentRequest = [...pendingManagerCancellations, ...pendingHrCancellations].find(r => r.id === requestId);
    let confirmMessage = '';
    if (action === 'APPROVE') {
      confirmMessage = currentRequest?.status === 'CANCELLATION_PENDING_MANAGER' 
        ? "Are you sure you want to approve this cancellation request and send it for final HR approval?"
        : "Are you sure you want to give final approval for this cancellation? The employee's leave balance will be restored.";
    }
    if (action === 'APPROVE' && !window.confirm(confirmMessage)) return;
    setError('');
    try {
      const response = await fetch(`/api/leave-requests/${requestId}/cancellation-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
      }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Move loading UI to render section to keep hook order stable
  const showLoading = sessionStatus === 'loading' || isLoading;
  
  const balancesTableContent = balances.map(b => (<TableRow key={b.id}><TableCell>{b.leaveType.name}</TableCell><TableCell>{b.leaveType.cadence === 'ANNUAL' ? b.year : `${getMonthName(b.month)} ${b.year}`}</TableCell><TableCell className="text-right font-medium">{b.remaining} {b.leaveType.unit.toLowerCase()}</TableCell><TableCell className="text-right">{b.total} {b.leaveType.unit.toLowerCase()}</TableCell></TableRow>));
  
  const historyTableContent = requestHistory.length > 0 ? (
    requestHistory.map(req => {
      const isCancellable = req.status === 'PENDING_MANAGER' || req.status === 'APPROVED_BY_MANAGER';
      const isCancellationRequestable = req.status === 'APPROVED_BY_ADMIN';
      const displayStatus = getDisplayStatus(req.status);
      return (
        <TableRow key={req.id}><TableCell>{req.leaveType.name}</TableCell><TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell><TableCell><Badge variant={displayStatus.variant}>{displayStatus.text}</Badge></TableCell><TableCell>{req.denialReason || req.cancellationReason}</TableCell><TableCell className="text-right"><Button variant="link" size="sm" onClick={() => { setSelectedRequest(req); setIsHistoryDialogOpen(true); }}>Details</Button>{isCancellable && (<Button variant="link" size="sm" onClick={() => handleCancelRequest(req.id, req.status)}>Cancel</Button>)}{isCancellationRequestable && (<Button variant="link" size="sm" onClick={() => handleCancelRequest(req.id, req.status)}>Request Cancellation</Button>)}</TableCell></TableRow>
      );
    })
  ) : ( <TableRow><TableCell colSpan={6} className="text-center">No requests found in this period.</TableCell></TableRow> );

  const managerPendingContent = pendingManagerRequests.map(req => (<TableRow key={req.id}><TableCell className="flex items-center gap-2">{req.hasOverlap && <span title="Warning: This request overlaps with another approved leave.">⚠️</span>} {req.employee.firstName} {req.employee.lastName}</TableCell><TableCell>{req.leaveType.name}</TableCell><TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell><TableCell className="text-right space-x-2"><Button size="sm" className="btn-primary-outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); setIsCancellationRejection(false); }}>Deny</Button><Button size="sm" className="btn-primary" onClick={() => handleRequestAction(req.id, 'APPROVED_BY_MANAGER')}>Approve</Button></TableCell></TableRow>));

  const managerCancellationContent = pendingManagerCancellations.map(req => (<TableRow key={req.id}><TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell><TableCell>{req.leaveType.name}</TableCell><TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell><TableCell className="text-right space-x-2"><Button size="sm" className="btn-primary-outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); setIsCancellationRejection(true); }}>Reject Cancellation</Button><Button size="sm" className="btn-primary" onClick={() => handleCancellationApproval(req.id, 'APPROVE')}>Approve Cancellation</Button></TableCell></TableRow>));

  const hrPendingContent = pendingHrRequests.concat(pendingHrCancellations).map(req => {
      const isCancellation = req.status === 'CANCELLATION_PENDING_ADMIN';
      const showSkip = req.status === 'PENDING_ADMIN' && req.skipReason;
      return (
        <TableRow key={req.id} className={isCancellation ? "bg-brand-100" : ""}>
          <TableCell>
            {req.employee.firstName} {req.employee.lastName}
            {showSkip && (<div className="text-xs text-muted-foreground mt-1">Override: {req.skipReason}</div>)}
          </TableCell>
          <TableCell>{req.leaveType.name} {isCancellation && '(Cancellation)'}</TableCell>
          <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
          <TableCell className="text-right space-x-2">
            <Button size="sm" className="btn-primary-outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); setIsCancellationRejection(isCancellation); }}>Deny</Button>
            <Button size="sm" className="btn-primary" onClick={() => isCancellation ? handleCancellationApproval(req.id, 'APPROVE') : handleRequestAction(req.id, 'APPROVED_BY_ADMIN')}>Final Approve</Button>
          </TableCell>
        </TableRow>
      );
  });
  
  const adminNav = [
    { href: '/admin/employees', label: 'Manage Employees' },
    { href: '/admin/employees/create', label: 'Add Employee' },
    { href: '/dashboard/settings/leave-types', label: 'Leave Types' },
    { href: '/dashboard/settings/leave-balances', label: 'Leave Balances' },
    { href: '/admin/holidays', label: 'Holidays' },
    { href: '/admin/work-schedules', label: 'Schedules' },
    { href: '/dashboard/settings/bulk-update', label: 'Bulk Update' },
    { href: '/dashboard/reports', label: 'Reports' },
  ] as const;

  return (
    <>
      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        {showLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]"><p>Loading...</p></div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {session?.user?.email}</p>
              </div>
            </div>
            {error && <Card className="bg-destructive/10 border-destructive"><CardHeader><CardTitle className="text-destructive">An Error Occurred</CardTitle><CardDescription className="text-destructive">{error}</CardDescription></CardHeader></Card>}
            {isHr && (pendingHrRequests.length > 0 || pendingHrCancellations.length > 0) && (<Card className="border-red-500 bg-red-500/5"><CardHeader><CardTitle>Final HR Approvals</CardTitle><CardDescription>Manager-approved requests and cancellations waiting for final sign-off.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{hrPendingContent}</TableBody></Table></CardContent></Card>)}
            {isManager && (<>
                <Card className="border-primary bg-primary/5"><CardHeader><CardTitle>Pending Leave Approvals</CardTitle><CardDescription>Requests waiting for your approval.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{pendingManagerRequests.length > 0 ? managerPendingContent : <TableRow><TableCell colSpan={4} className="text-center">No requests waiting for your approval.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
                {(pendingManagerCancellations.length > 0) && <Card className="border-brand-500 bg-brand-500/5"><CardHeader><CardTitle>Pending Cancellation Approvals</CardTitle><CardDescription>Employees requesting to cancel approved leave.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates to Cancel</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{managerCancellationContent}</TableBody></Table></CardContent></Card>}
            </>)}
            <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>My Leave Balances</CardTitle><CardDescription>Your available leave for the current period.</CardDescription></div><Link href="/dashboard/leave/request"><Button className="btn-primary">Request Time Off</Button></Link></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Leave Type</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{balances.length > 0 ? balancesTableContent : <TableRow><TableCell colSpan={4} className="text-center">No balances to display.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
            <Card><CardHeader><CardTitle>My Request History</CardTitle><CardDescription>A history of all your submitted leave requests.</CardDescription></CardHeader><CardContent>
                <div className="flex items-center space-x-4 mb-4"><Popover><PopoverTrigger asChild><Button className={cn("w-[240px] justify-start text-left font-normal btn-primary-outline",!startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : <span>Pick start date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent></Popover><Popover><PopoverTrigger asChild><Button className={cn("w-[240px] justify-start text-left font-normal btn-primary-outline",!endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP") : <span>Pick end date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent></Popover><Button className="btn-primary" onClick={handleFilter}>Filter</Button></div>
                <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead>Denial Reason</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{historyTableContent}</TableBody></Table>
            </CardContent></Card>
          </>
        )}
      </main>
      <Dialog open={isDenyDialogOpen} onOpenChange={(open) => { setIsDenyDialogOpen(open); if (!open) { setDenialReason(''); setOtherReason(''); setIsCancellationRejection(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isCancellationRejection ? 'Reason for Rejecting Cancellation' : 'Reason for Denial'}</DialogTitle><DialogDescription>{isCancellationRejection ? 'Please provide a reason for rejecting this cancellation request.' : 'Please provide a reason for denying this request.'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid gap-2"><Label htmlFor="denialReason">Reason</Label><Select onValueChange={setDenialReason} value={denialReason}><SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger><SelectContent>{denialReasons.map((reason) => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent></Select></div>{denialReason === 'Other' && (<div className="grid gap-2"><Label htmlFor="otherReason">Please specify</Label><Textarea id="otherReason" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} /></div>)}</div>
          <DialogFooter><Button className="btn-primary-outline" onClick={() => setIsDenyDialogOpen(false)}>Cancel</Button><Button className="btn-primary" onClick={handleDenialSubmit}>{isCancellationRejection ? 'Confirm Rejection' : 'Confirm Denial'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request History & Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.leaveType.name}: {selectedRequest ? format(new Date(selectedRequest.startDate), 'PPP') : ''} - {selectedRequest ? format(new Date(selectedRequest.endDate), 'PPP') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <h3 className="font-semibold">Audit Trail</h3>
              <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Performed By</TableHead></TableRow></TableHeader>
                  <TableBody>
                      {selectedRequest?.auditTrail.map(audit => (
                          <TableRow key={audit.id}>
                              <TableCell>{format(new Date(audit.createdAt), 'PPP p')}</TableCell>
                              <TableCell>Status changed to <Badge variant={getDisplayStatus(audit.newStatus).variant}>{getDisplayStatus(audit.newStatus).text}</Badge></TableCell>
                              <TableCell>{audit.changedBy.email}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
              {(selectedRequest?.denialReason || selectedRequest?.cancellationReason) && (
                <div>
                  <h3 className="font-semibold mt-4">Reason Provided</h3>
                  <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">{selectedRequest?.denialReason || selectedRequest?.cancellationReason}</p>
                </div>
              )}
          </div>
          <DialogFooter>
            <Button className="btn-primary" onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}