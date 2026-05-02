'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = { id: string; sender_id: string; content: string; created_at: string }

export default function DMPage() {
  const router = useRouter()
  const { friendId } = useParams() as { friendId: string }
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [userId, setUserId] = useState('')
  const [friendName, setFriendName] = useState('')
  const [friendRole, setFriendRole] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else {
        setUserId(data.user.id)
        fetchMessages(data.user.id)
      }
    })

    supabase.from('profiles').select('username, role').eq('id', friendId).single()
      .then(({ data }) => {
        if (data) {
          setFriendName(data.username)
          setFriendRole(data.role || 'user')
        }
      })

    const channel = supabase
      .channel(`dm-${friendId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages'
      }, () => {
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) fetchMessages(data.user.id)
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [friendId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async (uid: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const sendMessage = async () => {
    if (!content.trim() || !userId) return
    const msg = content
    setContent('')
    await supabase.from('direct_messages').insert({
      sender_id: userId,
      receiver_id: friendId,
      content: msg
    })
    await fetchMessages(userId)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="flex items-center gap-3 p-4">
        <button onClick={() => router.push('/dm')} className="text-gray-500 text-sm">←</button>
        <div
          style={{ background: friendRole === 'admin' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm relative"
        >
          {friendName[0]?.toUpperCase()}
          {friendRole === 'admin' && (
            <div style={{ background: '#7c3aed', border: '2px solid #0a0a0f' }} className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs">✓</div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm cursor-pointer hover:text-indigo-400" onClick={() => router.push(`/profile/${friendId}`)}>@{friendName}</span>
            
            {friendRole === 'admin' && (
              <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a855f7' }} className="text-xs px-1.5 py-0.5 rounded-full">ADMIN</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
            <div
              style={msg.sender_id === userId ? {
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '18px 18px 4px 18px'
              } : {
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px 18px 18px 4px'
              }}
              className="max-w-xs px-4 py-2.5"
            >
              <p className="text-white text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }} className="p-4 flex gap-2">
        <input
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          className="flex-1 text-white px-4 py-2.5 rounded-2xl outline-none text-sm placeholder-gray-600"
          placeholder="Type a message..."
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          onClick={sendMessage}
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          className="px-4 py-2.5 rounded-2xl text-sm font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  )
}
