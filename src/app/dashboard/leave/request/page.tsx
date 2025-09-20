'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

type Balance = {
  id: string
  leaveType: {
    id: string
    name: string
    unit: string
  }
  remaining: number
}

export default function RequestLeavePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [balances, setBalances] = useState<Balance[]>([])
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Fetch leave balances
  useEffect(() => {
    if (!session || status === 'loading') return

    const fetchBalances = async () => {
      try {
        const res = await fetch('/api/my-balances')
        if (!res.ok) throw new Error('Failed to load your leave balances')
        const data = await res.json()
        setBalances(data)
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchBalances()
  }, [session, status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!selectedLeaveTypeId) {
      setError('Please select a leave type.')
      setIsLoading(false)
      return
    }
    if (!startDate) {
      setError('Please select a start date.')
      setIsLoading(false)
      return
    }
    if (!endDate) {
      setError('Please select an end date.')
      setIsLoading(false)
      return
    }
    if (endDate < startDate) {
      setError('End date cannot be before start date.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveTypeId: selectedLeaveTypeId,
          startDate,
          endDate,
        }),
      })

      if (!response.ok) {
        let message = 'Submit failed'
        try {
          const data = await response.json()
          message = data?.message || message
          if (process.env.NODE_ENV !== 'production' && data?.error) {
            message += `: ${data.error}`
          }
        } catch {
          const text = await response.text()
          if (text) message = text
        }
        throw new Error(message)
      }

      alert('Leave request submitted successfully!')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading session...</p>
      </div>
    )
  }

  if (!session) {
    return null // Redirect is happening
  }

  return (
    <div className="flex items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Request Time Off</CardTitle>
          <CardDescription>
            Select a leave type and the dates you'd like to take off.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6">
            {/* Leave Type */}
            <div className="grid gap-2">
              <Label>Leave Type</Label>
              <Select onValueChange={setSelectedLeaveTypeId} value={selectedLeaveTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a leave type..." />
                </SelectTrigger>
                <SelectContent>
                  {balances.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No balances available</div>
                  ) : (
                    balances.map((b) => (
                      <SelectItem key={b.leaveType.id} value={b.leaveType.id}>
                        {b.leaveType.name} (Remaining: {b.remaining} {b.leaveType.unit.toLowerCase()})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Start and End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <DatePicker value={startDate} onChange={setStartDate} />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <DatePicker value={endDate} onChange={setEndDate} />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>

          <div className="flex justify-end p-6 pt-0">
            <Button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}