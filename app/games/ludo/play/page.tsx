'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  createInitialState,
  getCurrentPlayer,
  getMovablePieces,
  applyMove,
  skipTurn,
  resetDiceState,
  absoluteSquare,
  SAFE_SQUARES,
} from '@/lib/ludo-engine'
import type { GameState, Player, Piece, PieceColor } from '@/lib/ludo-engine'

// ── Colors ──────────────────────────────────────────────────────────────────
const COLOR_HEX: Record<PieceColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
}

// ── Board layout ─────────────────────────────────────────────────────────────
// 52 squares on the outer ring, mapped to grid positions (col, row) on a 15x15 grid
const RING: [number, number][] = [
  // Bottom of left column going up (red start=0)
  [6,14],[6,13],[6,12],[6,11],[6,10],[6,9],
  // Top-left area
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  // Top row going right (blue start=13)
  [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],
  // Right of top going down
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  // Top-right area (green start=26)
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  // Right column going down
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  // Bottom row going left (yellow start=39)
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],
  // Left of bottom going up
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
]

// Home stretch columns (the 5 squares leading to center)
const HOME_STRETCH: Record<PieceColor, [number, number][]> = {
  red:    [[7,13],[7,12],[7,11],[7,10],[7,9]],
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
}

// Home base corners (the 6x6 colored squares)
const HOME_BASES: Record<PieceColor, { col: number; row: number }> = {
  red:    { col: 0, row: 9 },
  blue:   { col: 0, row: 0 },
  green:  { col: 9, row: 0 },
  yellow: { col: 9, row: 9 },
}

// Piece start positions inside home base
const HOME_PIECE_OFFSETS = [
  [1, 1], [3, 1], [1, 3], [3, 3],
]

function getPieceGridPos(piece: Piece): [number, number] | null {
  if (piece.status === 'home') {
    const base = HOME_BASES[piece.color]
    const off = HOME_PIECE_OFFSETS[piece.index]
    return [base.col + off[0], base.row + off[1]]
  }
  if (piece.status === 'finished') return null
  // Home stretch: positions 52-55
  if (piece.position >= 52) {
    const stretch = HOME_STRETCH[piece.color]
    return stretch[piece.position - 52] ?? null
  }
  // Shared ring
  const abs = absoluteSquare(piece)
  return RING[abs] ?? null
}

// ── Component ────────────────────────────────────────────────────────────────
export default function LudoPlay() {
  const router = useRouter()
  const params = useSearchParams()
  const roomCode = params.get('room') ?? ''

  const [me, setMe] = useState<Player | null>(null)
  const [gameRow, setGameRow] = useState<any>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [movable, setMovable] = useState<string[]>([])
  const [rolling, setRolling] = useState(false)
  const [diceDisplay, setDiceDisplay] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  // Load my identity
  useEffect(() => {
    const raw = sessionStorage.getItem('ludo_player')
    if (!raw) { router.push('/games/ludo'); return }
    setMe(JSON.parse(raw))
  }, [])

  // Fetch game + subscribe to realtime
  useEffect(() => {
    if (!roomCode) return

    async function fetchGame() {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode)
        .single()
      if (data) {
        setGameRow(data)
        if (data.game_state && data.game_state.phase) {
          setGameState(data.game_state as GameState)
        }
      }
    }

    fetchGame()

    const channel = supabase
      .channel(`game:${roomCode}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `room_code=eq.${roomCode}`,
      }, (payload) => {
        const updated = payload.new as any
        setGameRow(updated)
        if (updated.game_state?.phase) {
          setGameState(updated.game_state as GameState)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomCode])

  // Update movable pieces when state changes
  useEffect(() => {
    if (!gameState || !me) return
    if (gameState.phase !== 'playing') return
    const current = getCurrentPlayer(gameState)
    if (current.id !== me.id) return
    if (gameState.diceRolled && gameState.diceValue) {
      setMovable(getMovablePieces(gameState, gameState.diceValue))
    } else {
      setMovable([])
    }
  }, [gameState, me])

  const isMyTurn = gameState && me
    ? getCurrentPlayer(gameState).id === me.id
    : false

  async function saveState(newState: GameState) {
    await supabase
      .from('games')
      .update({ game_state: newState, updated_at: new Date().toISOString() })
      .eq('room_code', roomCode)
  }

  async function handleStartGame() {
    if (!gameRow) return
    const players = gameRow.players as Player[]
    if (players.length < 2) return alert('Need at least 2 players to start')
    const state = createInitialState(players)
    await supabase
      .from('games')
      .update({ status: 'playing', game_state: state })
      .eq('room_code', roomCode)
  }

  async function handleRollDice() {
    if (!gameState || !isMyTurn || gameState.diceRolled || rolling) return
    setRolling(true)

    // Animate dice
    let count = 0
    const interval = setInterval(() => {
      setDiceDisplay(Math.ceil(Math.random() * 6))
      count++
      if (count > 8) clearInterval(interval)
    }, 80)

    setTimeout(async () => {
      const dice = Math.ceil(Math.random() * 6)
      setDiceDisplay(dice)
      setRolling(false)

      const movablePieces = getMovablePieces(gameState, dice)
      let newState = { ...gameState, diceValue: dice, diceRolled: true }

      if (movablePieces.length === 0) {
        // No moves — auto skip after short delay
        setTimeout(async () => {
          const skipped = skipTurn({ ...newState })
          setDiceDisplay(null)
          await saveState(skipped)
        }, 1500)
      }

      await saveState(newState)
    }, 800)
  }

  async function handleMovePiece(pieceId: string) {
    if (!gameState || !gameState.diceValue) return
    if (!movable.includes(pieceId)) return
    const newState = applyMove(gameState, pieceId, gameState.diceValue)
    const finalState = resetDiceState(newState)
    setMovable([])
    setDiceDisplay(null)
    await saveState(finalState)
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const CELL = 40 // px per grid cell
  const GRID = 15

  function renderBoard() {
    if (!gameState) return null
    const cells: React.ReactNode[] = []

    // Background grid
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        let bg = '#1a1a1a'

        // Home base zones
        if (r >= 9 && c < 6)  bg = '#3f1010' // red
        if (r < 6  && c < 6)  bg = '#101040' // blue
        if (r < 6  && c >= 9) bg = '#103010' // green
        if (r >= 9 && c >= 9) bg = '#3f3f00' // yellow

        // Center winning zone
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) bg = '#2a2a2a'

        // Safe squares
        const ringIdx = RING.findIndex(([rc, rr]) => rc === c && rr === r)
        if (ringIdx !== -1 && SAFE_SQUARES.has(ringIdx)) bg = '#2d2d1a'

        // Home stretch coloring
        for (const [color, squares] of Object.entries(HOME_STRETCH)) {
          if (squares.some(([sc, sr]) => sc === c && sr === r)) {
            bg = color === 'red' ? '#3f1010'
               : color === 'blue' ? '#101040'
               : color === 'green' ? '#103010'
               : '#3f3f00'
          }
        }

        cells.push(
          <div key={`${c}-${r}`} style={{
            position: 'absolute',
            left: c * CELL,
            top: r * CELL,
            width: CELL,
            height: CELL,
            background: bg,
            border: '1px solid #2a2a2a',
            boxSizing: 'border-box',
          }} />
        )
      }
    }

    // Pieces
    gameState.pieces.forEach((piece) => {
      const pos = getPieceGridPos(piece)
      if (!pos) return
      const [col, row] = pos
      const isMovable = movable.includes(piece.id)

      cells.push(
        <div
          key={piece.id}
          onClick={() => handleMovePiece(piece.id)}
          style={{
            position: 'absolute',
            left: col * CELL + CELL / 2,
            top: row * CELL + CELL / 2,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: COLOR_HEX[piece.color],
            border: isMovable ? '3px solid #fff' : '2px solid rgba(0,0,0,0.4)',
            transform: 'translate(-50%, -50%)',
            cursor: isMovable ? 'pointer' : 'default',
            zIndex: 10,
            boxShadow: isMovable ? '0 0 12px #fff' : '0 2px 4px rgba(0,0,0,0.5)',
            transition: 'box-shadow 0.2s',
          }}
        />
      )
    })

    return cells
  }

  // ── Waiting lobby ──────────────────────────────────────────────────────────
  if (!gameState || gameState.phase === 'waiting' || !gameRow?.game_state?.phase) {
    const players: Player[] = gameRow?.players ?? []
    const amHost = me && players.find(p => p.id === me.id)?.isHost

    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        color: '#fff',
        padding: 20,
      }}>
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 16,
          padding: 40,
          width: '100%',
          maxWidth: 400,
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Waiting for players</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>Share this code with friends</p>

          <div
            onClick={copyCode}
            style={{
              background: '#111',
              border: '1px solid #444',
              borderRadius: 12,
              padding: '16px 24px',
              fontSize: '2rem',
              letterSpacing: 8,
              cursor: 'pointer',
              marginBottom: 8,
              userSelect: 'none',
            }}
          >
            {roomCode}
          </div>
          <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: 32 }}>
            {copied ? '✅ Copied!' : 'Tap to copy'}
          </p>

          <div style={{ marginBottom: 32 }}>
            {players.map((p) => (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                background: '#111',
                borderRadius: 8,
                marginBottom: 8,
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: COLOR_HEX[p.color],
                }} />
                <span>{p.name}</span>
                {p.isHost && <span style={{ color: '#666', fontSize: '0.75rem' }}>HOST</span>}
                {p.id === me?.id && <span style={{ color: '#888', fontSize: '0.75rem' }}>YOU</span>}
              </div>
            ))}
          </div>

          {amHost ? (
            <button
              onClick={handleStartGame}
              disabled={players.length < 2}
              style={{
                width: '100%',
                padding: 14,
                background: players.length >= 2 ? '#fff' : '#333',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: players.length >= 2 ? 'pointer' : 'not-allowed',
                fontFamily: 'Georgia, serif',
              }}
            >
              {players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
            </button>
          ) : (
            <p style={{ color: '#555' }}>Waiting for host to start...</p>
          )}
        </div>
      </div>
    )
  }

  // ── Game over ──────────────────────────────────────────────────────────────
  if (gameState.phase === 'finished') {
    const winner = gameState.players.find(p => p.id === gameState.winner)
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '5rem', marginBottom: 16 }}>🏆</div>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>
            {winner?.name ?? 'Someone'} wins!
          </h1>
          <p style={{ color: '#666', marginBottom: 32 }}>Great game</p>
          <button
            onClick={() => router.push('/games/ludo')}
            style={{
              padding: '12px 32px',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    )
  }

  // ── Main game ──────────────────────────────────────────────────────────────
  const currentPlayer = getCurrentPlayer(gameState)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 12px',
      fontFamily: 'Georgia, serif',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: 640,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <span style={{ color: '#555', fontSize: '0.85rem' }}>Room: {roomCode}</span>
        <h1 style={{ fontSize: '1.2rem', letterSpacing: 2 }}>🎲 LUDO</h1>
        <span style={{ color: '#555', fontSize: '0.85rem' }}>{me?.name}</span>
      </div>

      {/* Turn indicator */}
      <div style={{
        background: '#1a1a1a',
        border: `2px solid ${COLOR_HEX[currentPlayer.color]}`,
        borderRadius: 10,
        padding: '8px 20px',
        marginBottom: 16,
        fontSize: '0.9rem',
      }}>
        {isMyTurn ? '⭐ Your turn!' : `${currentPlayer.name}'s turn`}
      </div>

      {/* Board */}
      <div style={{
        position: 'relative',
        width: GRID * CELL,
        height: GRID * CELL,
        marginBottom: 20,
        borderRadius: 8,
        overflow: 'hidden',
        border: '2px solid #333',
        flexShrink: 0,
      }}>
        {renderBoard()}
      </div>

      {/* Last action */}
      {gameState.lastAction && (
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 12 }}>
          {gameState.lastAction}
        </p>
      )}

      {/* Dice + Roll button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 60,
          height: 60,
          background: '#1a1a1a',
          border: '2px solid #333',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
        }}>
          {diceDisplay ?? (gameState.diceRolled ? gameState.diceValue : '?')}
        </div>

        {isMyTurn && !gameState.diceRolled && (
          <button
            onClick={handleRollDice}
            disabled={rolling}
            style={{
              padding: '14px 32px',
              background: rolling ? '#333' : '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: rolling ? 'not-allowed' : 'pointer',
              fontFamily: 'Georgia, serif',
            }}
          >
            {rolling ? 'Rolling...' : 'Roll Dice'}
          </button>
        )}

        {isMyTurn && gameState.diceRolled && movable.length > 0 && (
          <p style={{ color: '#aaa', fontSize: '0.85rem' }}>
            Tap a glowing piece to move
          </p>
        )}
      </div>

      {/* Players list */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginTop: 24,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {gameState.players.map((p, i) => {
          const finished = gameState.pieces.filter(
            pc => pc.color === p.color && pc.status === 'finished'
          ).length
          return (
            <div key={p.id} style={{
              background: '#1a1a1a',
              border: `1px solid ${i === gameState.currentPlayerIndex ? COLOR_HEX[p.color] : '#333'}`,
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: '0.8rem',
              textAlign: 'center',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: COLOR_HEX[p.color],
                margin: '0 auto 4px',
              }} />
              <div>{p.name}</div>
              <div style={{ color: '#555' }}>{'🏠'.repeat(finished)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
    }
