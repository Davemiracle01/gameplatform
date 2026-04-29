'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = { id: string; username: string; status: string }

export default function PeoplePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setUserId(data.user.id)
        loadUsers(data.user.id)
      }
    })
  }, [])

  const loadUsers = async (uid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, status')
      .neq('id', uid)
      .order('username')
      .limit(50)
    if (data) setUsers(data)
    setLoading(false)
  }

  const searchUsers = async () => {
    if (!search.trim()) { loadUsers(userId); return }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, status')
      .neq('id', userId)
      .ilike('username', `%${search}%`)
      .limit(20)
    if (data) setUsers(data)
    setLoading(false)
  }

  return (
    <div className="min-h-screen text-white p-4" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)' }}>
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">People</h1>
            <p className="text-gray-500 text-xs">Find and connect with others</p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">← Back</button>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            className="flex-1 text-white px-4 py-2.5 rounded-2xl outline-none text-sm placeholder-gray-600"
            placeholder="Search username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()}
          />
          <button
            onClick={searchUsers}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            className="px-4 py-2.5 rounded-2xl text-sm font-semibold"
          >
            Search
          </button>
        </div>

        {loading && <p className="text-gray-500 text-sm text-center">Loading...</p>}

        <div className="space-y-3">
          {users.map(u => (
            <div
              key={u.id}
              onClick={() => router.push(`/profile/${u.id}`)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all"
            >
              <div
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              >
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">@{u.username}</p>
                {u.status && <p className="text-gray-500 text-xs truncate">{u.status}</p>}
              </div>
              <span className="text-gray-600 text-xs">→</span>
            </div>
          ))}
          {!loading && users.length === 0 && (
            <p className="text-gray-500 text-sm text-center">No users found</p>
          )}
        </div>
      </div>
    </div>
  )
}