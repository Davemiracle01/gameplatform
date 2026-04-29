'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = { id: string; username: string; status: string; role: string }

export default function PeoplePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async (uid: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, status, role')
      .neq('id', uid)
      .order('username')
      .limit(50)
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  const searchUsers = async () => {
    if (!search.trim()) { loadUsers(userId); return }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, status, role')
      .neq('id', userId)
      .ilike('username', `%${search}%`)
      .limit(20)
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    let channel: any

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }

      const uid = data.user.id
      setUserId(uid)

      loadUsers(uid)

      channel = supabase.channel('people-presence')
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const ids = new Set(
            Object.values(state).flat().map((p: any) => p.user_id)
          )
          setOnlineIds(ids as Set<string>)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: uid })
          }
        })
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [loadUsers])

  const sorted = [...users].sort((a, b) => {
    const aOnline = onlineIds.has(a.id) ? 0 : 1
    const bOnline = onlineIds.has(b.id) ? 0 : 1
    return aOnline - bOnline
  })

  return (
    <div className="min-h-screen text-white p-4" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)' }}>
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">People</h1>
            <p className="text-gray-500 text-xs">{onlineIds.size} online now</p>
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

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)' }} className="p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-800" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-800 rounded w-24 mb-2" />
                  <div className="h-2 bg-gray-800 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {sorted.map(u => {
              const isOnline = onlineIds.has(u.id)
              return (
                <div
                  key={u.id}
                  onClick={() => router.push(`/profile/${u.id}`)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      style={{ background: u.role === 'admin' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    >
                      {u.username[0].toUpperCase()}
                    </div>
                    <div style={{
                      background: isOnline ? '#22c55e' : '#4b5563',
                      border: '2px solid #0a0a0f'
                    }} className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">@{u.username}</p>
                      {u.role === 'admin' && (
                        <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a855f7' }} className="text-xs px-1.5 py-0.5 rounded-full">ADMIN</span>
                      )}
                    </div>
                    {u.status && <p className="text-gray-500 text-xs truncate">{u.status}</p>}
                    <p style={{ color: isOnline ? '#22c55e' : '#4b5563' }} className="text-xs">{isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                  <span className="text-gray-600 text-xs">→</span>
                </div>
              )
            })}
            {sorted.length === 0 && (
              <p className="text-gray-500 text-sm text-center">No users found</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}