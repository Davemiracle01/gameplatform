'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Defining a type for our User to avoid 'any'
interface UserProfile {
  id: string
  username: string
  role: 'admin' | 'user'
  status?: string
}

export default function PeoplePage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        // We select the status here too for the UI
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('id, username, role, status')
          .order('username', { ascending: true })

        if (supabaseError) throw supabaseError
        if (data) setUsers(data as UserProfile[])
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="min-h-screen text-white p-4" style={{ background: '#0a0a0f' }}>
      {/* Header Navigation */}
      <button 
        onClick={() => router.push('/dashboard')} 
        className="text-gray-500 hover:text-white transition-colors text-sm mb-4 flex items-center gap-1"
      >
        <span>←</span> Back
      </button>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">People</h1>
        {!loading && (
          <p className="text-gray-500 text-xs mt-1">
            {users.length} {users.length === 1 ? 'member' : 'members'} found
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl w-full" />
          ))}
        </div>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {!loading && !error && users.map((user) => (
          <div
            key={user.id}
            onClick={() => router.push(`/profile/${user.id}`)}
            className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer 
                       bg-white/[0.04] border border-white/[0.07] 
                       hover:bg-white/[0.07] active:scale-[0.98] transition-all"
          >
            {/* Dynamic Avatar */}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-lg
                ${user.role === 'admin' 
                  ? 'bg-gradient-to-br from-violet-600 to-purple-500' 
                  : 'bg-gradient-to-br from-indigo-600 to-violet-700'
                }`}
            >
              {user.username?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Info Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">@{user.username}</span>
                {user.role === 'admin' && (
                  <span className="bg-violet-500/20 border border-violet-500/50 text-[#c4b5fd] text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    ADMIN
                  </span>
                )}
              </div>
              {user.status ? (
                <p className="text-gray-500 text-xs truncate mt-0.5">{user.status}</p>
              ) : (
                <p className="text-gray-600 text-[10px] italic mt-0.5">No status set</p>
              )}
            </div>

            <span className="text-gray-600 group-hover:text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
      }
                
