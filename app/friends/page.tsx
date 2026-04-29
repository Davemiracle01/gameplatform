'use client'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    let channel: any

    const init = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) { router.push('/login'); return }
      const uid = authData.user.id
      setUserId(uid)

      const { data } = await supabase
        .from('profiles')
        .select('id, username, status, role')
        .order('username')
        .limit(50)

      if (data) setUsers(data.filter(u => u.id !== uid))
      setLoading(false)

      channel = supabase.channel('people-presence')
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const ids = new Set(Object.values(state).flat().map((p: any) => p.user_id))
          setOnlineIds(ids as Set<string>)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await channel.track({ user_id: uid })
        })
    }

    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const searchUsers = async () => {
    if (!search.trim()) {
      const { data } = await supabase.from('profiles').select('id, username, status, role').order('username').limit(50)
      if (data) setUsers(data.filter(u => u.id !== userId))
      return
    }
    const { data } = await supabase.from('profiles').select('id, username, status, role').ilike('username', `%${search}%`).limit(20)
    if (data) setUsers(data.filter(u => u.id !== userId))
  }

  const sorted = [...users].sort((a, b) => (onlineIds.has(a.id) ? 0 : 1) - (onlineIds.has(b.id) ? 0 : 1))
  const onlineUsers = sorted.filter(u => onlineIds.has(u.id))
  const offlineUsers = sorted.filter(u => !onlineIds.has(u.id))

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }} className="sticky top-0 z-10 px-4 py-4">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold tracking-wide">People</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              <span className="text-emerald-400 text-xs">{onlineIds.size} online</span>
              <span className="text-gray-600 text-xs">· {users.length} total</span>
            </div>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-white text-sm transition-colors">← Back</button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm">⌕</div>
          <input
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            className="w-full text-white pl-9 pr-24 py-3 rounded-2xl outline-none text-sm placeholder-gray-600 focus:border-indigo-500 transition-colors"
            placeholder="Search by username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()}
          />
          <button
            onClick={searchUsers}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            Search
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)' }} className="p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-gray-800/50" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-800/50 rounded-full w-28 mb-2" />
                  <div className="h-2 bg-gray-800/50 rounded-full w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Online section */}
            {onlineUsers.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-emerald-500 tracking-widest uppercase mb-3 px-1">Online — {onlineUsers.length}</p>
                <div className="space-y-2">
                  {onlineUsers.map(u => <UserCard key={u.id} u={u} isOnline={true} onClick={() => router.push(`/profile/${u.id}`)} />)}
                </div>
              </div>
            )}

            {/* Offline section */}
            {offlineUsers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 tracking-widest uppercase mb-3 px-1">Offline — {offlineUsers.length}</p>
                <div className="space-y-2">
                  {offlineUsers.map(u => <UserCard key={u.id} u={u} isOnline={false} onClick={() => router.push(`/profile/${u.id}`)} />)}
                </div>
              </div>
            )}

            {sorted.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-600 text-sm">No users found</p>
              </div>
            )}
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
      className="p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer active:scale-98 transition-all hover:border-indigo-500/30"
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
          <span className="font-semibold text-sm text-white">@{u.username}</span>
          {u.role === 'admin' && (
            <span style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }} className="text-xs px-1.5 py-0.5 rounded-full font-medium">
              ✓ ADMIN
            </span>
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
