'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmployeeForm } from '@/components/EmployeeForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CreateEmployeePage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        // FIXED: Redirect to the main dashboard
        router.push('/dashboard')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create employee')
      }
    } catch (error) {
      console.error('Error creating employee:', error)
      alert('Failed to create employee')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Employee</CardTitle>
          <CardDescription>
            Add a new employee to the system. Assign a manager if applicable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm onSubmit={handleSubmit} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}