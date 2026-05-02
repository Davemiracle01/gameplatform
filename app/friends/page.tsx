'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PeoplePage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch users with error handling
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, username, role, status')
        .order('username')
        .limit(50)

      if (userError) throw userError
      if (userData) setUsers(userData)

      // Fetch current user
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUserId(session?.user?.id || null)
    } catch (err: any) {
      setError(err.message || 'Failed to load users')
      console.error('PeoplePage error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filtered = users
    .filter(u => u.id !== currentUserId)
    .filter(u => !search.trim() || u.username?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0f, #0d0d1a)', 
      color: 'white', 
      padding: 16,
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 20 
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>People</h1>
            <p style={{ color: '#6b7280', fontSize: 12, margin: 4 }}>
              {loading ? 'Loading...' : `${filtered.length} members`}
            </p>
          </div>
          <button 
            onClick={() => router.push('/dashboard')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#6b7280', 
              fontSize: 14, 
              cursor: 'pointer',
              padding: 8
            }}
          >
            ← Back
          </button>
        </div>

        <input
          style={{
            width: '100%', 
            padding: '12px 16px', 
            borderRadius: 16, 
            marginBottom: 16,
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'white', 
            fontSize: 14, 
            outline: 'none', 
            boxSizing: 'border-box'
          }}
          placeholder="Search username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {error && (
          <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: 16 }}>
            Error: {error}. Check RLS policies?
          </p>
        )}

        {loading && (
          <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading users...</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => (
            <div
              key={u.id}
              onClick={() => router.push(`/profile/${u.id}`)}
              style={{
                padding: '14px 16px', 
                borderRadius: 16, 
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', 
                border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                transition: 'all 0.2s ease',
                ':hover': {
                  background: 'rgba(255,255,255,0.08)',
                  transform: 'translateX(4px)'
                }
              }}
              title={u.status || 'No status'}
            >
              <div style={{
                width: 42, 
                height: 42, 
                borderRadius: '50%', 
                flexShrink: 0,
                background: u.role === 'admin' 
                  ? 'linear-gradient(135deg, #7c3aed, #a855f7)' 
                  : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 700, 
                fontSize: 16, 
                color: 'white',
              }}>
                {u.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>@{u.username || 'Unknown'}</span>
                  {u.role === 'admin' && (
                    <span style={{
                      background: 'rgba(124,58,237,0.25)', 
                      border: '1px solid rgba(139,92,246,0.5)',
                      color: '#c4b5fd', 
                      fontSize: 10, 
                      padding: '1px 6px', 
                      borderRadius: 999
                    }}>
                      ✓ ADMIN
                    </span>
                  )}
                </div>
                {u.status && (
                  <p style={{ 
                    color: u.status.includes('online') ? '#10b981' : '#6b7280', 
                    fontSize: 12, 
                    marginTop: 2, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {u.status}
                  </p>
                )}
              </div>
              <span style={{ color: '#6b7280', fontSize: 16 }}>→</span>
            </div>
          ))}
          {!loading && filtered.length === 0 && !error && (
            <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>
              {search ? 'No matching users' : 'No users found. Add some profiles!'}
            </p>
          )}
          {users.length === 50 && (
            <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 12 }}>
              Showing first 50. Add pagination for more.
            </p>
          )}
        </div>
      </div>
    </div>
  )
        }
