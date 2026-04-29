'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) router.push('/login')
      else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, role')
          .eq('id', data.user.id)
          .single()
        if (!profile?.username) router.push('/onboarding')
        else {
          setUsername(profile.username)
          setRole(profile.role || 'user')
        }
      }
    })
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sections = [
    { label: 'General Chat', desc: 'Chat with everyone online', path: '/social', color: 'bg-indigo-900' },
    { label: 'Messages', desc: 'Your DM conversations', path: '/dm', color: 'bg-purple-900' },
    { label: 'People', desc: 'Find and message anyone', path: '/friends', color: 'bg-violet-900' },
    { label: 'Anonymous Board', desc: '1 post per 24hrs, fully anonymous', path: '/anonymous', color: 'bg-gray-800' },
    {{ label: 'Games', desc: 'Play Ludo and more', path: '/games', color: 'bg-gray-800' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">GamePlatform</h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">@{username}</p>
              {role === 'admin' && (
                <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid #7c3aed', color: '#a855f7' }} className="text-xs px-2 py-0.5 rounded-full">
                  ADMIN
                </span>
              )}
            </div>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-white text-sm">Logout</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {sections.map(s => (
            <div
              key={s.label}
              onClick={() => s.path && router.push(s.path)}
              className={`${s.color} p-6 rounded-2xl ${s.path ? 'cursor-pointer hover:brightness-125' : ''}`}
            >
              <h2 className="text-lg font-semibold mb-1">{s.label}</h2>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
