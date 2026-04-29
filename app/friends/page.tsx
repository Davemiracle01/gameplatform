'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PeoplePage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('id, username, role, status').order('username').limit(50)
      .then(({ data }) => {
        if (data) setUsers(data)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen text-white p-4" style={{ background: '#0a0a0f' }}>
      <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm mb-4">← Back</button>
      <h1 className="text-xl font-bold mb-1">People</h1>
      <p className="text-gray-600 text-xs mb-6">{users.length} members</p>

      {loading && <p className="text-gray-500 text-sm">Loading...</p>}

      <div className="space-y-2">
        {users.map(u => (
          <div
            key={u.id}
            onClick={() => router.push(`/profile/${u.id}`)}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity"
          >
            <div
              style={{ background: u.role === 'admin' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            >
              {u.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">@{u.username}</span>
                {u.role === 'admin' && (
                  <span style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }} className="text-xs px-1.5 py-0.5 rounded-full">✓</span>
                )}
              </div>
              {u.status && <p className="text-gray-500 text-xs truncate">{u.status}</p>}
            </div>
            <span className="text-gray-700 text-sm">→</span>
          </div>
        ))}
      </div>
    </div>
  )
}
