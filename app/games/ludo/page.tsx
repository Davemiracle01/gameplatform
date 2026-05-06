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

  async function handleCreate() {
    if (!name.trim()) return setError('Enter your name first')
    setLoading(true); setError('')
    const roomCode = generateRoomCode()
    const playerId = crypto.randomUUID()
    const player = { id: playerId, name: name.trim(), color, isHost: true }
    const { error: dbError } = await supabase.from('games').insert({
      room_code: roomCode, status: 'waiting',
      players: [player], game_state: {}, max_players: 4,
    })
    if (dbError) { setError('Failed to create room.'); setLoading(false); return }
    sessionStorage.setItem('ludo_player', JSON.stringify({ ...player, roomCode }))
    router.push(`/games/ludo/play?room=${roomCode}`)
  }

  async function handleJoin() {
    if (!name.trim()) return setError('Enter your name first')
    if (!joinCode.trim()) return setError('Enter a room code')
    setLoading(true); setError('')
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
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; }
        .lobby-wrap {
          min-height: 100vh;
          background: radial-gradient(ellipse at 50% 0%, #1a1040 0%, #080810 60%);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          font-family: 'Crimson Text', serif;
        }
        .lobby-card {
          background: linear-gradient(160deg, #12102a 0%, #0c0c1e 100%);
          border: 1px solid #2a2050;
          border-radius: 24px;
          padding: 48px 40px;
          width: 100%; max-width: 440px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .logo {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo-dice {
          font-size: 3.5rem;
          display: block;
          margin-bottom: 8px;
          filter: drop-shadow(0 0 20px rgba(245,158,11,0.6));
          animation: floatDice 3s ease-in-out infinite;
        }
        @keyframes floatDice {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        .logo h1 {
          font-family: 'Cinzel', serif;
          font-size: 3rem; font-weight: 900;
          letter-spacing: 12px;
          background: linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .logo p { color: #4a4060; font-size: 0.95rem; margin-top: 4px; letter-spacing: 2px; }
        .tabs {
          display: flex; border-bottom: 1px solid #1e1a3a;
          margin-bottom: 28px;
        }
        .tab-btn {
          flex: 1; padding: 12px; background: none; border: none;
          font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 1px;
          cursor: pointer; transition: all 0.2s;
        }
        .tab-btn.active {
          color: #f59e0b;
          border-bottom: 2px solid #f59e0b;
          margin-bottom: -1px;
        }
        .tab-btn.inactive { color: #3a3060; }
        label {
          display: block; color: #6a5f8a;
          font-size: 0.8rem; letter-spacing: 2px;
          text-transform: uppercase; margin-bottom: 8px;
        }
        .input {
          width: 100%;
          padding: 14px 16px;
          background: #0a0818;
          border: 1px solid #2a2050;
          border-radius: 10px;
          color: #e0d8f0;
          font-size: 1rem;
          font-family: 'Crimson Text', serif;
          margin-bottom: 20px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
        }
        .code-input {
          text-align: center; letter-spacing: 8px;
          font-size: 1.6rem; font-family: 'Cinzel', serif;
          text-transform: uppercase;
        }
        .color-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: 24px;
        }
        .color-btn {
          padding: 12px;
          border-radius: 10px;
          border: 2px solid transparent;
          cursor: pointer;
          font-family: 'Cinzel', serif;
          font-size: 0.75rem; font-weight: 700;
          letter-spacing: 2px;
          transition: all 0.2s;
          display: flex; align-items: center; gap: 8px;
          justify-content: center;
        }
        .color-dot { width: 12px; height: 12px; border-radius: 50%; }
        .submit-btn {
          width: 100%; padding: 16px;
          border: none; border-radius: 12px;
          font-family: 'Cinzel', serif;
          font-size: 1rem; font-weight: 700;
          letter-spacing: 2px; cursor: pointer;
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          color: #fff;
          box-shadow: 0 8px 24px rgba(245,158,11,0.3);
          transition: all 0.2s;
        }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(245,158,11,0.4); }
        .submit-btn:disabled { background: #1a1830; color: #3a3060; box-shadow: none; cursor: not-allowed; transform: none; }
        .error { color: #f43f5e; font-size: 0.85rem; margin-bottom: 12px; }
      `}</style>
      <div className="lobby-wrap">
        <div className="lobby-card">
          <div className="logo">
            <span className="logo-dice">🎲</span>
            <h1>LUDO</h1>
            <p>Play with friends online</p>
          </div>

          <div className="tabs">
            <button className={`tab-btn ${tab === 'create' ? 'active' : 'inactive'}`} onClick={() => setTab('create')}>
              CREATE ROOM
            </button>
            <button className={`tab-btn ${tab === 'join' ? 'active' : 'inactive'}`} onClick={() => setTab('join')}>
              JOIN ROOM
            </button>
          </div>

          <label>Your Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
          />

          {tab === 'create' && (
            <>
              <label>Pick Your Color</label>
              <div className="color-grid">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className="color-btn"
                    onClick={() => setColor(c)}
                    style={{
                      background: color === c ? COLOR_DARK[c] : '#0a0818',
                      borderColor: color === c ? COLOR_HEX[c] : '#2a2050',
                      color: color === c ? COLOR_HEX[c] : '#3a3060',
                      boxShadow: color === c ? `0 0 12px ${COLOR_HEX[c]}44` : 'none',
                    }}
                  >
                    <span className="color-dot" style={{ background: COLOR_HEX[c], boxShadow: `0 0 6px ${COLOR_HEX[c]}` }} />
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'join' && (
            <>
              <label>Room Code</label>
              <input
                className="input code-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
              />
            </>
          )}

          {error && <p className="error">⚠ {error}</p>}

          <button
            className="submit-btn"
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading}
          >
            {loading ? 'Loading...' : tab === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'}
          </button>
        </div>
      </div>
    </>
  )
}
