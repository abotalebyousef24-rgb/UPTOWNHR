'use client'

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface EmployeeData {
  id: string;
  managerId: string | null;
  user: {
    email: string;
  };
  firstName: string;
  lastName: string;
  position: string;
  startDate: string | null; // Changed from hireDate to startDate
}

interface ManagerOption {
  id: string;
  firstName: string;
  lastName: string;
}

export default function EditEmployeePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined); // Changed from hireDate to startDate
  const [managerId, setManagerId] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<ManagerOption | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!employeeId) return;
      try {
        const employeeResponse = await fetch(`/api/employees/${employeeId}`);
        if (employeeResponse.ok) {
          const data: EmployeeData = await employeeResponse.json();
          setEmail(data.user.email);
          setFirstName(data.firstName);
          setLastName(data.lastName);
          setPosition(data.position);
          setManagerId(data.managerId);
          setStartDate(data.startDate ? new Date(data.startDate) : undefined); // Changed from hireDate to startDate
        }

        const listResponse = await fetch('/api/employees/list');
        if (listResponse.ok) {
          const managersData: ManagerOption[] = await listResponse.json();
          setManagers(managersData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [employeeId]);

  useEffect(() => {
    if (managerId) {
      const found = managers.find(m => m.id === managerId) || null;
      setSelectedManager(found);
    } else {
      setSelectedManager(null);
    }
  }, [managerId, managers]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const data = {
      email,
      firstName,
      lastName,
      position,
      startDate, // Changed from hireDate to startDate
      managerId: managerId === 'none' ? null : managerId,
    };

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push('/admin/employees');
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update employee');
      }
    } catch (error) {
      alert('Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Employee</CardTitle>
          <CardDescription>Update details for {email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="w-1/2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label> {/* Changed from hireDate to startDate */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>} {/* Changed from hireDate to startDate */}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /> {/* Changed from hireDate to startDate */}
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="managerId">Manager (Optional)</Label>
              <Popover open={managerPopoverOpen} onOpenChange={setManagerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={managerPopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedManager
                      ? `${selectedManager.firstName} ${selectedManager.lastName}`
                      : managerId === 'none'
                        ? 'No Manager'
                        : 'Select a manager'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search manager..." />
                    <CommandList>
                      <CommandEmpty>No manager found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="No Manager"
                          onSelect={() => {
                            setManagerId('none');
                            setSelectedManager(null);
                            setManagerPopoverOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', managerId === 'none' ? 'opacity-100' : 'opacity-0')} />
                          No Manager
                        </CommandItem>
                        {managers
                          .filter((manager) => manager.id !== employeeId)
                          .map((manager) => {
                            const isSelected = managerId === manager.id;
                            return (
                              <CommandItem
                                key={manager.id}
                                value={`${manager.firstName} ${manager.lastName}`}
                                onSelect={() => {
                                  setManagerId(manager.id);
                                  setSelectedManager(manager);
                                  setManagerPopoverOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                {manager.firstName} {manager.lastName}
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Employee'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}