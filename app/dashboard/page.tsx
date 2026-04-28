'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setEmail(data.user.email || '')
    })
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">GamePlatform</h1>
          <button onClick={logout} className="text-gray-400 hover:text-white text-sm">Logout</button>
        </div>
        <p className="text-gray-400 mb-6">Welcome, {email}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">Games</h2>
            <p className="text-gray-400 text-sm">Coming soon</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold mb-1">Social</h2>
            <p className="text-gray-400 text-sm">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
}
