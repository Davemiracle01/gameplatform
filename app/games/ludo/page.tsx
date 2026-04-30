'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const CS = 26
const BP = CS * 15

type Color = 'red' | 'blue'
interface Piece { id: string; color: Color; steps: number }

const TRACK: [number, number][] = [
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[6,9],[6,10],[6,11],[6,12],[6,13],
  [6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[8,8],[9,8],[10,8],[11,8],[12,8],
]

const HOME_COL: Record<Color, [number,number][]> = {
  red:  [[12,7],[11,7],[10,7],[9,7],[8,7]],
  blue: [[7,1],[7,2],[7,3],[7,4],[7,5]],
}

// 4 home spots per color in their quadrant
const HOME_SPOTS: Record<Color, [number,number][]> = {
  red:  [[10,9],[10,11],[12,9],[12,11]],
  blue: [[2,3],[2,5],[4,3],[4,5]],
}

const START: Record<Color, number> = { red: 0, blue: 13 }
const SAFE = new Set([0,8,13,21])

const CLR: Record<Color, string> = {
  red: '#ff4d6d',
  blue: '#4dabf7',
}

const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅']

const initPieces = (): Piece[] =>
  (['red','blue'] as Color[]).flatMap(c =>
    Array.from({ length: 4 }, (_, i) => ({ id:`${c}-${i}`, color:c, steps:-1 }))
  )

const gpos = (c: Color, s: number) => (START[c] + s) % 52

const canMove = (p: Piece, d: number) =>
  p.steps >= 57 ? false : p.steps < 0 ? d === 6 : p.steps + d <= 57

const getMovable = (color: Color, roll: number, pcs: Piece[]) =>
  pcs.filter(p => p.color === color && canMove(p, roll)).map(p => p.id)

function getXY(p: Piece): [number, number] {
  if (p.steps < 0) return HOME_SPOTS[p.color][parseInt(p.id.split('-')[1])]
  if (p.steps >= 57) return [7, 7]
  if (p.steps >= 52) return HOME_COL[p.color][p.steps - 52]
  return TRACK[gpos(p.color, p.steps)]
}

function cellColor(r: number, c: number): string {
  // Colored quadrants
  if (r <= 5 && c <= 5) return 'rgba(96,165,250,0.18)'
  if (r <= 5 && c >= 9) return 'rgba(74,222,128,0.1)'
  if (r >= 9 && c <= 5) return 'rgba(255,77,109,0.18)'
  if (r >= 9 && c >= 9) return 'rgba(250,204,21,0.1)'
  // Home columns
  if (r >= 8 && r <= 12 && c === 7) return 'rgba(255,77,109,0.35)'
  if (r === 7 && c >= 1 && c <= 5) return 'rgba(96,165,250,0.35)'
  // Center
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8 && !(r===7&&c===7)) return 'rgba(255,255,255,0.06)'
  const ti = TRACK.findIndex(([tr,tc]) => tr===r && tc===c)
  if (ti >= 0) {
    if (ti === START.red) return 'rgba(255,77,109,0.5)'
    if (ti === START.blue) return 'rgba(96,165,250,0.5)'
    if (SAFE.has(ti)) return 'rgba(255,255,255,0.18)'
    return 'rgba(255,255,255,0.07)'
  }
  return 'rgba(255,255,255,0.03)'
}

function playTone(freq: number, dur = 80) {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = freq
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur/1000)
    o.start(); o.stop(ctx.currentTime + dur/1000)
  } catch {}
}

export default function LudoPage() {
  const router = useRouter()
  const [pieces, setPieces] = useState<Piece[]>(initPieces)
  const [turn, setTurn] = useState<Color>('red')
  const [dice, setDice] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [rolled, setRolled] = useState(false)
  const [movable, setMovable] = useState<string[]>([])
  const [winner, setWinner] = useState<Color | null>(null)
  const [msg, setMsg] = useState('Your turn! Roll the dice 🎲')
  const [explosions, setExplosions] = useState<{x:number,y:number,id:number}[]>([])
  const [moving, setMoving] = useState<string | null>(null)
  const intervalRef = useRef<any>(null)
  const botTimer = useRef<any>(null)

  const doMove = useCallback(async (id: string, roll: number, pcs: Piece[], forTurn: Color) => {
    setMoving(id)
    let cur = [...pcs]

    for (let i = 0; i < roll; i++) {
      cur = cur.map(p => p.id !== id ? p : { ...p, steps: p.steps < 0 ? 0 : p.steps + 1 })
      setPieces([...cur])
      playTone(600 + i * 30, 40)
      await new Promise(r => setTimeout(r, 100))
    }

    setMoving(null)

    const moved = cur.find(p => p.id === id)!
    if (moved.steps >= 0 && moved.steps < 52) {
      const gp = gpos(moved.color, moved.steps)
      cur.forEach((p, i) => {
        if (p.color !== moved.color && p.steps >= 0 && p.steps < 52 && !SAFE.has(moved.steps)) {
          if (gpos(p.color, p.steps) === gp) {
            const [r, c] = TRACK[gp]
            setExplosions(e => [...e, { x: c*CS, y: r*CS, id: Date.now()+i }])
            setTimeout(() => setExplosions(e => e.slice(1)), 500)
            cur[i] = { ...p, steps: -1 }
            playTone(200, 250)
          }
        }
      })
    }

    setPieces([...cur])

    if (moved.steps >= 57) playTone(880, 300)

    const won = cur.filter(p => p.color === forTurn).every(p => p.steps >= 57)
    if (won) { setWinner(forTurn); return }

    if (roll === 6) {
      setMsg(forTurn === 'red' ? '🎯 Rolled 6! Roll again!' : '🤖 Bot rolled 6! Rolling again...')
      setRolled(false); setDice(0); setMovable([])
      if (forTurn === 'blue') {
        botTimer.current = setTimeout(() => triggerBotRoll(cur), 900)
      }
    } else {
      const next: Color = forTurn === 'red' ? 'blue' : 'red'
      setTurn(next); setRolled(false); setDice(0); setMovable([])
      setMsg(next === 'red' ? 'Your turn! Roll the dice 🎲' : '🤖 Bot is thinking...')
    }
  }, [])

  const triggerBotRoll = useCallback((pcs: Piece[]) => {
    const val = Math.ceil(Math.random() * 6)
    setDice(val)
    const mv = getMovable('blue', val, pcs)
    setMsg(`🤖 Bot rolled ${val}${mv.length === 0 ? ' — no moves!' : ''}`)
    if (mv.length === 0) {
      botTimer.current = setTimeout(() => {
        setTurn('red'); setDice(0); setMsg('Your turn! Roll the dice 🎲')
      }, 1000)
    } else {
      const pick = mv[Math.floor(Math.random() * mv.length)]
      botTimer.current = setTimeout(() => doMove(pick, val, pcs, 'blue'), 700)
    }
  }, [doMove])

  useEffect(() => {
    if (turn !== 'blue' || rolled || winner) return
    botTimer.current = setTimeout(() => triggerBotRoll(pieces), 1000)
    return () => clearTimeout(botTimer.current)
  }, [turn, rolled, winner])

  const rollDice = () => {
    if (rolling || rolled || turn !== 'red' || winner) return
    setRolling(true)
    let ticks = 0
    intervalRef.current = setInterval(() => {
      const v = Math.ceil(Math.random() * 6)
      setDice(v)
      playTone(800 + v * 20, 20)
      if (++ticks > 12) {
        clearInterval(intervalRef.current)
        const val = Math.ceil(Math.random() * 6)
        setDice(val); setRolling(false); setRolled(true)
        const mv = getMovable('red', val, pieces)
        setMovable(mv)
        if (!mv.length) {
          setMsg(`Rolled ${val} — no moves! Bot's turn.`)
          setTimeout(() => { setTurn('blue'); setDice(0); setRolled(false) }, 1200)
        } else {
          setMsg(`Rolled ${val}! Tap a glowing piece ✨`)
        }
      }
    }, 55)
  }

  const handlePieceClick = (id: string) => {
    if (!rolled || !movable.includes(id) || turn !== 'red') return
    setMovable([]); setRolled(false)
    doMove(id, dice, pieces, 'red')
  }

  const reset = () => {
    clearInterval(intervalRef.current)
    clearTimeout(botTimer.current)
    setPieces(initPieces()); setTurn('red'); setDice(0)
    setRolling(false); setRolled(false); setMovable([])
    setWinner(null); setMsg('Your turn! Roll the dice 🎲')
    setExplosions([]); setMoving(null)
  }

  // Touch flick to roll
  const touchStart = useRef<{x:number,y:number,t:number} | null>(null)
  const onTS = (e: React.TouchEvent) => {
    touchStart.current = { x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now() }
  }
  const onTE = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    const speed = Math.sqrt(dx*dx+dy*dy) / (Date.now()-touchStart.current.t)
    touchStart.current = null
    if (speed > 0.2 || Math.sqrt(dx*dx+dy*dy) > 10) rollDice()
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#06060f 0%,#0d0a1a 100%)', display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 8px', color:'white' }}>

      {/* Header */}
      <div style={{ width:'100%', maxWidth:BP, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <button onClick={() => router.push('/games')} style={{ background:'none', border:'none', color:'#6b7280', fontSize:14, cursor:'pointer' }}>← Back</button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:CLR[turn], boxShadow:`0 0 8px ${CLR[turn]}` }} />
          <span style={{ fontWeight:'bold', letterSpacing:3, fontSize:13 }}>LUDO</span>
        </div>
        <button onClick={reset} style={{ background:'none', border:'none', color:'#818cf8', fontSize:12, cursor:'pointer' }}>Reset</button>
      </div>

      {/* Message */}
      <div style={{ width:'100%', maxWidth:BP, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'8px 16px', textAlign:'center', marginBottom:10 }}>
        <span style={{ fontSize:12, color:'#d1d5db' }}>{msg}</span>
      </div>

      {/* Board */}
      <div style={{ position:'relative', width:BP, height:BP, borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 0 40px rgba(0,0,0,0.6)' }}>

        {/* Background cells */}
        {Array.from({length:15},(_,r) => Array.from({length:15},(_,c) => (
          <div key={`${r}-${c}`} style={{
            position:'absolute', left:c*CS+1, top:r*CS+1,
            width:CS-2, height:CS-2, borderRadius:3,
            background:cellColor(r,c),
          }}>
            {(() => {
              const ti = TRACK.findIndex(([tr,tc])=>tr===r&&tc===c)
              if (ti>=0 && SAFE.has(ti)) return <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,opacity:0.5}}>★</div>
              if (r===7&&c===7) return <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🏠</div>
              return null
            })()}
          </div>
        ))).flat()}

        {/* Pieces */}
        {pieces.map(p => {
          const [r, c] = getXY(p)
          const isMovable = movable.includes(p.id)
          const isMoving = moving === p.id
          const isDone = p.steps >= 57
          return (
            <div
              key={p.id}
              onClick={() => handlePieceClick(p.id)}
              style={{
                position:'absolute',
                left: c*CS + CS*0.1,
                top:  r*CS + CS*0.1,
                width: CS*0.8, height: CS*0.8,
                borderRadius:'50%',
                background: isDone ? 'rgba(255,255,255,0.15)' : CLR[p.color],
                border: isMovable ? '2px solid white' : `1.5px solid rgba(0,0,0,0.4)`,
                boxShadow: isMoving
                  ? `0 0 0 4px ${CLR[p.color]}44, 0 0 20px ${CLR[p.color]}`
                  : isMovable
                  ? `0 0 14px ${CLR[p.color]}, 0 0 28px ${CLR[p.color]}66`
                  : '0 2px 6px rgba(0,0,0,0.5)',
                cursor: isMovable ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: CS*0.28, fontWeight:'bold', color:'white',
                opacity: isDone ? 0.3 : 1,
                zIndex: isMovable ? 20 : 10,
                transition: 'left 0.12s ease, top 0.12s ease, box-shadow 0.2s, transform 0.15s',
                transform: isMoving ? 'scale(1.5)' : isMovable ? 'scale(1.15)' : 'scale(1)',
                animation: isMovable ? 'pulse 0.8s ease-in-out infinite' : 'none',
              }}
            >
              {isDone ? '✓' : parseInt(p.id.split('-')[1])+1}
            </div>
          )
        })}

        {/* Explosions */}
        {explosions.map(e => (
          <div key={e.id} style={{
            position:'absolute', left:e.x-5, top:e.y-5,
            width:CS+10, height:CS+10, borderRadius:'50%', pointerEvents:'none',
            background:'radial-gradient(circle, rgba(255,255,200,0.9), transparent)',
            animation:'boom 0.5s ease-out forwards',
          }} />
        ))}
      </div>

      {/* Dice + Controls */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:16, width:'100%', maxWidth:BP }}>
        {/* Dice */}
        <div
          onClick={rollDice}
          onTouchStart={onTS}
          onTouchEnd={onTE}
          style={{
            width:72, height:72, flexShrink:0, borderRadius:18,
            background: rolling
              ? `conic-gradient(${CLR.red},${CLR.blue},${CLR.red})`
              : dice > 0
              ? `radial-gradient(circle at 40% 40%, rgba(255,255,255,0.18), rgba(255,255,255,0.06))`
              : 'rgba(255,255,255,0.07)',
            border: `2px solid ${rolled ? CLR.red : rolling ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:36, cursor: (turn==='red'&&!rolled&&!winner) ? 'pointer':'default',
            boxShadow: rolling ? '0 0 30px rgba(99,102,241,0.7)' : rolled ? `0 0 20px ${CLR.red}66` : 'none',
            animation: rolling ? 'diceRoll 0.15s linear infinite' : 'none',
            userSelect:'none', opacity: (turn==='blue'||!!winner) ? 0.4 : 1,
            transition:'border 0.2s, box-shadow 0.2s',
          }}
        >
          {dice === 0 ? '🎲' : DICE_FACES[dice]}
        </div>

        {/* Piece status bars */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
          {(['red','blue'] as Color[]).map(color => (
            <div key={color} style={{ display:'flex', gap:5 }}>
              {pieces.filter(p=>p.color===color).map(p => {
                const isM = movable.includes(p.id)
                return (
                  <div
                    key={p.id}
                    onClick={() => handlePieceClick(p.id)}
                    style={{
                      flex:1, height:30, borderRadius:10,
                      background: isM ? CLR[color] : `${CLR[color]}22`,
                      border: `1px solid ${isM ? 'white' : CLR[color]+'44'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, fontWeight:'bold', color:'white',
                      cursor: isM ? 'pointer' : 'default',
                      boxShadow: isM ? `0 0 10px ${CLR[color]}` : 'none',
                      transition:'all 0.2s',
                    }}
                  >
                    {p.steps<0?'🏠':p.steps>=57?'✓':p.steps}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Roll button on mobile */}
      {turn==='red' && !rolled && !winner && (
        <button
          onClick={rollDice}
          disabled={rolling}
          style={{
            marginTop:14, width:'100%', maxWidth:BP,
            padding:'14px 0', borderRadius:18,
            background: rolling ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border:'none', color:'white', fontWeight:'bold', fontSize:15,
            cursor: rolling ? 'default':'pointer',
            boxShadow: rolling ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
            transition:'all 0.2s',
          }}
        >
          {rolling ? 'Rolling...' : '🎲 Roll Dice'}
        </button>
      )}

      {/* Winner */}
      {winner && (
        <div style={{
          marginTop:16, width:'100%', maxWidth:BP, padding:24, borderRadius:24, textAlign:'center',
          background: winner==='red' ? 'rgba(255,77,109,0.1)' : 'rgba(77,171,247,0.1)',
          border:`2px solid ${CLR[winner]}`,
        }}>
          <div style={{fontSize:40,marginBottom:6}}>{winner==='red'?'🎉':'🤖'}</div>
          <p style={{fontWeight:'bold',fontSize:22,color:CLR[winner],marginBottom:14}}>
            {winner==='red'?'YOU WIN!':'BOT WINS!'}
          </p>
          <button onClick={reset} style={{
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border:'none', color:'white', padding:'10px 28px',
            borderRadius:14, fontWeight:'bold', fontSize:14, cursor:'pointer',
          }}>Play Again</button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,100%{transform:scale(1.15)} 50%{transform:scale(1.3)}
        }
        @keyframes diceRoll {
          0%{transform:rotate(-15deg) scale(1.1)} 100%{transform:rotate(15deg) scale(1.1)}
        }
        @keyframes boom {
          0%{transform:scale(0.3);opacity:1} 100%{transform:scale(2.5);opacity:0}
        }
      `}</style>
    </div>
  )
}
