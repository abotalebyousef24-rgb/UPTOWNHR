'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronsUpDown, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

type Employee = { id: string; firstName: string; lastName: string; };
type ReportData = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  denialReason: string | null;
  employee: { firstName: string; lastName: string; };
  leaveType: { name: string; };
}

// Use exact enum values to match backend
const STATUS_OPTIONS = [
  { value: 'APPROVED_BY_ADMIN', label: 'Approved' },
  { value: 'DENIED', label: 'Denied' },
  { value: 'PENDING_MANAGER', label: 'Pending Manager Approval' },
  { value: 'PENDING_ADMIN', label: 'Pending Final Approval' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CANCELLATION_PENDING_MANAGER', label: 'Pending Manager Cancellation Approval' },
  { value: 'CANCELLATION_PENDING_ADMIN', label: 'Pending Final Cancellation Approval' },
] as const

type SortBy = 'date' | 'status'
type SortDir = 'asc' | 'desc'

export default function ReportsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchEmployees = async () => {
        setIsLoading(true);
        try {
          let res: Response;
          if (session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN') {
            res = await fetch('/api/employees');
          } else {
            // managers and employees: fetch only accessible employees
            res = await fetch('/api/manager/accessible-employees');
          }
          if (!res.ok) throw new Error('Failed to fetch employees');
          setEmployees(await res.json());
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEmployees();
    } else if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router, session]);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError('');
    setReportData([]); // Clear previous results
    try {
      if (!startDate || !endDate) {
        throw new Error('Please select both a start and end date.');
      }
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];

      const params = new URLSearchParams({
        employeeId: selectedEmployeeId,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      });
      if (selectedStatuses.length > 0) {
        params.set('statuses', selectedStatuses.join(','));
      }
      
      const url = `/api/reports/leave?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to generate report.');
      }
      const data = await response.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let arr = [...reportData]
    if (selectedStatuses.length > 0) {
      const set = new Set(selectedStatuses)
      arr = arr.filter(r => set.has(r.status))
    }
    arr.sort((a, b) => {
      if (sortBy === 'date') {
        const aDate = new Date(a.startDate).getTime()
        const bDate = new Date(b.startDate).getTime()
        return sortDir === 'asc' ? aDate - bDate : bDate - aDate
      }
      // status sort (alphabetical by label)
      const aLabel = a.status.replace(/_/g, ' ')
      const bLabel = b.status.replace(/_/g, ' ')
      return sortDir === 'asc' ? aLabel.localeCompare(bLabel) : bLabel.localeCompare(aLabel)
    })
    return arr
  }, [reportData, selectedStatuses, sortBy, sortDir])

  const toggleSort = (target: SortBy) => {
    if (sortBy !== target) {
      setSortBy(target)
      setSortDir('asc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const handleExportCSV = () => {
    if (filteredAndSorted.length === 0) return;
    const header = ['Employee','Type','Start Date','End Date','Status'];
    const rows = filteredAndSorted.map(req => [
      `${req.employee.firstName} ${req.employee.lastName}`,
      req.leaveType.name,
      format(new Date(req.startDate), 'yyyy-MM-dd'),
      format(new Date(req.endDate), 'yyyy-MM-dd'),
      req.status.replace(/_/g, ' ')
    ]);
    const csv = [header, ...rows].map(r => r.map(field => {
      const s = String(field ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `leave-report-${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const handleExportXLSX = () => {
    if (filteredAndSorted.length === 0) return;
    const data = filteredAndSorted.map(req => ({
      Employee: `${req.employee.firstName} ${req.employee.lastName}`,
      Type: req.leaveType.name,
      "Start Date": format(new Date(req.startDate), 'yyyy-MM-dd'),
      "End Date": format(new Date(req.endDate), 'yyyy-MM-dd'),
      Status: req.status.replace(/_/g, ' ')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Report');
    const filename = `leave-report-${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  if (sessionStatus === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }
  
  // --- FIX: Pre-build the table content to prevent hydration errors ---
  const reportTableContent = filteredAndSorted.length > 0 ? (
    filteredAndSorted.map(req => (
      <TableRow key={req.id}>
        <TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell>
        <TableCell>{req.leaveType.name}</TableCell>
        <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
        <TableCell><Badge variant={req.status === 'DENIED' ? 'destructive' : 'default'}>{req.status.replace(/_/g, ' ')}</Badge></TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow><TableCell colSpan={4} className="text-center">No data for the selected criteria. Please generate a report.</TableCell></TableRow>
  );

  return (
    <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="mb-4">
            <Button asChild variant="outline">
                <Link href="/dashboard">← Back to Dashboard</Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests Report</CardTitle>
          <CardDescription>Generate reports for leave requests by employee and date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <div className="grid gap-2">
              <Label>Employee</Label>
              <Select onValueChange={setSelectedEmployeeId} defaultValue="all">
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {(session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN')
                      ? 'All Employees'
                      : 'All Accessible Employees'}
                  </SelectItem>
                  {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-[260px] justify-between">
                    {selectedStatuses.length > 0 ? `${selectedStatuses.length} selected` : 'Filter by status'}
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px]">
                  <div className="space-y-2">
                    {STATUS_OPTIONS.map(({ value, label }) => {
                      const checked = selectedStatuses.includes(value)
                      return (
                        <label key={value} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const isChecked = Boolean(v)
                              setSelectedStatuses((prev) =>
                                isChecked ? [...prev, value] : prev.filter(s => s !== value)
                              )
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      )
                    })}
                    {selectedStatuses.length > 0 && (
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full"
                          onClick={() => setSelectedStatuses([])}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleGenerateReport} disabled={isLoading}>{isLoading ? 'Generating...' : 'Generate Report'}</Button>
              <Button variant="outline" onClick={handleExportCSV} disabled={filteredAndSorted.length === 0}>Export CSV</Button>
              <Button variant="outline" onClick={handleExportXLSX} disabled={filteredAndSorted.length === 0}>Export Excel</Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Report Results</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  Dates
                  <ArrowUpDown className="inline-block ml-2 h-4 w-4 align-middle" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  Status
                  <ArrowUpDown className="inline-block ml-2 h-4 w-4 align-middle" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportTableContent}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}