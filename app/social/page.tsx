'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  user_id: string
  content: string
  is_anonymous: boolean
  created_at: string
  username?: string
}

export default function SocialPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [content, setContent] = useState('')
  const [isAnon, setIsAnon] = useState(false)
  const [userId, setUserId] = useState('')
  const [onlineCount, setOnlineCount] = useState(1)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUserId(data.user.id)
    })

    fetchMessages()

    const channel = supabase
      .channel('chat-room')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchMessages()
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    // Mark general chat as read
    localStorage.setItem('last_read_general', new Date().toISOString())

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    // Update read time whenever messages load
    if (messages.length > 0) {
      localStorage.setItem('last_read_general', new Date().toISOString())
    }
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages_with_profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  const sendMessage = async () => {
    if (!content.trim()) return
    const msg = content
    setContent('')
    await supabase.from('messages').insert({
      content: msg,
      is_anonymous: isAnon,
      user_id: userId
    })
    await fetchMessages()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }} className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-white transition-colors text-sm">←</button>
          <div>
            <h1 className="font-semibold text-white text-sm tracking-wide">General</h1>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
              <span className="text-emerald-400 text-xs">{onlineCount} online</span>
            </div>
          </div>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }} className="px-3 py-1 rounded-full">
          <span className="text-indigo-400 text-xs font-medium">LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => {
          const isOwn = msg.user_id === userId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isOwn && (
                  <span
                    onClick={() => !msg.is_anonymous && router.push(`/profile/${msg.user_id}`)}
                    className={`text-xs px-1 ${msg.is_anonymous ? 'text-gray-600' : 'text-indigo-400 cursor-pointer hover:text-indigo-300'}`}
                  >
                    {msg.is_anonymous ? 'Anonymous' : `@${msg.username || msg.user_id.slice(0, 6)}`}
                  </span>
                )}
                <div
                  style={isOwn ? {
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    borderRadius: '18px 18px 4px 18px'
                  } : {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '18px 18px 18px 4px'
                  }}
                  className="px-4 py-2.5"
                >
                  <p className="text-white text-sm leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-gray-600 text-xs px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }} className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsAnon(!isAnon)}
              style={{
                width: '32px', height: '18px',
                background: isAnon ? '#6366f1' : 'rgba(255,255,255,0.1)',
                borderRadius: '9px', transition: 'background 0.2s', position: 'relative'
              }}
            >
              <div style={{
                width: '14px', height: '14px', background: 'white', borderRadius: '50%',
                position: 'absolute', top: '2px', left: isAnon ? '16px' : '2px', transition: 'left 0.2s'
              }} />
            </div>
            <span className="text-gray-500 text-xs">Anonymous</span>
          </label>
        </div>
        <div className="flex gap-2">
          <input
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            className="flex-1 text-white px-4 py-2.5 rounded-2xl outline-none text-sm placeholder-gray-600"
            placeholder="Say something..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={sendMessage}
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            className="px-4 py-2.5 rounded-2xl text-white text-sm font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
