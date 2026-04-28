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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUserId(data.user.id)
    })

    supabase.from('profiles').select('username').eq('id', friendId).single()
      .then(({ data }) => { if (data) setFriendName(data.username) })

    fetchMessages()

    const channel = supabase
      .channel(`dm-${friendId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages'
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [friendId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${supabase.auth},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${supabase.auth})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const sendMessage = async () => {
    if (!content.trim() || !userId) return
    await supabase.from('direct_messages').insert({
      sender_id: userId,
      receiver_id: friendId,
      content
    })
    setContent('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button onClick={() => router.push('/friends')} className="text-gray-400 text-sm">←</button>
        <h1 className="font-bold">@{friendName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.sender_id === userId ? 'bg-indigo-600' : 'bg-gray-800'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-xl outline-none text-sm"
          placeholder="Type a message..."
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKey}
        />
        <button onClick={sendMessage} className="bg-indigo-600 px-4 py-2 rounded-xl text-sm font-semibold">Send</button>
      </div>
    </div>
  )
}
