'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  createInitialState, getCurrentPlayer, getMovablePieces,
  applyMove, skipTurn, resetDiceState, absoluteSquare, SAFE_SQUARES,
  COLOR_HEX, COLOR_DARK,
} from '@/lib/ludo-engine'
import type { GameState, Player, Piece, PieceColor } from '@/lib/ludo-engine'

// ─── Board layout constants ───────────────────────────────────────────────────
const CELL = 52 // px per grid cell on a 15x15 board
const GRID = 15
const BOARD_PX = CELL * GRID

// 52 squares on the outer ring mapped to [col, row] on the 15x15 grid
const RING: [number, number][] = [
  // red start going up the left column
  [6,14],[6,13],[6,12],[6,11],[6,10],[6,9],
  // across the middle-left row
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  // blue start going right across top
  [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],
  // up the right side of left block
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  // green start going right
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  // across middle-right row
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  // yellow start going left
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],
  // down the right side
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
]

const HOME_STRETCH: Record<PieceColor, [number, number][]> = {
  red:    [[7,13],[7,12],[7,11],[7,10],[7,9]],
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
}

// Top-left corner of each 6x6 home zone
const HOME_CORNER: Record<PieceColor, [number, number]> = {
  blue:   [0, 0],
  green:  [9, 0],
  red:    [0, 9],
  yellow: [9, 9],
}

// The 4 piece slots inside the home zone
const PIECE_SLOTS: [number, number][] = [
  [1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5],
]

function getPiecePos(piece: Piece): [number, number] | null {
  if (piece.status === 'home') {
    const [bx, by] = HOME_CORNER[piece.color]
    const [ox, oy] = PIECE_SLOTS[piece.index]
    return [bx + ox, by + oy]
  }
  if (piece.status === 'finished') return [7.5, 7.5]
  if (piece.position >= 52) {
    const s = HOME_STRETCH[piece.color]
    const sq = s[piece.position - 52]
    return sq ? [sq[0] + 0.5, sq[1] + 0.5] : null
  }
  const abs = absoluteSquare(piece)
  const sq = RING[abs]
  return sq ? [sq[0] + 0.5, sq[1] + 0.5] : null
}

// ─── Physics dice ─────────────────────────────────────────────────────────────
interface DicePhysics {
  x: number; y: number
  vx: number; vy: number
  rotation: number; vr: number
  face: number; rolling: boolean
}

function useDicePhysics(containerRef: React.RefObject<HTMLDivElement>) {
  const [dice, setDice] = useState<DicePhysics>({
    x: 60, y: 60, vx: 0, vy: 0,
    rotation: 0, vr: 0, face: 1, rolling: false,
  })
  const rafRef = useRef<number>()
  const diceRef = useRef(dice)
  diceRef.current = dice

  const tick = useCallback(() => {
    const d = diceRef.current
    if (!d.rolling) return
    const container = containerRef.current
    if (!container) return

    const { width, height } = container.getBoundingClientRect()
    const size = 64
    let { x, y, vx, vy, rotation, vr, face } = d

    x += vx; y += vy
    rotation += vr
    vx *= 0.97; vy *= 0.97; vr *= 0.95
    vy += 0.3 // gravity

    // Bounce off walls
    if (x < 0) { x = 0; vx = Math.abs(vx) * 0.7; vr = -vr * 0.8 }
    if (x > width - size) { x = width - size; vx = -Math.abs(vx) * 0.7; vr = -vr * 0.8 }
    if (y < 0) { y = 0; vy = Math.abs(vy) * 0.7; vr = -vr * 0.8 }
    if (y > height - size) { y = height - size; vy = -Math.abs(vy) * 0.7; vr = vr * 0.8 }

    const speed = Math.sqrt(vx * vx + vy * vy) + Math.abs(vr)
    const rolling = speed > 0.5

    // Change face while rolling
    const newFace = rolling ? Math.ceil(Math.random() * 6) : face

    setDice({ x, y, vx, vy, rotation, vr, face: newFace, rolling })
    diceRef.current = { x, y, vx, vy, rotation, vr, face: newFace, rolling }

    if (rolling) rafRef.current = requestAnimationFrame(tick)
  }, [containerRef])

  const fling = useCallback((result: number) => {
    const vx = (Math.random() - 0.5) * 24
    const vy = (Math.random() - 0.5) * 24
    const vr = (Math.random() - 0.5) * 30
    setDice(d => ({ ...d, vx, vy, vr, rolling: true }))
    diceRef.current = { ...diceRef.current, vx, vy, vr, rolling: true }

    // After physics settles, lock to result
    setTimeout(() => {
      setDice(d => ({ ...d, face: result, rolling: false, vx: 0, vy: 0, vr: 0 }))
    }, 1800)

    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return { dice, fling }
}

// ─── Dice faces using dots ────────────────────────────────────────────────────
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

function DiceFace({ face, size = 64 }: { face: number; size?: number }) {
  const dots = DOT_POSITIONS[face] || []
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="2" y="2" width="96" height="96" rx="16"
        fill="url(#diceGrad)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <defs>
        <radialGradient id="diceGrad" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#d0d0d0" />
        </radialGradient>
      </defs>
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill="#1a1040" />
      ))}
    </svg>
  )
}

// ─── Main inner component ─────────────────────────────────────────────────────
function LudoPlayInner() {
  const router = useRouter()
  const params = useSearchParams()
  const roomCode = params.get('room') ?? ''

  const [me, setMe] = useState<Player | null>(null)
  const [gameRow, setGameRow] = useState<any>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [movable, setMovable] = useState<string[]>([])
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null)

  const diceContainerRef = useRef<HTMLDivElement>(null!)
  const { dice, fling } = useDicePhysics(diceContainerRef)

  // Pinch-to-zoom refs
  const lastPinchRef = useRef<number | null>(null)
  const lastPanRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('ludo_player')
    if (!raw) { router.push('/games/ludo'); return }
    setMe(JSON.parse(raw))
  }, [])

  useEffect(() => {
    if (!roomCode) return
    async function fetch() {
      const { data } = await supabase.from('games').select('*').eq('room_code', roomCode).single()
      if (data) {
        setGameRow(data)
        if (data.game_state?.phase) setGameState(data.game_state as GameState)
      }
    }
    fetch()
    const ch = supabase.channel(`game:${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
        (payload) => {
          const u = payload.new as any
          setGameRow(u)
          if (u.game_state?.phase) setGameState(u.game_state as GameState)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [roomCode])

  useEffect(() => {
    if (!gameState || !me || gameState.phase !== 'playing') return
    const current = getCurrentPlayer(gameState)
    if (current.id !== me.id) return
    if (gameState.diceRolled && gameState.diceValue) {
      setMovable(getMovablePieces(gameState, gameState.diceValue))
    } else setMovable([])
  }, [gameState, me])

  const isMyTurn = !!(gameState && me && getCurrentPlayer(gameState).id === me.id)

  async function saveState(s: GameState) {
    await supabase.from('games')
      .update({ game_state: s, updated_at: new Date().toISOString() })
      .eq('room_code', roomCode)
  }

  async function handleStartGame() {
    if (!gameRow) return
    const players = gameRow.players as Player[]
    if (players.length < 2) return alert('Need at least 2 players')
    await supabase.from('games')
      .update({ status: 'playing', game_state: createInitialState(players) })
      .eq('room_code', roomCode)
  }

  async function handleRollDice() {
    if (!gameState || !isMyTurn || gameState.diceRolled || rolling) return
    setRolling(true)
    const result = Math.ceil(Math.random() * 6)
    fling(result)

    setTimeout(async () => {
      setRolling(false)
      const newState = { ...gameState, diceValue: result, diceRolled: true }
      const movablePieces = getMovablePieces(gameState, result)
      if (movablePieces.length === 0) {
        setTimeout(async () => {
          await saveState(skipTurn(newState))
        }, 1600)
      }
      await saveState(newState)
    }, 1900)
  }

  async function handleMovePiece(pieceId: string) {
    if (!gameState || !gameState.diceValue || !movable.includes(pieceId)) return
    const newState = resetDiceState(applyMove(gameState, pieceId, gameState.diceValue))
    setMovable([])
    await saveState(newState)
  }

  // Touch: pinch zoom + pan
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchRef.current = Math.sqrt(dx * dx + dy * dy)
    } else if (e.touches.length === 1) {
      lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastPinchRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / lastPinchRef.current
      setScale(s => Math.min(2.5, Math.max(0.5, s * ratio)))
      lastPinchRef.current = dist
    } else if (e.touches.length === 1 && lastPanRef.current) {
      const dx = e.touches[0].clientX - lastPanRef.current.x
      const dy = e.touches[0].clientY - lastPanRef.current.y
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  function onTouchEnd() {
    lastPinchRef.current = null
    lastPanRef.current = null
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render board ─────────────────────────────────────────────────────────────
  function renderBoard() {
    if (!gameState) return null
    const els: React.ReactNode[] = []

    // Grid cells
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        let bg = '#1e1c3a'
        let borderColor = '#2a2850'
        let content: React.ReactNode = null

        const inBlue   = c < 6 && r < 6
        const inGreen  = c >= 9 && r < 6
        const inRed    = c < 6 && r >= 9
        const inYellow = c >= 9 && r >= 9

        if (inBlue)   bg = '#1a3060'
        if (inGreen)  bg = '#0f4020'
        if (inRed)    bg = '#4a1020'
        if (inYellow) bg = '#3a2000'

        // Inner home circles
        const slots: Record<PieceColor, [number,number][]> = {
          blue:   [[1,1],[3,1],[1,3],[3,3]],
          green:  [[10,1],[12,1],[10,3],[12,3]],
          red:    [[1,10],[3,10],[1,12],[3,12]],
          yellow: [[10,10],[12,10],[10,12],[12,12]],
        }
        for (const [col, slotsArr] of Object.entries(slots)) {
          if (slotsArr.some(([sc,sr]) => sc===c && sr===r)) {
            bg = COLOR_DARK[col as PieceColor]
            content = (
              <div style={{
                width: CELL*0.65, height: CELL*0.65, borderRadius: '50%',
                border: `2px solid ${COLOR_HEX[col as PieceColor]}55`,
                background: `radial-gradient(circle, ${COLOR_HEX[col as PieceColor]}22, transparent)`,
              }} />
            )
          }
        }

        // Center zone
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
          bg = '#0a0818'
          borderColor = '#1a1840'
        }

        // Home stretches
        for (const [col, squares] of Object.entries(HOME_STRETCH)) {
          if (squares.some(([sc,sr]) => sc===c && sr===r)) {
            bg = COLOR_DARK[col as PieceColor]
            borderColor = `${COLOR_HEX[col as PieceColor]}44`
          }
        }

        // Safe squares (star)
        const ringIdx = RING.findIndex(([rc,rr]) => rc===c && rr===r)
        if (ringIdx !== -1 && SAFE_SQUARES.has(ringIdx)) {
          content = (
            <span style={{ fontSize: CELL * 0.4, opacity: 0.6, lineHeight: 1 }}>★</span>
          )
        }

        // Start squares
        const starts: Record<PieceColor, number> = { red: 0, blue: 13, green: 26, yellow: 39 }
        for (const [col, sq] of Object.entries(starts)) {
          if (ringIdx === sq) {
            bg = COLOR_DARK[col as PieceColor]
            borderColor = `${COLOR_HEX[col as PieceColor]}88`
          }
        }

        els.push(
          <div key={`c${c}-${r}`} style={{
            position: 'absolute',
            left: c * CELL, top: r * CELL,
            width: CELL, height: CELL,
            background: bg,
            border: `1px solid ${borderColor}`,
            boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {content}
          </div>
        )
      }
    }

    // Center triangle decorations
    const centerColors: [PieceColor, string][] = [
      ['red', 'polygon(50% 50%, 0% 100%, 100% 100%)'],
      ['blue', 'polygon(50% 50%, 0% 0%, 0% 100%)'],
      ['green', 'polygon(50% 50%, 0% 0%, 100% 0%)'],
      ['yellow', 'polygon(50% 50%, 100% 0%, 100% 100%)'],
    ]
    centerColors.forEach(([col, clip]) => {
      els.push(
        <div key={`tri-${col}`} style={{
          position: 'absolute',
          left: 6 * CELL, top: 6 * CELL,
          width: 3 * CELL, height: 3 * CELL,
          clipPath: clip,
          background: `linear-gradient(135deg, ${COLOR_HEX[col]}44, ${COLOR_HEX[col]}11)`,
          pointerEvents: 'none',
        }} />
      )
    })

    // Group pieces by position for stacking offset
    const posMap: Record<string, Piece[]> = {}
    gameState.pieces.forEach((piece) => {
      const pos = getPiecePos(piece)
      if (!pos) return
      const key = `${Math.round(pos[0]*10)}-${Math.round(pos[1]*10)}`
      if (!posMap[key]) posMap[key] = []
      posMap[key].push(piece)
    })

    // Render pieces
    Object.values(posMap).forEach((piecesAtPos) => {
      piecesAtPos.forEach((piece, si) => {
        const pos = getPiecePos(piece)
        if (!pos) return
        const [px, py] = pos
        const isMovable = movable.includes(piece.id)
        const isHovered = hoveredPiece === piece.id
        const stackOff = piecesAtPos.length > 1 ? (si - (piecesAtPos.length - 1) / 2) * 9 : 0
        const size = isMovable ? CELL * 0.7 : CELL * 0.58

        els.push(
          <div
            key={piece.id}
            onClick={() => handleMovePiece(piece.id)}
            onMouseEnter={() => setHoveredPiece(piece.id)}
            onMouseLeave={() => setHoveredPiece(null)}
            style={{
              position: 'absolute',
              left: px * CELL - size / 2 + stackOff,
              top: py * CELL - size / 2 + stackOff,
              width: size, height: size,
              borderRadius: '50%',
              background: `radial-gradient(circle at 32% 28%, ${COLOR_HEX[piece.color]}, ${COLOR_DARK[piece.color]})`,
              border: isMovable
                ? `3px solid #fff`
                : `2px solid ${COLOR_HEX[piece.color]}66`,
              cursor: isMovable ? 'pointer' : 'default',
              zIndex: isMovable ? 30 : 10,
              boxShadow: isMovable
                ? `0 0 0 4px ${COLOR_HEX[piece.color]}55, 0 0 24px ${COLOR_HEX[piece.color]}, 0 4px 8px rgba(0,0,0,0.6)`
                : `inset 0 -3px 6px rgba(0,0,0,0.4), 0 3px 8px rgba(0,0,0,0.5)`,
              transition: 'box-shadow 0.2s, transform 0.15s',
              transform: (isMovable && isHovered) ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            {/* Shine dot */}
            <div style={{
              position: 'absolute',
              width: '30%', height: '30%',
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '50%',
              top: '18%', left: '20%',
            }} />
          </div>
        )
      })
    })

    return els
  }

  // ── Waiting lobby ─────────────────────────────────────────────────────────────
  if (!gameState || !gameRow?.game_state?.phase) {
    const players: Player[] = gameRow?.players ?? []
    const amHost = me && players.find(p => p.id === me.id)?.isHost

    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:wght@400;600&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #080810; }
          @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        `}</style>
        <div style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 50% 0%, #1a1040 0%, #080810 60%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Crimson Text', serif", color: '#fff', padding: 20,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #12102a, #0c0c1e)',
            border: '1px solid #2a2050', borderRadius: 24,
            padding: '40px 32px', width: '100%', maxWidth: 420, textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎲</div>
            <h2 style={{
              fontFamily: "'Cinzel', serif", fontSize: '1.4rem',
              letterSpacing: 4, marginBottom: 6,
            }}>WAITING ROOM</h2>
            <p style={{ color: '#4a4060', marginBottom: 28, fontSize: '0.95rem' }}>
              Share your code with friends
            </p>

            <div onClick={copyCode} style={{
              background: '#0a0818', border: '2px solid #2a2050',
              borderRadius: 14, padding: '18px 24px',
              fontSize: '2rem', letterSpacing: 10,
              cursor: 'pointer', marginBottom: 8,
              fontFamily: "'Cinzel', serif", fontWeight: 700,
              userSelect: 'none',
            }}>
              {roomCode}
            </div>
            <p style={{ color: '#333', fontSize: '0.8rem', marginBottom: 32 }}>
              {copied ? '✅ Copied!' : '👆 Tap to copy'}
            </p>

            <div style={{ marginBottom: 28 }}>
              {players.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: '#0a0818',
                  border: `1px solid ${COLOR_HEX[p.color]}33`,
                  borderRadius: 10, marginBottom: 8,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${COLOR_HEX[p.color]}, ${COLOR_DARK[p.color]})`,
                    border: `2px solid ${COLOR_HEX[p.color]}`,
                    flexShrink: 0, boxShadow: `0 0 8px ${COLOR_HEX[p.color]}66`,
                  }} />
                  <span style={{ flex: 1, textAlign: 'left', fontSize: '1.1rem' }}>{p.name}</span>
                  {p.isHost && <span style={{ color: '#f59e0b', fontSize: '0.7rem', letterSpacing: 1 }}>HOST</span>}
                  {p.id === me?.id && <span style={{ color: '#444', fontSize: '0.7rem' }}>YOU</span>}
                </div>
              ))}
              {players.length === 0 && (
                <p style={{ color: '#222', animation: 'pulse 2s infinite' }}>Connecting...</p>
              )}
            </div>

            {amHost ? (
              <button onClick={handleStartGame} disabled={players.length < 2} style={{
                width: '100%', padding: 16,
                background: players.length >= 2
                  ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : '#111',
                color: players.length >= 2 ? '#fff' : '#333',
                border: 'none', borderRadius: 12,
                fontFamily: "'Cinzel', serif", fontSize: '0.95rem',
                fontWeight: 700, letterSpacing: 2,
                cursor: players.length >= 2 ? 'pointer' : 'not-allowed',
                boxShadow: players.length >= 2 ? '0 8px 24px rgba(245,158,11,0.3)' : 'none',
              }}>
                {players.length < 2 ? `WAITING (${players.length}/2)` : '🚀 START GAME'}
              </button>
            ) : (
              <p style={{ color: '#333', animation: 'pulse 2s infinite' }}>
                Waiting for host to start...
              </p>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Game over ─────────────────────────────────────────────────────────────────
  if (gameState.phase === 'finished') {
    const winner = gameState.players.find(p => p.id === gameState.winner)
    const isMe = winner?.id === me?.id
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #080810; }
          @keyframes trophy { 0%,100%{transform:scale(1) rotate(-5deg)} 50%{transform:scale(1.1) rotate(5deg)} }
        `}</style>
        <div style={{
          minHeight: '100vh',
          background: isMe
            ? 'radial-gradient(ellipse at center, #2a1800, #080810)'
            : 'radial-gradient(ellipse at center, #0a0820, #080810)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cinzel', serif", color: '#fff',
        }}>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '6rem', animation: 'trophy 2s ease-in-out infinite', marginBottom: 24 }}>
              {isMe ? '🏆' : '🎮'}
            </div>
            <h1 style={{
              fontSize: '2.5rem', fontWeight: 900, letterSpacing: 4, marginBottom: 8,
              background: isMe ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'none',
              WebkitBackgroundClip: isMe ? 'text' : 'unset',
              WebkitTextFillColor: isMe ? 'transparent' : '#fff',
            }}>
              {isMe ? 'YOU WIN!' : `${winner?.name ?? 'Someone'} WINS!`}
            </h1>
            <p style={{ color: '#444', marginBottom: 48, letterSpacing: 2 }}>
              {isMe ? 'Masterfully played.' : 'Better luck next time.'}
            </p>
            <button onClick={() => router.push('/games/ludo')} style={{
              padding: '16px 48px',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: '#fff', border: 'none', borderRadius: 14,
              fontFamily: "'Cinzel', serif", fontSize: '1rem',
              fontWeight: 700, letterSpacing: 2, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(245,158,11,0.4)',
            }}>
              PLAY AGAIN
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Main game ─────────────────────────────────────────────────────────────────
  const currentPlayer = getCurrentPlayer(gameState)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Crimson+Text:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080810; overflow: hidden; height: 100%; }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 12px 2px var(--glow); }
          50% { box-shadow: 0 0 28px 8px var(--glow); }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .game-wrap {
          height: 100vh; width: 100vw;
          display: flex; flex-direction: column;
          background: radial-gradient(ellipse at 50% 0%, #1a1040 0%, #080810 70%);
          font-family: 'Crimson Text', serif; color: #fff;
          overflow: hidden;
        }
        .top-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px;
          background: rgba(10,8,24,0.8);
          border-bottom: 1px solid #1a1840;
          flex-shrink: 0;
        }
        .room-code {
          font-family: 'Cinzel', serif;
          font-size: 0.7rem; letter-spacing: 2px; color: #333;
          cursor: pointer;
        }
        .logo-text {
          font-family: 'Cinzel', serif;
          font-size: 1.1rem; font-weight: 900;
          letter-spacing: 6px; color: #ccc;
        }
        .turn-banner {
          padding: 8px 16px;
          text-align: center;
          font-size: 0.9rem; letter-spacing: 1px;
          border-bottom: 1px solid #1a1840;
          flex-shrink: 0;
          animation: slideUp 0.3s ease;
          transition: background 0.4s;
        }
        .board-wrap {
          flex: 1; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          touch-action: none;
        }
        .board-inner {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #2a2850;
          box-shadow: 0 0 60px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.4);
        }
        .bottom-panel {
          flex-shrink: 0;
          background: rgba(10,8,24,0.95);
          border-top: 1px solid #1a1840;
          padding: 12px 16px;
        }
        .dice-area {
          position: relative;
          height: 110px;
          border-radius: 12px;
          background: #0a0818;
          border: 1px solid #1a1840;
          margin-bottom: 12px;
          overflow: hidden;
        }
        .dice-obj {
          position: absolute;
          cursor: pointer;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
          transition: filter 0.2s;
        }
        .roll-hint {
          position: absolute;
          bottom: 8px; left: 0; right: 0;
          text-align: center;
          font-size: 0.75rem; color: #2a2850;
          letter-spacing: 2px;
          font-family: 'Cinzel', serif;
          pointer-events: none;
        }
        .players-row {
          display: flex; gap: 8px; overflow-x: auto;
          padding-bottom: 2px;
        }
        .player-chip {
          flex-shrink: 0;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #1a1840;
          text-align: center;
          min-width: 70px;
          transition: all 0.3s;
          font-size: 0.75rem;
        }
        .player-dot {
          width: 10px; height: 10px; border-radius: 50%;
          margin: 0 auto 4px;
        }
        .action-log {
          text-align: center; font-size: 0.78rem;
          color: #333; margin-bottom: 8px;
          min-height: 16px; letter-spacing: 0.5px;
        }
      `}</style>

      <div className="game-wrap">
        {/* Top bar */}
        <div className="top-bar">
          <span className="room-code" onClick={copyCode}>
            {copied ? '✅' : `# ${roomCode}`}
          </span>
          <span className="logo-text">LUDO</span>
          <span style={{ color: '#333', fontSize: '0.75rem' }}>{me?.name}</span>
        </div>

        {/* Turn banner */}
        <div
          className="turn-banner"
          style={{
            background: isMyTurn
              ? `linear-gradient(135deg, ${COLOR_DARK[currentPlayer.color]}, #0a0818)`
              : '#0a0818',
            borderColor: isMyTurn ? `${COLOR_HEX[currentPlayer.color]}44` : '#1a1840',
            color: isMyTurn ? COLOR_HEX[currentPlayer.color] : '#333',
          }}
        >
          {isMyTurn
            ? `⭐ YOUR TURN`
            : `${currentPlayer.name.toUpperCase()}'S TURN...`}
        </div>

        {/* Board */}
        <div
          className="board-wrap"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center' }}>
            <div className="board-inner" style={{ width: BOARD_PX, height: BOARD_PX }}>
              {renderBoard()}
            </div>
          </div>
        </div>

        {/* Bottom panel */}
        <div className="bottom-panel">
          <div className="action-log">{gameState.lastAction ?? ''}</div>

          {/* Dice area */}
          <div
            className="dice-area"
            ref={diceContainerRef}
            onClick={isMyTurn && !gameState.diceRolled && !rolling ? handleRollDice : undefined}
            style={{ cursor: isMyTurn && !gameState.diceRolled && !rolling ? 'pointer' : 'default' }}
          >
            <div
              className="dice-obj"
              style={{
                left: dice.x,
                top: dice.y,
                transform: `rotate(${dice.rotation}deg)`,
              }}
            >
              <DiceFace face={dice.face} size={64} />
            </div>

            {isMyTurn && !gameState.diceRolled && !rolling && (
              <div className="roll-hint">TAP TO ROLL</div>
            )}
            {isMyTurn && gameState.diceRolled && movable.length > 0 && (
              <div className="roll-hint" style={{ color: '#f59e0b' }}>
                TAP A GLOWING PIECE
              </div>
            )}
            {!isMyTurn && (
              <div className="roll-hint">
                WAITING FOR {currentPlayer.name.toUpperCase()}...
              </div>
            )}
          </div>

          {/* Players */}
          <div className="players-row">
            {gameState.players.map((p, i) => {
              const done = gameState.pieces.filter(pc => pc.color === p.color && pc.status === 'finished').length
              const active = i === gameState.currentPlayerIndex
              return (
                <div
                  key={p.id}
                  className="player-chip"
                  style={{
                    background: active ? COLOR_DARK[p.color] : '#0a0818',
                    borderColor: active ? COLOR_HEX[p.color] : '#1a1840',
                    boxShadow: active ? `0 0 16px ${COLOR_HEX[p.color]}44` : 'none',
                  }}
                >
                  <div className="player-dot" style={{
                    background: COLOR_HEX[p.color],
                    boxShadow: active ? `0 0 8px ${COLOR_HEX[p.color]}` : 'none',
                  }} />
                  <div style={{ color: active ? '#fff' : '#444', fontWeight: active ? 600 : 400 }}>
                    {p.name}
                  </div>
                  <div style={{ color: '#333', fontSize: '0.65rem', marginTop: 2 }}>
                    {done > 0 ? '🏠'.repeat(done) : '·'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default function LudoPlay() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#080810',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: 'Cinzel, serif', letterSpacing: 4,
      }}>
        LOADING...
      </div>
    }>
      <LudoPlayInner />
    </Suspense>
  )
}
