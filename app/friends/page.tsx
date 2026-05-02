'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PeoplePage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('profiles').select('id, username, role, status').order('username').limit(50)
      if (data) setUsers(data)
      setLoading(false)
    }
    init()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setCurrentUserId(data.session.user.id)
    })
  }, [])

  const filtered = users
    .filter(u => u.id !== currentUserId)
    .filter(u => !search.trim() || u.username.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f, #0d0d1a)', color: 'white', padding: 16 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>People</h1>
            <p style={{ color: '#6b7280', fontSize: 12 }}>{filtered.length} members</p>
          </div>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer' }}>← Back</button>
        </div>

        <input
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 16, marginBottom: 16,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box'
          }}
          placeholder="Search username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading && <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading...</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => (
            <div
              key={u.id}
              onClick={() => router.push(`/profile/${u.id}`)}
              style={{
                padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: u.role === 'admin' ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, color: 'white',
              }}>
                {u.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>@{u.username}</span>
                  {u.role === 'admin' && (
                    <span style={{
                      background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(139,92,246,0.5)',
                      color: '#c4b5fd', fontSize: 10, padding: '1px 6px', borderRadius: 999
                    }}>✓ ADMIN</span>
                  )}
                </div>
                {u.status && <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.status}</p>}
              </div>
              <span style={{ color: '#374151', fontSize: 16 }}>→</span>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>No users found</p>
          )}
        </div>
      </div>
    </div>
  )
              }
