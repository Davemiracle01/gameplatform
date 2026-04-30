'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────
type Color = 'red' | 'blue'
interface Piece { id: string; color: Color; steps: number }

// ─── Constants ───────────────────────────────────────────
const S = 40          // cell size in SVG units
const G = 15          // grid = 15x15
const W = S * G       // 600

// Main track (row, col) — 52 squares
const TRACK: [number,number][] = [
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[8,8],
  [9,8],[10,8],[11,8],[12,8],[13,8],
]

// Home column paths (steps 52-56, then 57=center)
const HOME_COL: Record<Color,[number,number][]> = {
  red:  [[12,7],[11,7],[10,7],[9,7],[8,7]],
  blue: [[7,1],[7,2],[7,3],[7,4],[7,5]],
}

// 4 home slot positions per color
const HOME_SLOTS: Record<Color,[number,number][]> = {
  red:  [[10,9],[10,11],[12,9],[12,11]],
  blue: [[2,3],[2,5],[4,3],[4,5]],
}

const START: Record<Color,number> = { red:0, blue:13 }
const SAFE = new Set([0,8,13,21])

const COLORS: Record<Color,string> = {
  red:  '#f87171',
  blue: '#60a5fa',
}
const DARK: Record<Color,string> = {
  red:  '#991b1b',
  blue: '#1e3a5f',
}
const LIGHT: Record<Color,string> = {
  red:  'rgba(248,113,113,0.15)',
  blue: 'rgba(96,165,250,0.15)',
}

const DICE_SVG: Record<number, string> = {
  1: 'M20,20 m-3,0 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0',
  2: 'M10,10 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,30 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0',
  3: 'M10,10 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M20,20 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,30 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0',
  4: 'M10,10 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,10 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M10,30 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,30 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0',
  5: 'M10,10 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,10 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M20,20 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M10,30 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,30 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0',
  6: 'M10,8 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,8 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M10,20 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,20 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M10,32 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M30,32 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0',
}

// ─── Helpers ─────────────────────────────────────────────
const gpos = (c: Color, s: number) => (START[c] + s) % 52

function pieceXY(p: Piece): [number, number] {
  if (p.steps < 0) {
    const [r,c] = HOME_SLOTS[p.color][parseInt(p.id.split('-')[1])]
    return [r*S + S/2, c*S + S/2]
  }
  if (p.steps >= 57) return [7*S + S/2, 7*S + S/2]
  if (p.steps >= 52) {
    const [r,c] = HOME_COL[p.color][p.steps-52]
    return [r*S + S/2, c*S + S/2]
  }
  const [r,c] = TRACK[gpos(p.color, p.steps)]
  return [r*S + S/2, c*S + S/2]
}

const canMove = (p: Piece, d: number) =>
  p.steps >= 57 ? false : p.steps < 0 ? d === 6 : p.steps + d <= 57

const getMovable = (color: Color, roll: number, pcs: Piece[]) =>
  pcs.filter(p => p.color === color && canMove(p, roll)).map(p => p.id)

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

const initPieces = (): Piece[] =>
  (['red','blue'] as Color[]).flatMap(c =>
    Array.from({length:4}, (_,i) => ({id:`${c}-${i}`, color:c, steps:-1}))
  )

// ─── Board SVG ───────────────────────────────────────────
function BoardSVG({ pieces, movable, onPieceClick, explosions }: {
  pieces: Piece[]
  movable: string[]
  onPieceClick: (id: string) => void
  explosions: {x:number,y:number,id:number}[]
}) {
  // Cell fill color
  const cellFill = (r: number, c: number): string => {
    // Quadrant backgrounds
    if (r<=5 && c<=5) return LIGHT.blue
    if (r<=5 && c>=9) return 'rgba(74,222,128,0.1)'
    if (r>=9 && c<=5) return LIGHT.red
    if (r>=9 && c>=9) return 'rgba(250,204,21,0.1)'
    // Home columns
    if (r>=8 && r<=12 && c===7) return 'rgba(248,113,113,0.4)'
    if (r===7 && c>=1 && c<=5)  return 'rgba(96,165,250,0.4)'
    // Center
    if (r===7 && c===7) return 'rgba(255,255,255,0.1)'
    // Track
    const ti = TRACK.findIndex(([tr,tc])=>tr===r&&tc===c)
    if (ti >= 0) {
      if (ti === START.red)  return 'rgba(248,113,113,0.6)'
      if (ti === START.blue) return 'rgba(96,165,250,0.6)'
      if (SAFE.has(ti)) return 'rgba(255,255,255,0.2)'
      return 'rgba(255,255,255,0.07)'
    }
    return 'rgba(0,0,0,0.2)'
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${W}`}
      width="100%"
      style={{ display:'block', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)' }}
    >
      <defs>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-blue">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0f0f1e"/>
          <stop offset="100%" stopColor="#060610"/>
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width={W} height={W} fill="url(#bg)" rx={16}/>

      {/* ── Cells ── */}
      {Array.from({length:G},(_,r)=>Array.from({length:G},(_,c)=>{
        const x = c*S, y = r*S
        const fill = cellFill(r,c)
        const ti = TRACK.findIndex(([tr,tc])=>tr===r&&tc===c)
        const isSafe = ti>=0 && SAFE.has(ti) && ti!==START.red && ti!==START.blue

        return (
          <g key={`${r}-${c}`}>
            <rect x={x+1} y={y+1} width={S-2} height={S-2} rx={3} fill={fill}/>
            {isSafe && (
              <text x={x+S/2} y={y+S/2+4} textAnchor="middle" fontSize={14} opacity={0.5} fill="white">★</text>
            )}
          </g>
        )
      }))}

      {/* ── Home circles ── */}
      {(['red','blue'] as Color[]).map(color => {
        const slots = HOME_SLOTS[color]
        // bounding box center
        const rs = slots.map(s=>s[0]), cs = slots.map(s=>s[1])
        const cr = (Math.min(...rs)+Math.max(...rs))/2*S + S
        const cc = (Math.min(...cs)+Math.max(...cs))/2*S + S
        return (
          <g key={color}>
            <circle cx={cc} cy={cr} r={S*2.3} fill={DARK[color]} opacity={0.8} stroke={COLORS[color]} strokeWidth={2}/>
            {slots.map(([sr,sc],i)=>(
              <circle key={i} cx={sc*S+S/2} cy={sr*S+S/2} r={S*0.35}
                fill="rgba(0,0,0,0.4)" stroke={COLORS[color]} strokeWidth={1.5}/>
            ))}
          </g>
        )
      })}

      {/* ── Center star/home ── */}
      <polygon
        points={`${7*S+S/2},${6*S} ${8*S+S/2},${7*S+S/2} ${7*S+S/2},${8*S+S} ${6*S},${7*S+S/2}`}
        fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth={1}
      />
      <text x={7*S+S/2} y={7*S+S/2+6} textAnchor="middle" fontSize={22} fill="white" opacity={0.6}>⭐</text>

      {/* ── Directional arrows on home columns ── */}
      {/* Red: downward arrow col 7 rows 8-12 */}
      <text x={7*S+S/2} y={10*S} textAnchor="middle" fontSize={20} fill={COLORS.red} opacity={0.7}>▼</text>
      {/* Blue: rightward arrow row 7 cols 1-5 */}
      <text x={4*S} y={7*S+S/2+7} textAnchor="middle" fontSize={20} fill={COLORS.blue} opacity={0.7}>▶</text>

      {/* ── Pieces ── */}
      {pieces.map(p => {
        const [py, px] = pieceXY(p)
        const isMov = movable.includes(p.id)
        const isDone = p.steps >= 57
        const r = S * 0.34

        return (
          <g key={p.id} onClick={()=>onPieceClick(p.id)} style={{cursor:isMov?'pointer':'default'}}>
            {isMov && (
              <circle cx={px} cy={py} r={r+8} fill={COLORS[p.color]} opacity={0.25}>
                <animate attributeName="r" values={`${r+4};${r+12};${r+4}`} dur="0.8s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="0.8s" repeatCount="indefinite"/>
              </circle>
            )}
            <circle
              cx={px} cy={py} r={r}
              fill={isDone ? 'rgba(255,255,255,0.2)' : COLORS[p.color]}
              stroke={isMov ? 'white' : 'rgba(0,0,0,0.5)'}
              strokeWidth={isMov ? 2 : 1}
              filter={isMov ? `url(#glow-${p.color})` : undefined}
              opacity={isDone ? 0.3 : 1}
            >
              {isMov && (
                <animate attributeName="r" values={`${r};${r*1.2};${r}`} dur="0.6s" repeatCount="indefinite"/>
              )}
            </circle>
            {/* Shine */}
            {!isDone && (
              <circle cx={px-r*0.3} cy={py-r*0.3} r={r*0.25} fill="rgba(255,255,255,0.4)" opacity={0.7}/>
            )}
            <text x={px} y={py+4} textAnchor="middle" fontSize={10} fontWeight="bold" fill="white" opacity={isDone?0.3:1} style={{pointerEvents:'none'}}>
              {isDone ? '✓' : parseInt(p.id.split('-')[1])+1}
            </text>
          </g>
        )
      })}

      {/* ── Explosions ── */}
      {explosions.map(e => (
        <circle key={e.id} cx={e.x} cy={e.y} r={10} fill="rgba(255,220,50,0.9)" opacity={1}>
          <animate attributeName="r" from="5" to="40" dur="0.4s" fill="freeze"/>
          <animate attributeName="opacity" from="1" to="0" dur="0.4s" fill="freeze"/>
        </circle>
      ))}
    </svg>
  )
}

// ─── Dice SVG ─────────────────────────────────────────────
function DiceSVG({ value, rolling, canRoll, onClick, onTouchStart, onTouchEnd }: {
  value: number
  rolling: boolean
  canRoll: boolean
  onClick: ()=>void
  onTouchStart: (e:React.TouchEvent)=>void
  onTouchEnd: (e:React.TouchEvent)=>void
}) {
  return (
    <svg
      viewBox="0 0 40 40" width={72} height={72}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        cursor: canRoll ? 'pointer' : 'default',
        filter: rolling ? 'drop-shadow(0 0 12px #818cf8)' : value > 0 ? 'drop-shadow(0 0 6px rgba(248,113,113,0.5))' : 'none',
        opacity: canRoll ? 1 : 0.4,
        userSelect: 'none',
        flexShrink: 0,
        animation: rolling ? 'diceShake 0.12s linear infinite' : 'none',
      }}
    >
      <rect width={40} height={40} rx={8}
        fill={rolling ? 'none' : 'rgba(255,255,255,0.08)'}
        stroke={value>0 ? '#f87171' : 'rgba(255,255,255,0.15)'}
        strokeWidth={2}
      />
      {rolling && (
        <rect width={40} height={40} rx={8} fill="none"
          stroke="url(#spinGrad)" strokeWidth={3}
        >
          <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.4s" repeatCount="indefinite"/>
        </rect>
      )}
      {value === 0 && !rolling && (
        <text x={20} y={26} textAnchor="middle" fontSize={20} fill="white" opacity={0.5}>🎲</text>
      )}
      {value > 0 && !rolling && (
        <path d={DICE_SVG[value]} fill="white"/>
      )}
      {rolling && (
        <text x={20} y={26} textAnchor="middle" fontSize={18} fill="white">{value||'?'}</text>
      )}
    </svg>
  )
}

// ─── Main Game ───────────────────────────────────────────
export default function LudoPage() {
  const router = useRouter()
  const [pieces, setPieces] = useState<Piece[]>(initPieces)
  const [turn, setTurn] = useState<Color>('red')
  const [dice, setDice] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [rolled, setRolled] = useState(false)
  const [movable, setMovable] = useState<string[]>([])
  const [winner, setWinner] = useState<Color|null>(null)
  const [msg, setMsg] = useState('Your turn! Roll the dice 🎲')
  const [explosions, setExplosions] = useState<{x:number,y:number,id:number}[]>([])
  const ivRef = useRef<any>(null)
  const botTimer = useRef<any>(null)
  const touchRef = useRef<{x:number,y:number,t:number}|null>(null)

  const doMove = useCallback(async (id: string, roll: number, pcs: Piece[], forColor: Color) => {
    let cur = [...pcs]
    for (let i = 0; i < roll; i++) {
      cur = cur.map(p => p.id !== id ? p : { ...p, steps: p.steps < 0 ? 0 : p.steps+1 })
      setPieces([...cur])
      playTone(500 + i*25, 45)
      await new Promise(r => setTimeout(r, 95))
    }

    const moved = cur.find(p => p.id === id)!
    if (moved.steps >= 0 && moved.steps < 52) {
      const gp = gpos(moved.color, moved.steps)
      const [tr, tc] = TRACK[gp]
      const newPcs = [...cur]
      let captured = false
      cur.forEach((p,i) => {
        if (p.color !== moved.color && p.steps >= 0 && p.steps < 52 && !SAFE.has(moved.steps)) {
          if (gpos(p.color, p.steps) === gp) {
            setExplosions(e => [...e, {x: tc*S+S/2, y: tr*S+S/2, id: Date.now()+i}])
            setTimeout(() => setExplosions(e => e.slice(1)), 600)
            newPcs[i] = {...p, steps:-1}
            captured = true
          }
        }
      })
      if (captured) { playTone(150, 300); cur = newPcs; setPieces([...cur]) }
    }

    if (moved.steps >= 57) playTone(880, 400)

    const won = cur.filter(p => p.color === forColor).every(p => p.steps >= 57)
    if (won) { setWinner(forColor); return }

    if (roll === 6) {
      setMsg(forColor==='red' ? '🎯 Rolled 6! Roll again!' : '🤖 Bot rolled 6! Going again...')
      setRolled(false); setDice(0); setMovable([])
      if (forColor === 'blue') botTimer.current = setTimeout(() => triggerBot(cur), 1000)
    } else {
      const next: Color = forColor === 'red' ? 'blue' : 'red'
      setTurn(next); setRolled(false); setDice(0); setMovable([])
      setMsg(next==='red' ? 'Your turn! Roll the dice 🎲' : '🤖 Bot is thinking...')
    }
  }, [])

  const triggerBot = useCallback((pcs: Piece[]) => {
    const val = Math.ceil(Math.random()*6)
    setDice(val)
    const mv = getMovable('blue', val, pcs)
    setMsg(`🤖 Bot rolled ${val}${mv.length===0?' — no moves!':''}`)
    if (!mv.length) {
      botTimer.current = setTimeout(() => {
        setTurn('red'); setDice(0); setMsg('Your turn! Roll the dice 🎲')
      }, 1000)
    } else {
      const pick = mv[Math.floor(Math.random()*mv.length)]
      botTimer.current = setTimeout(() => doMove(pick, val, pcs, 'blue'), 700)
    }
  }, [doMove])

  useEffect(() => {
    if (turn !== 'blue' || rolled || winner) return
    botTimer.current = setTimeout(() => triggerBot(pieces), 1100)
    return () => clearTimeout(botTimer.current)
  }, [turn, rolled, winner, pieces, triggerBot])

  const rollDice = useCallback(() => {
    if (rolling || rolled || turn !== 'red' || winner) return
    setRolling(true)
    let ticks = 0
    ivRef.current = setInterval(() => {
      const v = Math.ceil(Math.random()*6)
      setDice(v)
      playTone(700+v*15, 20)
      if (++ticks > 14) {
        clearInterval(ivRef.current)
        const val = Math.ceil(Math.random()*6)
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
  }, [rolling, rolled, turn, winner, pieces])

  const handlePiece = useCallback((id: string) => {
    if (!rolled || !movable.includes(id)) return
    setMovable([]); setRolled(false)
    doMove(id, dice, pieces, 'red')
  }, [rolled, movable, dice, pieces, doMove])

  const reset = () => {
    clearInterval(ivRef.current); clearTimeout(botTimer.current)
    setPieces(initPieces()); setTurn('red'); setDice(0)
    setRolling(false); setRolled(false); setMovable([])
    setWinner(null); setMsg('Your turn! Roll the dice 🎲'); setExplosions([])
  }

  const onTS = (e: React.TouchEvent) => {
    touchRef.current = {x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now()}
  }
  const onTE = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    const speed = Math.sqrt(dx*dx+dy*dy)/(Date.now()-touchRef.current.t)
    touchRef.current = null
    if (speed > 0.15 || Math.sqrt(dx*dx+dy*dy) > 8) rollDice()
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
      background:'linear-gradient(180deg,#06060f 0%,#0c0a1a 100%)',
      color:'white', padding:'12px 10px', gap:10
    }}>
      {/* Header */}
      <div style={{width:'100%',maxWidth:560,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button onClick={()=>router.push('/games')} style={{background:'none',border:'none',color:'#6b7280',fontSize:14,cursor:'pointer'}}>← Back</button>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:COLORS[turn],boxShadow:`0 0 10px ${COLORS[turn]}`}}/>
          <span style={{fontWeight:700,letterSpacing:4,fontSize:13}}>LUDO</span>
        </div>
        <button onClick={reset} style={{background:'none',border:'none',color:'#818cf8',fontSize:12,cursor:'pointer'}}>Reset</button>
      </div>

      {/* Message bar */}
      <div style={{
        width:'100%', maxWidth:560,
        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:14, padding:'8px 16px', textAlign:'center'
      }}>
        <span style={{fontSize:12,color:'#d1d5db'}}>{msg}</span>
      </div>

      {/* Board */}
      <div style={{width:'100%',maxWidth:560}}>
        <BoardSVG pieces={pieces} movable={movable} onPieceClick={handlePiece} explosions={explosions}/>
      </div>

      {/* Controls */}
      <div style={{width:'100%',maxWidth:560,display:'flex',alignItems:'center',gap:12}}>
        {/* Dice */}
        <DiceSVG
          value={dice} rolling={rolling}
          canRoll={turn==='red'&&!rolled&&!winner}
          onClick={rollDice} onTouchStart={onTS} onTouchEnd={onTE}
        />

        {/* Status bars */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
          {(['red','blue'] as Color[]).map(color=>(
            <div key={color} style={{display:'flex',gap:4,alignItems:'center'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:COLORS[color],marginRight:2,flexShrink:0}}/>
              {pieces.filter(p=>p.color===color).map(p=>{
                const isMov = movable.includes(p.id)
                return (
                  <div key={p.id} onClick={()=>handlePiece(p.id)} style={{
                    flex:1, height:28, borderRadius:8,
                    background: isMov ? COLORS[color] : `${COLORS[color]}20`,
                    border:`1px solid ${isMov?'white':COLORS[color]+'44'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:9,fontWeight:'bold',color:'white',
                    cursor:isMov?'pointer':'default',
                    boxShadow:isMov?`0 0 10px ${COLORS[color]}`:'none',
                    transition:'all 0.2s',
                  }}>
                    {p.steps<0?'🏠':p.steps>=57?'✓':p.steps}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Roll button */}
      {turn==='red'&&!rolled&&!winner&&(
        <button
          onClick={rollDice} disabled={rolling}
          style={{
            width:'100%', maxWidth:560, padding:'14px 0', borderRadius:16,
            background:rolling?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border:'none', color:'white', fontWeight:700, fontSize:15, cursor:rolling?'default':'pointer',
            boxShadow:rolling?'none':'0 4px 20px rgba(99,102,241,0.4)', transition:'all 0.2s',
          }}
        >
          {rolling?'Rolling...':'🎲 Roll Dice'}
        </button>
      )}

      {/* Winner screen */}
      {winner&&(
        <div style={{
          width:'100%', maxWidth:560, padding:28, borderRadius:24, textAlign:'center',
          background:winner==='red'?'rgba(248,113,113,0.1)':'rgba(96,165,250,0.1)',
          border:`2px solid ${COLORS[winner]}`,
        }}>
          <div style={{fontSize:48,marginBottom:8}}>{winner==='red'?'🎉':'🤖'}</div>
          <p style={{fontWeight:700,fontSize:24,color:COLORS[winner],marginBottom:16}}>
            {winner==='red'?'YOU WIN!':'BOT WINS!'}
          </p>
          <button onClick={reset} style={{
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border:'none',color:'white',padding:'12px 32px',
            borderRadius:14,fontWeight:700,fontSize:15,cursor:'pointer',
          }}>Play Again</button>
        </div>
      )}

      <style>{`
        @keyframes diceShake {
          0%{transform:rotate(-15deg) scale(1.1)}
          100%{transform:rotate(15deg) scale(1.1)}
        }
      `}</style>
    </div>
  )
}
