'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const BOARD_SIZE = 15
const COLORS = ['red', 'blue', 'green', 'yellow']

// Safe squares (stars on ludo board)
const SAFE_SQUARES = [1, 9, 14, 22, 27, 35, 40, 48]

// Path for each color (indices on the linear track 0-51)
const START_POSITIONS = { red: 0, blue: 13, green: 26, yellow: 39 }
const HOME_COLUMN_ENTRY = { red: 50, blue: 11, green: 24, yellow: 37 }

type Piece = {
  id: string
  color: string
  position: number // -1 = home base, 0-51 = main track, 52-57 = home column, 58 = finished
}

const COLOR_STYLES: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
}

const COLOR_LIGHT: Record<string, string> = {
  red: 'rgba(239,68,68,0.15)',
  blue: 'rgba(59,130,246,0.15)',
  green: 'rgba(34,197,94,0.15)',
  yellow: 'rgba(234,179,8,0.15)',
}

function initPieces(): Piece[] {
  const pieces: Piece[] = []
  COLORS.forEach(color => {
    for (let i = 0; i < 4; i++) {
      pieces.push({ id: `${color}-${i}`, color, position: -1 })
    }
  })
  return pieces
}

function getAbsolutePosition(color: string, relPos: number): number {
  if (relPos < 0) return -1
  if (relPos >= 52) return relPos
  return (START_POSITIONS[color as keyof typeof START_POSITIONS] + relPos) % 52
}

export default function LudoGame() {
  const router = useRouter()
  const [pieces, setPieces] = useState<Piece[]>(initPieces())
  const [currentTurn, setCurrentTurn] = useState<'red' | 'blue'>('red')
  const [dice, setDice] = useState(0)
  const [rolled, setRolled] = useState(false)
  const [movablePieces, setMovablePieces] = useState<string[]>([])
  const [winner, setWinner] = useState<string | null>(null)
  const [message, setMessage] = useState('Roll the dice!')
  const [rolling, setRolling] = useState(false)

  const getMovable = useCallback((color: string, diceVal: number, pcs: Piece[]) => {
    return pcs
      .filter(p => p.color === color)
      .filter(p => {
        if (p.position === 58) return false
        if (p.position === -1) return diceVal === 6
        const newPos = p.position + diceVal
        if (newPos > 57) return false
        return true
      })
      .map(p => p.id)
  }, [])

  const rollDice = () => {
    if (rolled || rolling || winner) return
    setRolling(true)
    let count = 0
    const interval = setInterval(() => {
      setDice(Math.ceil(Math.random() * 6))
      count++
      if (count > 8) {
        clearInterval(interval)
        const val = Math.ceil(Math.random() * 6)
        setDice(val)
        setRolling(false)
        setRolled(true)

        const movable = getMovable(currentTurn, val, pieces)
        setMovablePieces(movable)

        if (movable.length === 0) {
          setMessage(`${currentTurn.toUpperCase()} has no moves. Turn skipped.`)
          setTimeout(() => {
            setCurrentTurn(t => t === 'red' ? 'blue' : 'red')
            setRolled(false)
            setDice(0)
            setMessage('Roll the dice!')
          }, 1500)
        } else {
          setMessage(`${currentTurn.toUpperCase()} rolled ${val}. Select a piece.`)
        }
      }
    }, 80)
  }

  const movePiece = (pieceId: string) => {
    if (!rolled || !movablePieces.includes(pieceId)) return

    setPieces(prev => {
      const updated = prev.map(p => {
        if (p.id !== pieceId) return p
        let newPos: number
        if (p.position === -1) {
          newPos = 0
        } else {
          newPos = p.position + dice
        }
        if (newPos >= 52) newPos = Math.min(52 + (newPos - 52), 57)
        if (newPos === 57) newPos = 58
        return { ...p, position: newPos }
      })

      // Check win
      const colorPieces = updated.filter(p => p.color === currentTurn)
      if (colorPieces.every(p => p.position === 58)) {
        setWinner(currentTurn)
        setMessage(`🎉 ${currentTurn.toUpperCase()} WINS!`)
        return updated
      }

      const gotSix = dice === 6
      const nextTurn = gotSix ? currentTurn : (currentTurn === 'red' ? 'blue' : 'red')
      setCurrentTurn(nextTurn as 'red' | 'blue')
      setRolled(false)
      setDice(0)
      setMovablePieces([])
      setMessage(gotSix ? `${currentTurn.toUpperCase()} rolled 6! Roll again!` : 'Roll the dice!')

      return updated
    })
  }

  // Bot move
  useEffect(() => {
    if (currentTurn !== 'blue' || rolled || winner) return
    const timer = setTimeout(() => {
      const val = Math.ceil(Math.random() * 6)
      setDice(val)
      setRolling(false)
      setRolled(true)
      setMessage(`BLUE (bot) rolled ${val}`)

      const movable = getMovable('blue', val, pieces)
      if (movable.length === 0) {
        setTimeout(() => {
          setCurrentTurn('red')
          setRolled(false)
          setDice(0)
          setMessage('Roll the dice!')
        }, 1000)
        return
      }

      setTimeout(() => {
        const chosen = movable[Math.floor(Math.random() * movable.length)]
        setPieces(prev => {
          const updated = prev.map(p => {
            if (p.id !== chosen) return p
            let newPos = p.position === -1 ? 0 : p.position + val
            if (newPos >= 52) newPos = Math.min(52 + (newPos - 52), 57)
            if (newPos === 57) newPos = 58
            return { ...p, position: newPos }
          })

          const bluePieces = updated.filter(p => p.color === 'blue')
          if (bluePieces.every(p => p.position === 58)) {
            setWinner('blue')
            setMessage('🤖 BOT WINS!')
            return updated
          }

          const nextTurn = val === 6 ? 'blue' : 'red'
          setCurrentTurn(nextTurn as 'red' | 'blue')
          setRolled(false)
          setDice(0)
          setMovablePieces([])
          setMessage(val === 6 ? 'Bot rolled 6! Rolling again...' : 'Your turn! Roll the dice!')
          return updated
        })
      }, 800)
    }, 1200)

    return () => clearTimeout(timer)
  }, [currentTurn, rolled, winner, pieces, getMovable])

  const resetGame = () => {
    setPieces(initPieces())
    setCurrentTurn('red')
    setDice(0)
    setRolled(false)
    setMovablePieces([])
    setWinner(null)
    setMessage('Roll the dice!')
  }

  const redPieces = pieces.filter(p => p.color === 'red')
  const bluePieces = pieces.filter(p => p.color === 'blue')

  return (
    <div className="min-h-screen text-white p-4" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)' }}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.push('/games')} className="text-gray-500 text-sm">← Back</button>
          <h1 className="font-bold text-lg">Ludo</h1>
          <button onClick={resetGame} className="text-indigo-400 text-sm">Reset</button>
        </div>

        {/* Status */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} className="p-3 rounded-2xl mb-4 text-center">
          <p className="text-sm font-semibold" style={{ color: COLOR_STYLES[currentTurn] }}>{message}</p>
        </div>

        {/* Board */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '1' }} className="rounded-2xl p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 h-full">
            
            {/* Red home base */}
            <div style={{ background: COLOR_LIGHT.red, border: `2px solid ${COLOR_STYLES.red}` }} className="rounded-xl p-2 flex flex-wrap gap-1 items-center justify-center">
              {redPieces.map(p => (
                <div
                  key={p.id}
                  onClick={() => movePiece(p.id)}
                  style={{
                    background: p.position === -1 ? COLOR_STYLES.red : 'rgba(255,255,255,0.1)',
                    border: movablePieces.includes(p.id) ? '2px solid white' : `2px solid ${COLOR_STYLES.red}`,
                    cursor: movablePieces.includes(p.id) ? 'pointer' : 'default',
                    opacity: p.position === 58 ? 0.3 : 1,
                    boxShadow: movablePieces.includes(p.id) ? '0 0 8px white' : 'none'
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                >
                  {p.position === 58 ? '✓' : p.position === -1 ? '●' : p.position}
                </div>
              ))}
            </div>

            {/* Blue home base */}
            <div style={{ background: COLOR_LIGHT.blue, border: `2px solid ${COLOR_STYLES.blue}` }} className="rounded-xl p-2 flex flex-wrap gap-1 items-center justify-center">
              {bluePieces.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: p.position === -1 ? COLOR_STYLES.blue : 'rgba(255,255,255,0.1)',
                    border: `2px solid ${COLOR_STYLES.blue}`,
                    opacity: p.position === 58 ? 0.3 : 1,
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                >
                  {p.position === 58 ? '✓' : p.position === -1 ? '●' : p.position}
                </div>
              ))}
            </div>

            {/* Track visualization */}
            <div className="col-span-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} >
              <div className="p-2">
                <p className="text-gray-600 text-xs text-center mb-2">Track positions</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {Array.from({ length: 52 }, (_, i) => {
                    const piecesHere = pieces.filter(p => {
                      const abs = getAbsolutePosition(p.color, p.position === -1 ? -1 : p.position)
                      return abs === i && p.position !== -1 && p.position < 52
                    })
                    return (
                      <div
                        key={i}
                        style={{
                          background: piecesHere.length > 0 ? COLOR_STYLES[piecesHere[0].color] : 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          width: '14px',
                          height: '14px',
                          fontSize: '6px'
                        }}
                        className="rounded flex items-center justify-center text-white"
                      >
                        {piecesHere.length > 0 ? piecesHere.length : ''}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dice + controls */}
        <div className="flex items-center gap-4 mb-4">
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `2px solid ${rolled ? COLOR_STYLES[currentTurn] : 'rgba(255,255,255,0.1)'}`,
              fontSize: '2.5rem'
            }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
          >
            {dice === 0 ? '🎲' : ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice]}
          </div>

          <button
            onClick={rollDice}
            disabled={rolled || currentTurn === 'blue' || !!winner || rolling}
            style={{
              background: (!rolled && currentTurn === 'red' && !winner) ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
              opacity: (!rolled && currentTurn === 'red' && !winner) ? 1 : 0.5
            }}
            className="flex-1 py-4 rounded-2xl font-bold text-sm"
          >
            {rolling ? 'Rolling...' : currentTurn === 'blue' ? 'Bot is thinking...' : rolled ? 'Select a piece' : 'Roll Dice'}
          </button>
        </div>

        {/* Piece selector when movable */}
        {movablePieces.length > 0 && currentTurn === 'red' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} className="p-4 rounded-2xl mb-4">
            <p className="text-xs text-gray-400 mb-3">Tap a piece to move:</p>
            <div className="flex gap-3 justify-center">
              {redPieces.map(p => (
                <div
                  key={p.id}
                  onClick={() => movePiece(p.id)}
                  style={{
                    background: movablePieces.includes(p.id) ? COLOR_STYLES.red : 'rgba(255,255,255,0.05)',
                    border: movablePieces.includes(p.id) ? '2px solid white' : '2px solid transparent',
                    cursor: movablePieces.includes(p.id) ? 'pointer' : 'not-allowed',
                    boxShadow: movablePieces.includes(p.id) ? '0 0 12px rgba(239,68,68,0.5)' : 'none'
                  }}
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white"
                >
                  {p.position === -1 ? 'Base' : p.position === 58 ? '✓' : `P${p.id.split('-')[1]}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Winner overlay */}
        {winner && (
          <div style={{ background: COLOR_LIGHT[winner], border: `2px solid ${COLOR_STYLES[winner]}` }} className="p-6 rounded-2xl text-center">
            <p className="text-2xl font-bold mb-2" style={{ color: COLOR_STYLES[winner] }}>
              {winner === 'red' ? '🎉 YOU WIN!' : '🤖 BOT WINS!'}
            </p>
            <button
              onClick={resetGame}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              className="px-6 py-2 rounded-xl font-semibold text-sm mt-2"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
         }
