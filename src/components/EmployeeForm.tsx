// File: src/components/EmployeeForm.tsx

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// UPDATED: Removed 'role' from the schema
const formSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  position: z.string().min(1, 'Position is required'),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  managerId: z.string().optional(),
})

type EmployeeFormValues = z.infer<typeof formSchema>

interface Employee {
  id: string
  firstName: string
  lastName: string
  user: {
    email: string
  }
}

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormValues) => Promise<void>
  isLoading?: boolean
}

export function EmployeeForm({ onSubmit, isLoading = false }: EmployeeFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selectedManager, setSelectedManager] = useState<Employee | null>(null)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<EmployeeFormValues>({
    resolver: zodResolver(formSchema),
    // UPDATED: Removed 'role' from default values
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      position: '',
    },
  })

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees/list') // ✅ Correct endpoint
        if (response.ok) {
          const data: Employee[] = await response.json()
          setEmployees(data)
        } else {
          console.error('Failed to load employees:', await response.text())
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  const onFormSubmit = async (data: EmployeeFormValues) => {
    await onSubmit(data)
  }

  const selectedStartDate = watch('startDate')

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...register('firstName')} placeholder="John"/>
          {errors.firstName && (<p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>)}
        </div>

        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" {...register('lastName')} placeholder="Doe"/>
          {errors.lastName && (<p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>)}
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} placeholder="john.doe@uptown6october.com"/>
        {errors.email && (<p className="text-sm text-red-500 mt-1">{errors.email.message}</p>)}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} placeholder="••••••"/>
        {errors.password && (<p className="text-sm text-red-500 mt-1">{errors.password.message}</p>)}
      </div>

      <div>
        <Label htmlFor="position">Position</Label>
        <Input id="position" {...register('position')} placeholder="Software Developer"/>
        {errors.position && (<p className="text-sm text-red-500 mt-1">{errors.position.message}</p>)}
      </div>

      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <DatePicker
          value={selectedStartDate}
          onChange={(date) => setValue('startDate', date as Date)}
        />
        {errors.startDate && (<p className="text-sm text-red-500 mt-1">{errors.startDate.message}</p>)}
      </div>

      <div>
        <Label htmlFor="managerId">Manager (Optional)</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="btn-primary-outline w-full justify-between"
            >
              {selectedManager
                ? `${selectedManager.firstName} ${selectedManager.lastName} (${selectedManager.user.email})`
                : loading ? 'Loading managers...' : 'Select a manager'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search manager..." />
              <CommandList>
                <CommandEmpty>No manager found.</CommandEmpty>
                <CommandGroup>
                  {employees.map((employee) => {
                    const isSelected = selectedManager?.id === employee.id
                    return (
                      <CommandItem
                        key={employee.id}
                        value={`${employee.firstName} ${employee.lastName} ${employee.user.email}`}
                        onSelect={() => {
                          setSelectedManager(employee)
                          setValue('managerId', employee.id)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                        {employee.firstName} {employee.lastName} ({employee.user.email})
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.managerId && (<p className="text-sm text-red-500 mt-1">{errors.managerId.message}</p>)}
      </div>

      <Button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? 'Creating...' : 'Create Employee'}
      </Button>
    </form>
  )
}