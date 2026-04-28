'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [username, setUsername] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) router.push('/login')
      else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user.id)
          .single()
        if (!profile?.username) router.push('/onboarding')
        else setUsername(profile.username)
      }
    })
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sections = [
    { label: 'General Chat', desc: 'Chat with everyone online', path: '/social', color: 'bg-indigo-900' },
    { label: 'Friends & DMs', desc: 'Find friends, send messages', path: '/friends', color: 'bg-purple-900' },
    { label: 'Anonymous Board', desc: '1 post per 24hrs, fully anonymous', path: '/anonymous', color: 'bg-gray-800' },
    { label: 'Games', desc: 'Coming soon', path: null, color: 'bg-gray-900 opacity-50' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">GamePlatform</h1>
            <p className="text-gray-400 text-sm">@{username}</p>
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
