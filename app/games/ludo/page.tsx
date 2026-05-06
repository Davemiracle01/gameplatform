'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateRoomCode, COLORS, COLOR_LABELS } from '@/lib/ludo-engine'
import type { PieceColor } from '@/lib/ludo-engine'

export default function LudoLobby() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [color, setColor] = useState<PieceColor>('red')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'create' | 'join'>('create')

  async function handleCreate() {
    if (!name.trim()) return setError('Enter your name first')
    setLoading(true)
    setError('')

    const roomCode = generateRoomCode()
    const playerId = crypto.randomUUID()

    const player = {
      id: playerId,
      name: name.trim(),
      color,
      isHost: true,
    }

    const { error: dbError } = await supabase.from('games').insert({
      room_code: roomCode,
      status: 'waiting',
      players: [player],
      game_state: {},
      max_players: 4,
    })

    if (dbError) {
      setError('Failed to create room. Try again.')
      setLoading(false)
      return
    }

    // Save my identity in sessionStorage so the game page knows who I am
    sessionStorage.setItem('ludo_player', JSON.stringify({ ...player, roomCode }))
    router.push(`/games/ludo/play?room=${roomCode}`)
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name first')
    if (!joinCode.trim()) return setError('Enter a room code')
    setLoading(true)
    setError('')

    const code = joinCode.trim().toUpperCase()

    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', code)
      .single()

    if (fetchError || !game) {
      setError('Room not found. Check the code.')
      setLoading(false)
      return
    }

    if (game.status !== 'waiting') {
      setError('This game already started.')
      setLoading(false)
      return
    }

    const players = game.players as any[]

    if (players.length >= game.max_players) {
      setError('Room is full.')
      setLoading(false)
      return
    }

    // Pick a color not already taken
    const takenColors = players.map((p: any) => p.color)
    const availableColor = COLORS.find((c) => !takenColors.includes(c)) || color

    const playerId = crypto.randomUUID()
    const player = {
      id: playerId,
      name: name.trim(),
      color: availableColor,
      isHost: false,
    }

    const updatedPlayers = [...players, player]

    const { error: updateError } = await supabase
      .from('games')
      .update({ players: updatedPlayers })
      .eq('room_code', code)

    if (updateError) {
      setError('Failed to join. Try again.')
      setLoading(false)
      return
    }

    sessionStorage.setItem('ludo_player', JSON.stringify({ ...player, roomCode: code }))
    router.push(`/games/ludo/play?room=${code}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      padding: '20px',
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
      }}>
        <h1 style={{
          color: '#fff',
          fontSize: '2rem',
          textAlign: 'center',
          marginBottom: '8px',
          letterSpacing: '2px',
        }}>🎲 LUDO</h1>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '32px' }}>
          Play with friends online
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid #333' }}>
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '10px',
                background: 'none',
                border: 'none',
                color: tab === t ? '#fff' : '#555',
                borderBottom: tab === t ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.95rem',
                textTransform: 'capitalize',
                fontFamily: 'Georgia, serif',
              }}
            >
              {t === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          ))}
        </div>

        {/* Name input */}
        <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Your Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '6px',
            marginBottom: '16px',
            background: '#111',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            boxSizing: 'border-box',
          }}
        />

        {/* Color picker — only for create */}
        {tab === 'create' && (
          <>
            <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Pick Your Color</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '20px' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: '8px',
                    border: color === c ? '2px solid #fff' : '2px solid transparent',
                    background: c,
                    color: c === 'yellow' ? '#000' : '#fff',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                  }}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Join code input */}
        {tab === 'join' && (
          <>
            <label style={{ color: '#aaa', fontSize: '0.85rem' }}>Room Code</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB12CD"
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '6px',
                marginBottom: '16px',
                background: '#111',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1.2rem',
                letterSpacing: '4px',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            />
          </>
        )}

        {error && (
          <p style={{ color: '#ff4444', fontSize: '0.85rem', marginBottom: '12px' }}>
            {error}
          </p>
        )}

        <button
          onClick={tab === 'create' ? handleCreate : handleJoin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#333' : '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Georgia, serif',
            letterSpacing: '1px',
          }}
        >
          {loading ? 'Loading...' : tab === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </div>
    </div>
  )
        }
