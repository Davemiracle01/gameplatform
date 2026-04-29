'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PeoplePage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role')

      if (error) setError(error.message)
      if (data) setUsers(data)
      setLoading(false)
    }
    init()
  }, [])

  return (
    <div className="min-h-screen text-white p-4" style={{ background: '#0a0a0f' }}>
      <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm mb-4">← Back</button>
      <h1 className="text-xl font-bold mb-4">People</h1>
      {loading && <p className="text-gray-400">Loading...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}
      {!loading && !error && <p className="text-gray-400 mb-4">{users.length} users found</p>}
      {users.map(u => (
        <div key={u.id} className="bg-gray-900 p-3 rounded-lg mb-2">
          <p className="text-white">@{u.username} — {u.role}</p>
        </div>
      ))}
    </div>
  )
}
