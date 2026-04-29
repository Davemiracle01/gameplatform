'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) router.push('/onboarding')
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .single()

      if (!profile?.username) router.push('/onboarding')
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">ASTATECH</h1>
          <p className="text-indigo-400 text-sm mt-1 tracking-widest">GAMEPLATFORM</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} className="p-8 rounded-3xl">
          <h2 className="text-white text-xl font-bold mb-1">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
          <p className="text-gray-500 text-sm mb-6">{isSignUp ? 'Join the platform' : 'Sign in to continue'}</p>

          <div className="space-y-3 mb-4">
            <input
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              className="w-full text-white px-4 py-3 rounded-2xl outline-none text-sm placeholder-gray-600 focus:border-indigo-500 transition-colors"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
            />
            <input
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              className="w-full text-white px-4 py-3 rounded-2xl outline-none text-sm placeholder-gray-600 focus:border-indigo-500 transition-colors"
              placeholder="Password (min 6 characters)"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }} className="px-4 py-2 rounded-xl mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            className="w-full text-white py-3 rounded-2xl font-semibold text-sm transition-opacity"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <p className="text-gray-600 text-sm mt-4 text-center">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => { setIsSignUp(!isSignUp); setError('') }} className="text-indigo-400 ml-1 hover:text-indigo-300">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
