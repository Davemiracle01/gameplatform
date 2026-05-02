'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')
  const [unreadGeneral, setUnreadGeneral] = useState(false)
  const [unreadDMs, setUnreadDMs] = useState(0)
  const [time, setTime] = useState(new Date())
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstall(true)
    })
    window.addEventListener('appinstalled', () => setShowInstall(false))

    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('username, role').eq('id', data.user.id).single()
      if (!profile?.username) { router.push('/onboarding'); return }
      setUsername(profile.username)
      setRole(profile.role || 'user')
      checkUnread(data.user.id)
    })
  }, [])

  const checkUnread = async (uid: string) => {
    const lastReadGeneral = localStorage.getItem('last_read_general')
    const { data: latestMsg } = await supabase
      .from('messages').select('created_at').order('created_at', { ascending: false }).limit(1).single()
    if (latestMsg && (!lastReadGeneral || new Date(latestMsg.created_at) > new Date(lastReadGeneral)))
      setUnreadGeneral(true)

    const { data: dms } = await supabase
      .from('direct_messages').select('sender_id, created_at')
      .eq('receiver_id', uid).order('created_at', { ascending: false })
    if (!dms) return
    const seen = new Set(); let count = 0
    for (const msg of dms) {
      if (seen.has(msg.sender_id)) continue
      seen.add(msg.sender_id)
      const lastRead = localStorage.getItem(`last_read_dm_${msg.sender_id}`)
      if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) count++
    }
    setUnreadDMs(count)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const greeting = () => {
    const h = time.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const sections = [
    {
      label: 'General Chat',
      desc: 'Everyone online',
      path: '/social',
      icon: '💬',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      glow: 'rgba(99,102,241,0.4)',
      badge: unreadGeneral ? '●' : null,
    },
    {
      label: 'Messages',
      desc: 'Your DMs',
      path: '/dm',
      icon: '✉️',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      glow: 'rgba(168,85,247,0.4)',
      badge: unreadDMs > 0 ? String(unreadDMs) : null,
    },
    {
      label: 'People',
      desc: 'Find anyone',
      path: '/friends',
      icon: '👥',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      glow: 'rgba(59,130,246,0.4)',
      badge: null,
    },
    {
      label: 'Anonymous',
      desc: '1 post / 24hrs',
      path: '/anonymous',
      icon: '👻',
      gradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
      glow: 'rgba(55,65,81,0.4)',
      badge: null,
    },
    {
      label: 'Games',
      desc: 'Play now',
      path: '/games',
      icon: '🎮',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      glow: 'rgba(5,150,105,0.4)',
      badge: null,
    },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0f0a1e 0%, #06060f 60%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      overflowX: 'hidden',
    }}>

      {/* Ambient background orbs */}
      <div style={{
        position: 'fixed', top: -100, left: -100, width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent)',
        pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{
        position: 'fixed', bottom: -100, right: -100, width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.1), transparent)',
        pointerEvents: 'none', zIndex: 0,
      }}/>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '6px 12px',
            fontSize: 12, color: '#9ca3af', letterSpacing: 1,
          }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '6px 14px', color: '#9ca3af',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>

        {/* Hero section */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>{greeting()},</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>
              @{username}
            </h1>
            {role === 'admin' && (
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                borderRadius: 8, padding: '3px 10px',
                fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'white',
                boxShadow: '0 0 12px rgba(139,92,246,0.5)',
              }}>
                ✓ ADMIN
              </div>
            )}
          </div>
          <p style={{ color: '#4b5563', fontSize: 13 }}>Welcome to GamePlatform</p>
        </div>

        {/* Quick stats bar */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 28,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '12px 16px',
        }}>
          {[
            { label: 'Chats', value: unreadGeneral ? '🔴' : '✓', color: unreadGeneral ? '#f87171' : '#6b7280' },
            { label: 'DMs', value: unreadDMs > 0 ? String(unreadDMs) : '✓', color: unreadDMs > 0 ? '#818cf8' : '#6b7280' },
            { label: 'Status', value: '🟢', color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {sections.slice(0, 4).map(s => (
            <div
              key={s.label}
              onClick={() => router.push(s.path)}
              style={{
                position: 'relative', padding: '20px 16px', borderRadius: 20,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', overflow: 'hidden',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {/* Gradient top border */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: s.gradient, borderRadius: '20px 20px 0 0',
              }}/>

              {/* Glow */}
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${s.glow}, transparent)`,
                opacity: 0.6,
              }}/>

              {/* Badge */}
              {s.badge && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  borderRadius: 999, minWidth: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: 'white', padding: '0 5px',
                  boxShadow: '0 0 10px rgba(99,102,241,0.6)',
                }}>
                  {s.badge}
                </div>
              )}

              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{s.label}</p>
              <p style={{ color: '#6b7280', fontSize: 11 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Games — full width */}
        <div
          onClick={() => router.push(sections[4].path)}
          style={{
            position: 'relative', padding: '20px 24px', borderRadius: 20,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', gap: 16,
          }}
          onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: sections[4].gradient,
          }}/>
          <div style={{
            position: 'absolute', top: -30, right: -30, width: 120, height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${sections[4].glow}, transparent)`,
            opacity: 0.5,
          }}/>
          <div style={{ fontSize: 36 }}>{sections[4].icon}</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{sections[4].label}</p>
            <p style={{ color: '#6b7280', fontSize: 12 }}>Ludo · Tic Tac Toe · More coming</p>
          </div>
          <div style={{ marginLeft: 'auto', color: '#4b5563', fontSize: 18 }}>→</div>
        </div>

        {/* Bottom brand */}
        <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
          <p style={{ color: '#1f2937', fontSize: 10, letterSpacing: 3 }}>ASTATECH · GAMEPLATFORM</p>
        </div>
      </div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  )
      }
