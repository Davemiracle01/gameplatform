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
      }, payload => {
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

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <div>
          <h1 className="font-bold text-lg">General Chat</h1>
          <p className="text-green-400 text-xs">{onlineCount} online</p>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-gray-400 text-sm">← Back</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.user_id === userId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.user_id === userId ? 'bg-indigo-600' : 'bg-gray-800'}`}>
              {msg.user_id !== userId && (
                <p className="text-xs text-gray-400 mb-1">
                  {msg.is_anonymous ? 'Anonymous' : `@${msg.username || msg.user_id.slice(0, 6)}`}
                </p>
              )}
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
            Send anonymously
          </label>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-xl outline-none text-sm"
            placeholder="Type a message..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
