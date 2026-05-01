'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ── icons (inline SVG, zero deps) ──────────────────────────────────────────
const Icon = {
  Chat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  ),
  DM: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  ),
  People: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  Anon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
    </svg>
  ),
  Games: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
    </svg>
  ),
}

const sections = [
  {
    label: 'General Chat',
    desc: 'Chat with everyone online',
    path: '/social',
    icon: Icon.Chat,
    accent: '#6366f1',
    glow: 'rgba(99,102,241,0.15)',
    border: 'rgba(99,102,241,0.3)',
    tag: 'LIVE',
  },
  {
    label: 'Messages',
    desc: 'Your DM conversations',
    path: '/dm',
    icon: Icon.DM,
    accent: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
    border: 'rgba(168,85,247,0.3)',
    tag: null,
  },
  {
    label: 'People',
    desc: 'Find and message anyone',
    path: '/friends',
    icon: Icon.People,
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,0.12)',
    border: 'rgba(34,211,238,0.25)',
    tag: null,
  },
  {
    label: 'Anonymous Board',
    desc: '1 post per 24hrs, fully anonymous',
    path: '/anonymous',
    icon: Icon.Anon,
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    tag: 'ANON',
  },
  {
    label: 'Games',
    desc: 'Play Ludo and more',
    path: '/games',
    icon: Icon.Games,
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    tag: 'NEW',
  },
]

// CSS injected once
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  .gp-root {
    min-height: 100vh;
    background: #07080d;
    color: #e2e8f0;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow-x: hidden;
  }

  /* Noise overlay */
  .gp-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 0;
  }

  /* Grid lines */
  .gp-root::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: 
      linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  .gp-content { position: relative; z-index: 1; }

  /* Header */
  .gp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem 1.5rem 0;
    max-width: 56rem;
    margin: 0 auto;
  }

  .gp-logo {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .gp-logo span {
    background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .gp-user-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .gp-avatar {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 0.05em;
  }

  .gp-username {
    font-size: 0.8rem;
    color: #94a3b8;
    font-weight: 400;
  }

  .gp-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.1rem 0.5rem;
    border-radius: 99px;
    background: rgba(124,58,237,0.15);
    border: 1px solid rgba(124,58,237,0.5);
    color: #c084fc;
  }

  .gp-logout {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: #475569;
    background: none;
    border: 1px solid rgba(255,255,255,0.06);
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .gp-logout:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }

  /* Section label */
  .gp-section-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    color: #475569;
    text-transform: uppercase;
    padding: 2rem 1.5rem 1rem;
    max-width: 56rem;
    margin: 0 auto;
  }

  /* Grid */
  .gp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.875rem;
    padding: 0 1.5rem 2rem;
    max-width: 56rem;
    margin: 0 auto;
  }

  /* Card */
  .gp-card {
    position: relative;
    border-radius: 16px;
    padding: 1.25rem;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
    border: 1px solid transparent;
    overflow: hidden;
    animation: gp-fade-up 0.4s both;
  }
  .gp-card:hover { transform: translateY(-3px) scale(1.01); }
  .gp-card:active { transform: scale(0.98); }

  /* Card shimmer on hover */
  .gp-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    border-radius: inherit;
  }
  .gp-card:hover::before { opacity: 1; }

  .gp-card-bg {
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  .gp-card-inner { position: relative; z-index: 1; }

  .gp-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .gp-icon-wrap {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
  }
  .gp-card:hover .gp-icon-wrap { transform: scale(1.1); }

  .gp-tag {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
  }

  .gp-card-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    margin: 0 0 0.2rem;
    color: #f1f5f9;
  }

  .gp-card-desc {
    font-size: 0.72rem;
    color: #64748b;
    line-height: 1.4;
    font-weight: 300;
  }

  /* Bottom glow */
  .gp-card-glow {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 40px;
    border-radius: 50%;
    filter: blur(20px);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .gp-card:hover .gp-card-glow { opacity: 1; }

  /* Divider */
  .gp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent);
    margin: 0 1.5rem 1.5rem;
    max-width: 53rem;
    margin-left: auto;
    margin-right: auto;
  }

  /* Status bar */
  .gp-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    color: #334155;
    padding: 0 1.5rem 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }
  .gp-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #22d3ee;
    box-shadow: 0 0 6px #22d3ee;
    animation: gp-pulse 2s infinite;
  }

  @keyframes gp-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes gp-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
`

export default function Dashboard() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    // Inject styles
    if (!document.getElementById('gp-styles')) {
      const el = document.createElement('style')
      el.id = 'gp-styles'
      el.textContent = css
      document.head.appendChild(el)
    }

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

  const initials = username.slice(0, 2).toUpperCase() || 'GP'

  return (
    <div className="gp-root">
      <div className="gp-content">
        {/* Header */}
        <div className="gp-header">
          <div>
            <div className="gp-logo">Game<span>Platform</span></div>
            <div className="gp-user-row">
              <div className="gp-avatar">{initials}</div>
              <span className="gp-username">@{username}</span>
              {role === 'admin' && <span className="gp-badge">ADMIN</span>}
            </div>
          </div>
          <button onClick={logout} className="gp-logout">
            <Icon.Logout />
            Logout
          </button>
        </div>

        {/* Section label */}
        <div className="gp-section-label">— Sections</div>

        {/* Cards */}
        <div className="gp-grid">
          {sections.map((s, i) => {
            const IconComp = s.icon
            return (
              <div
                key={s.label}
                className="gp-card"
                style={{
                  background: `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)`,
                  borderColor: s.border,
                  boxShadow: `0 0 0 0 ${s.glow}`,
                  animationDelay: `${i * 0.07}s`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 8px 32px ${s.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
                  e.currentTarget.style.borderColor = s.accent + '55'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = `0 0 0 0 ${s.glow}`
                  e.currentTarget.style.borderColor = s.border
                }}
                onClick={() => s.path && router.push(s.path)}
              >
                {/* Subtle radial bg */}
                <div
                  className="gp-card-bg"
                  style={{ background: `radial-gradient(ellipse at top left, ${s.glow} 0%, transparent 70%)` }}
                />

                <div className="gp-card-inner">
                  <div className="gp-card-head">
                    <div
                      className="gp-icon-wrap"
                      style={{
                        background: `${s.accent}18`,
                        border: `1px solid ${s.accent}30`,
                        color: s.accent,
                      }}
                    >
                      <IconComp />
                    </div>
                    {s.tag && (
                      <span
                        className="gp-tag"
                        style={{
                          background: `${s.accent}15`,
                          border: `1px solid ${s.accent}30`,
                          color: s.accent,
                        }}
                      >
                        {s.tag}
                      </span>
                    )}
                  </div>
                  <p className="gp-card-title">{s.label}</p>
                  <p className="gp-card-desc">{s.desc}</p>
                </div>

                {/* Hover glow */}
                <div className="gp-card-glow" style={{ background: s.accent }} />
              </div>
            )
          })}
        </div>

        <div className="gp-divider" />

        <div className="gp-status">
          <div className="gp-dot" />
          Platform online · All systems operational
        </div>
      </div>
    </div>
  )
}
