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
      return { ...u, username: profile?.username || 'Unknown', role: profile?.role }
    })

    setConversations(merged)
    setLoading(false)
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
            <p className="text-gray-700 text-xs mt-1">Find someone in People and start a conversation.</p>
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
              onClick={() => router.push(`/dm/${c.other_user_id}`)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all"
            >
              <div
                style={{ background: c.role === 'admin' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 relative"
              >
                {c.username[0].toUpperCase()}
                {c.role === 'admin' && (
                  <div style={{ background: '#7c3aed', border: '2px solid #0a0a0f' }} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-sm">@{c.username}</p>
                  {c.role === 'admin' && (
                    <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a855f7' }} className="text-xs px-1.5 py-0.5 rounded-full">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs truncate">{c.last_message}</p>
              </div>
              <span className="text-gray-600 text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
      }
