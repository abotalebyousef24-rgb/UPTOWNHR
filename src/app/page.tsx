'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// Define a type for our user object
type User = {
  id: string;
  email: string;
  name?: string;
}

export default function Home() {
  // Create the 'user' and 'setUser' function using useState
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    // This code runs on the client-side after the page loads
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (error) {
        console.error("Error parsing user data:", error)
        router.push("/login")
      }
    } else {
      // If no user data, redirect to login
      router.push("/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  // Show a loading message while we check for the user
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  // If the user is loaded, show the main page content
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the HR System</h1>
        <p className="text-lg mb-2">You are logged in as:</p>
        <p className="text-xl font-semibold mb-8">{user.email}</p>
        <Button onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </main>
  )
}
