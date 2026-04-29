'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!username.trim()) return
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: username.trim().toLowerCase()
    })

    if (error) {
      if (error.message.includes('unique')) setError('Username already taken')
      else setError(error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Pick a username</h1>
        <p className="text-gray-400 mb-6">This is how others will find you</p>
        <input
          className="w-full bg-gray-800 text-white p-3 rounded-lg mb-4 outline-none"
          placeholder="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={save}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg font-semibold"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
