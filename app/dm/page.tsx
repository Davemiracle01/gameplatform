'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Conversation = {
  other_user_id: string
  username: string
  last_message: string
  created_at: string
  role?: string
  unread: boolean
}

export default function DMInbox() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setUserId(data.user.id)
        loadConversations(data.user.id)
      }
    })
  }, [])

  const loadConversations = async (uid: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const seen = new Set()
    const unique: any[] = []
    for (const msg of data) {
      const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
      if (!seen.has(otherId)) {
        seen.add(otherId)
        unique.push({ other_user_id: otherId, last_message: msg.content, created_at: msg.created_at })
      }
    }

    const ids = unique.map(u => u.other_user_id)
    if (ids.length === 0) { setLoading(false); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, role')
      .in('id', ids)

    const merged = unique.map(u => {
      const profile = profiles?.find(p => p.id === u.other_user_id)
      const lastReadKey = `last_read_dm_${u.other_user_id}`
      const lastRead = localStorage.getItem(lastReadKey)
      const unread = !lastRead || new Date(u.created_at) > new Date(lastRead)
      return {
        ...u,
        username: profile?.username || 'Unknown',
        role: profile?.role,
        unread
      }
    })

    setConversations(merged)
    setLoading(false)
  }

  const openDM = (otherId: string) => {
    localStorage.setItem(`last_read_dm_${otherId}`, new Date().toISOString())
    router.push(`/dm/${otherId}`)
  }

  return (
    <div className="min-h-screen text-white p-4" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)' }}>
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">Messages</h1>
            <p className="text-gray-500 text-xs">Your conversations</p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">← Back</button>
        </div>

        {loading && <p className="text-gray-500 text-sm text-center">Loading...</p>}

        {!loading && conversations.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-gray-600 text-sm">No messages yet.</p>
            <button
              onClick={() => router.push('/friends')}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              className="mt-4 px-6 py-2 rounded-2xl text-sm font-semibold"
            >
              Find People
            </button>
          </div>
        )}

        <div className="space-y-3">
          {conversations.map(c => (
            <div
              key={c.other_user_id}
              onClick={() => openDM(c.other_user_id)}
              style={{
                background: c.unread ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.04)',
                border: c.unread ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.07)'
              }}
              className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer transition-all"
            >
              <div className="relative">
                <div
                  style={{ background: c.role === 'admin' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                >
                  {c.username[0].toUpperCase()}
                </div>
                {c.unread && (
                  <div style={{ background: '#6366f1', border: '2px solid #0a0a0f' }} className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className={`font-semibold text-sm ${c.unread ? 'text-white' : 'text-gray-300'}`}>@{c.username}</p>
                  {c.role === 'admin' && (
                    <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a855f7' }} className="text-xs px-1.5 py-0.5 rounded-full">ADMIN</span>
                  )}
                </div>
                <p className={`text-xs truncate ${c.unread ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>{c.last_message}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-gray-600 text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
                {c.unread && (
                  <div style={{ background: '#6366f1' }} className="w-2 h-2 rounded-full" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
