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
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const quickEmojis = ['🔥', '💀', 'gg', '😂', '🚀', '👀', '💯', '🎯']

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else setUserId(data.user.id)
    })
    fetchMessages()

    const channel = supabase.channel('chat-room-v2', {
      config: { presence: { key: userId } }
    })

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchMessages()
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => {
        fetchMessages()
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineCount(Object.keys(state).length)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setTypingUsers(prev => Array.from(new Set([...prev, payload.username])))
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u !== payload.username))
          }, 3000)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    localStorage.setItem('last_read_general', new Date().toISOString())

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    if (messages.length > 0) {
      localStorage.setItem('last_read_general', new Date().toISOString())
    }
  }, [messages, autoScroll])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages_with_profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(150)
    if (data) setMessages(data)
  }

  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setAutoScroll(isNearBottom)
  }

  const broadcastTyping = () => {
    const channel = supabase.channel('chat-room-v2')
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, username: userId.slice(0, 6) }
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    broadcastTyping()
  }

  const sendMessage = async () => {
    if (!content.trim()) return
    const msg = content
    setContent('')
    setShowEmojis(false)
    await supabase.from('messages').insert({
      content: msg,
      is_anonymous: isAnon,
      user_id: userId
    })
    setAutoScroll(true)
    fetchMessages()
  }

  const deleteMessage = async (msgId: string) => {
    await supabase.from('messages').delete().eq('id', msgId)
    fetchMessages()
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

  const filteredMessages = messages.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.username && m.username.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(circle at top, #111026 0%, #08080f 100%)' }}>
      
      {/* Top Header */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }} className="flex justify-between items-center px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors text-sm bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">←</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-base tracking-wide">General Chat</h1>
              <span style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }} className="text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-emerald-400 text-xs font-medium">{onlineCount} online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSearch(!showSearch)} 
            style={{ background: showSearch ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            className="p-2 rounded-xl text-gray-300 text-xs transition-all hover:bg-white/10"
            title="Search messages"
          >
            🔍
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-black/40 border-b border-white/5 flex items-center gap-2 animate-fadeIn">
          <input 
            type="text"
            placeholder="Search chat history..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            className="flex-1 text-white px-3 py-1.5 rounded-xl outline-none text-xs placeholder-gray-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-gray-400 hover:text-white px-2">Clear</button>
          )}
        </div>
      )}

      {/* Message Stream */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 relative"
      >
        {filteredMessages.map(msg => {
          const isOwn = msg.user_id === userId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-xs sm:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                
                {/* Username Header */}
                {!isOwn && (
                  <span 
                    onClick={() => !msg.is_anonymous && router.push(`/profile/${msg.user_id}`)} 
                    className={`text-xs px-1 font-medium ${msg.is_anonymous ? 'text-gray-500 italic' : 'text-indigo-400 cursor-pointer hover:underline'}`}
                  >
                    {msg.is_anonymous ? '👻 Anonymous' : `@${msg.username || msg.user_id.slice(0, 6)}`}
                  </span>
                )}

                {/* Message Bubble Container */}
                <div className="flex items-center gap-2">
                  {isOwn && (
                    <button 
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-500 hover:text-red-400 px-1"
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  )}

                  <div 
                    style={isOwn ? {
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      borderRadius: '20px 20px 4px 20px',
                      boxShadow: '0 4px 15px rgba(99,102,241,0.25)'
                    } : {
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px 20px 20px 4px',
                      backdropFilter: 'blur(10px)'
                    }} 
                    className="px-4 py-2.5"
                  >
                    <p className="text-white text-sm leading-relaxed break-words">{msg.content}</p>
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-gray-600 text-[10px] px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Floating Scroll to Bottom / New message alert */}
      {!autoScroll && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
          <button 
            onClick={() => {
              setAutoScroll(true)
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            style={{ background: 'rgba(99,102,241,0.9)', backdropFilter: 'blur(10px)' }}
            className="text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-white/20 flex items-center gap-1.5 animate-bounce"
          >
            ↓ Scroll to bottom
          </button>
        </div>
      )}

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-indigo-300 italic bg-black/20">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Emoji Quick Picker Tray */}
      {showEmojis && (
        <div className="px-4 py-2 bg-black/60 border-t border-white/5 flex gap-2 overflow-x-auto">
          {quickEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => setContent(prev => prev + emoji)}
              className="bg-white/5 hover:bg-white/15 px-3 py-1 rounded-xl text-sm transition-all border border-white/5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Console */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }} className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          
          {/* Anonymous Toggle Switch */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div 
              onClick={() => setIsAnon(!isAnon)} 
              style={{
                width: '36px',
                height: '20px',
                background: isAnon ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                position: 'relative',
                boxShadow: isAnon ? '0 0 10px rgba(99,102,241,0.5)' : 'none'
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: isAnon ? '18px' : '2px',
                transition: 'left 0.2s ease'
              }} />
            </div>
            <span className="text-gray-400 text-xs font-medium">Post Anonymously {isAnon ? '👻' : ''}</span>
          </label>

          {/* Emoji Tray Toggle Button */}
          <button 
            onClick={() => setShowEmojis(!showEmojis)}
            className="text-xs bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-gray-300 border border-white/5 transition-all"
          >
            😀 Emojis
          </button>
        </div>

        {/* Input & Send Action */}
        <div className="flex gap-2">
          <input 
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} 
            className="flex-1 text-white px-4 py-2.5 rounded-2xl outline-none text-sm placeholder-gray-500 focus:border-indigo-500/50 transition-all" 
            placeholder="Say something to the room..." 
            value={content} 
            onChange={handleInputChange} 
            onKeyDown={handleKey} 
          />
          <button 
            onClick={sendMessage} 
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }} 
            className="px-5 py-2.5 rounded-2xl text-white text-sm font-semibold hover:opacity-95 transition-all active:scale-95"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
