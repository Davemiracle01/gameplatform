'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = { id: string; username: string; status: string; role: string }

export default function PeoplePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let channel: any

    supabase.from('profiles').select('id, username, status, role').order('username').limit(50)
      .then(({ data }) => {
        if (data) setAllUsers(data)
        setLoading(false)
      })

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const uid = data.user.id
      setUserId(uid)

      channel = supabase.channel('people-presence')
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const ids = new Set(Object.values(state).flat().map((p: any) => p.user_id))
          setOnlineIds(ids as Set<string>)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await channel.track({ user_id: uid })
        })
    })

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const users = allUsers.filter(u => u.id !== userId)

  const filtered = search.trim()
    ? users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : users

  const onlineUsers = filtered.filter(u => onlineIds.has(u.id))
  const offlineUsers = filtered.filter(u => !onlineIds.has(u.id))

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)' }}>
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="sticky top-0 z-10 px-4 py-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold tracking-wide">People</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              <span className="text-emerald-400 text-xs">{onlineIds.size} online</span>
              <span className="text-gray-600 text-xs">· {users.length} total</span>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-gray-600 text-sm">← Back</button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        <input
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          className="w-full text-white px-4 py-3 rounded-2xl outline-none text-sm placeholder-gray-600 mb-6"
          placeholder="Search by username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)' }} className="p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-gray-800" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-800 rounded w-24 mb-2" />
                  <div className="h-2 bg-gray-800 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {onlineUsers.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-emerald-500 tracking-widest uppercase mb-3">Online — {onlineUsers.length}</p>
                <div className="space-y-2">
                  {onlineUsers.map(u => (
                    <UserCard key={u.id} u={u} isOnline={true} onClick={() => router.push(`/profile/${u.id}`)} />
                  ))}
                </div>
              </div>
            )}
            {offlineUsers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 tracking-widest uppercase mb-3">Offline — {offlineUsers.length}</p>
                <div className="space-y-2">
                  {offlineUsers.map(u => (
                    <UserCard key={u.id} u={u} isOnline={false} onClick={() => router.push(`/profile/${u.id}`)} />
                  ))}
                </div>
              </div>
            )}
            {filtered.length === 0 && <p className="text-gray-600 text-sm text-center py-10">No users found</p>}
          </>
        )}
      </div>
    </div>
  )
}

function UserCard({ u, isOnline, onClick }: { u: any; isOnline: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      className="p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all hover:border-indigo-500/30"
    >
      <div className="relative flex-shrink-0">
        <div
          style={{ background: u.role === 'admin' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base"
        >
          {u.username[0].toUpperCase()}
        </div>
        <div style={{
          background: isOnline ? '#22c55e' : '#374151',
          border: '2px solid #0a0a0f',
          boxShadow: isOnline ? '0 0 6px #22c55e88' : 'none'
        }} className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm">@{u.username}</span>
          {u.role === 'admin' && (
            <span style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }} className="text-xs px-1.5 py-0.5 rounded-full">✓ ADMIN</span>
          )}
        </div>
        {u.status
          ? <p className="text-gray-500 text-xs truncate mt-0.5">{u.status}</p>
          : <p style={{ color: isOnline ? '#22c55e' : '#4b5563' }} className="text-xs mt-0.5">{isOnline ? 'Active now' : 'Offline'}</p>
        }
      </div>
      <div style={{ color: isOnline ? '#6366f1' : '#374151' }} className="text-sm">→</div>
    </div>
  )
}
