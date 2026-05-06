'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateRoomCode, COLORS, COLOR_HEX, COLOR_DARK } from '@/lib/ludo-engine'
import type { PieceColor } from '@/lib/ludo-engine'

export default function LudoLobby() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [color, setColor] = useState<PieceColor>('red')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return setError('Enter your name first')
    setLoading(true)
    setError('')
    const roomCode = generateRoomCode()
    const playerId = crypto.randomUUID()
    const player = { id: playerId, name: name.trim(), color, isHost: true }
    const { error: dbError } = await supabase.from('games').insert({
      room_code: roomCode, status: 'waiting',
      players: [player], game_state: {}, max_players: 4,
    })
    if (dbError) { setError('Failed to create room.'); setLoading(false); return }
    sessionStorage.setItem('ludo_player', JSON.stringify({ ...player, roomCode }))
    setCreatedCode(roomCode)
    setLoading(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(createdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function enterRoom() {
    router.push(`/games/ludo/play?room=${createdCode}`)
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name first')
    if (!joinCode.trim()) return setError('Enter a room code')
    setLoading(true)
    setError('')
    const code = joinCode.trim().toUpperCase()
    const { data: game, error: fetchError } = await supabase
      .from('games').select('*').eq('room_code', code).single()
    if (fetchError || !game) { setError('Room not found. Check the code.'); setLoading(false); return }
    if (game.status !== 'waiting') { setError('This game already started.'); setLoading(false); return }
    const players = game.players as any[]
    if (players.length >= game.max_players) { setError('Room is full.'); setLoading(false); return }
    const takenColors = players.map((p: any) => p.color)
    const availableColor = COLORS.find((c) => !takenColors.includes(c)) || 'blue'
    const playerId = crypto.randomUUID()
    const player = { id: playerId, name: name.trim(), color: availableColor as PieceColor, isHost: false }
    const { error: updateError } = await supabase
      .from('games').update({ players: [...players, player] }).eq('room_code', code)
    if (updateError) { setError('Failed to join.'); setLoading(false); return }
    sessionStorage.setItem('ludo_player', JSON.stringify({ ...player, roomCode: code }))
    router.push(`/games/ludo/play?room=${code}`)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:wght@400;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; }
        input { font-family: inherit; }
        @keyframes float {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, #1a1040 0%, #080810 65%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Crimson Text', serif",
        padding: 20,
      }}>
        <div style={{
          background: 'linear-gradient(160deg, #12102a 0%, #0c0c1e 100%)',
          border: '1px solid #2a2050',
          borderRadius: 24,
          padding: '44px 36px',
          width: '100%', maxWidth: 440,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: '3.5rem', animation: 'float 3s ease-in-out infinite', display: 'inline-block' }}>
              🎲
            </div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '2.8rem', fontWeight: 900,
              letterSpacing: 12,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginTop: 4,
            }}>LUDO</div>
            <div style={{ color: '#3a3060', fontSize: '0.85rem', letterSpacing: 3, marginTop: 4 }}>
              PLAY WITH FRIENDS
            </div>
          </div>

          {/* If room was just created — show share screen */}
          {createdCode ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#6a5f8a', fontSize: '0.8rem', letterSpacing: 2, marginBottom: 12 }}>
                YOUR ROOM CODE
              </p>
              <div
                onClick={copyCode}
                style={{
                  background: '#0a0818',
                  border: '2px solid #2a2050',
                  borderRadius: 14,
                  padding: '20px 24px',
                  fontSize: '2.4rem',
                  letterSpacing: 12,
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 10,
                  color: '#fff',
                  userSelect: 'none',
                }}
              >
                {createdCode}
              </div>
              <p style={{ color: '#333', fontSize: '0.8rem', marginBottom: 28 }}>
                {copied ? '✅ Copied!' : '👆 Tap to copy and share with friends'}
              </p>
              <p style={{ color: '#4a4060', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.6 }}>
                Share the code, wait for friends to join, then tap below to enter your room.
              </p>
              <button
                onClick={enterRoom}
                style={{
                  width: '100%', padding: 16,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontFamily: "'Cinzel', serif",
                  fontSize: '1rem', fontWeight: 700, letterSpacing: 2,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(245,158,11,0.3)',
                }}
              >
                ENTER ROOM →
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #1e1a3a',
                marginBottom: 28,
              }}>
                {(['create', 'join'] as const).map((t) => (
                  <button key={t} onClick={() => { setTab(t); setError('') }} style={{
                    flex: 1, padding: '12px 0',
                    background: 'none', border: 'none',
                    borderBottom: tab === t ? '2px solid #f59e0b' : '2px solid transparent',
                    marginBottom: -1,
                    color: tab === t ? '#f59e0b' : '#2a2050',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.8rem', letterSpacing: 2,
                    cursor: 'pointer',
                  }}>
                    {t === 'create' ? 'CREATE' : 'JOIN'}
                  </button>
                ))}
              </div>

              {/* Name */}
              <label style={{ display: 'block', color: '#4a4060', fontSize: '0.75rem', letterSpacing: 2, marginBottom: 8 }}>
                YOUR NAME
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                style={{
                  width: '100%', padding: '13px 16px',
                  background: '#0a0818',
                  border: '1px solid #2a2050',
                  borderRadius: 10,
                  color: '#e0d8f0', fontSize: '1rem',
                  fontFamily: "'Crimson Text', serif",
                  marginBottom: 20, outline: 'none',
                }}
              />

              {/* Color picker — create only */}
              {tab === 'create' && (
                <>
                  <label style={{ display: 'block', color: '#4a4060', fontSize: '0.75rem', letterSpacing: 2, marginBottom: 10 }}>
                    YOUR COLOR
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => setColor(c)} style={{
                        padding: '12px 8px',
                        background: color === c ? COLOR_DARK[c] : '#0a0818',
                        border: `2px solid ${color === c ? COLOR_HEX[c] : '#2a2050'}`,
                        borderRadius: 10,
                        color: color === c ? COLOR_HEX[c] : '#2a2050',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '0.75rem', letterSpacing: 2,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: color === c ? `0 0 16px ${COLOR_HEX[c]}33` : 'none',
                      }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: COLOR_HEX[c],
                          boxShadow: `0 0 6px ${COLOR_HEX[c]}`,
                          flexShrink: 0,
                        }} />
                        {c.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Room code — join only */}
              {tab === 'join' && (
                <>
                  <label style={{ display: 'block', color: '#4a4060', fontSize: '0.75rem', letterSpacing: 2, marginBottom: 8 }}>
                    ROOM CODE
                  </label>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    style={{
                      width: '100%', padding: '13px 16px',
                      background: '#0a0818',
                      border: '1px solid #2a2050',
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: '1.6rem',
                      fontFamily: "'Cinzel', serif",
                      letterSpacing: 8,
                      textAlign: 'center',
                      marginBottom: 20,
                      outline: 'none',
                    }}
                  />
                </>
              )}

              {error && (
                <p style={{ color: '#f43f5e', fontSize: '0.85rem', marginBottom: 14 }}>⚠ {error}</p>
              )}

              <button
                onClick={tab === 'create' ? handleCreate : handleJoin}
                disabled={loading}
                style={{
                  width: '100%', padding: 16,
                  background: loading ? '#111' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  color: loading ? '#333' : '#fff',
                  border: 'none', borderRadius: 12,
                  fontFamily: "'Cinzel', serif",
                  fontSize: '1rem', fontWeight: 700, letterSpacing: 2,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(245,158,11,0.25)',
                }}
              >
                {loading ? 'LOADING...' : tab === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
                  }
