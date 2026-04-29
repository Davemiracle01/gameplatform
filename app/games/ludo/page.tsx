'use client'
import { useState, useEffect, useRef } from 'react'

const CS = 26
const BP = CS * 15

type Color = 'red' | 'blue'
interface Piece { id: string; color: Color; steps: number }

// ---------- BOARD ----------
const TRACK: [number, number][] = [
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[6,9],[6,10],[6,11],[6,12],[6,13],
  [6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[8,8],[9,8],[10,8],[11,8],[12,8],
]

const START = { red: 0, blue: 13 }
const SAFE = new Set([0,8,13,21,26,34,39,47])

const CLR = {
  red: '#ff4d6d',
  blue: '#4dabf7'
}

// ---------- INIT ----------
const initPieces = (): Piece[] =>
  ['red','blue'].flatMap(c =>
    Array.from({ length: 4 }, (_, i) => ({
      id: `${c}-${i}`,
      color: c as Color,
      steps: -1
    }))
  )

const gpos = (c: Color, s: number) => (START[c] + s) % 52

// ---------- COMPONENT ----------
export default function LudoPage() {
  const [pieces, setPieces] = useState(initPieces)
  const [turn, setTurn] = useState<Color>('red')
  const [dice, setDice] = useState(0)
  const [rolling, setRolling] = useState(false)
  const [rolled, setRolled] = useState(false)
  const [movable, setMovable] = useState<string[]>([])
  const [winner, setWinner] = useState<Color | null>(null)
  const [explosions, setExplosions] = useState<{x:number,y:number,id:number}[]>([])

  const intervalRef = useRef<any>(null)

  // ---------- SOUND ----------
  const play = (f: number, d = 100) => {
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = f
    o.start()
    g.gain.setValueAtTime(0.2, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d/1000)
    o.stop(ctx.currentTime + d/1000)
  }

  // ---------- HELPERS ----------
  const canMove = (p: Piece, d: number) =>
    p.steps < 0 ? d === 6 : p.steps + d <= 57

  const getMovable = (color: Color, roll: number, pcs: Piece[]) =>
    pcs.filter(p => p.color === color && canMove(p, roll)).map(p => p.id)

  const getXY = (p: Piece): [number, number] => {
    if (p.steps < 0) return [7,7]
    if (p.steps >= 52) return [7,7]
    return TRACK[gpos(p.color, p.steps)]
  }

  // ---------- ANIMATED MOVE ----------
  const movePiece = async (id: string, roll: number) => {
    let newPieces = [...pieces]

    for (let i = 0; i < roll; i++) {
      newPieces = newPieces.map(p => {
        if (p.id !== id) return p
        return { ...p, steps: p.steps < 0 ? 0 : p.steps + 1 }
      })

      setPieces([...newPieces])
      play(700, 40)
      await new Promise(r => setTimeout(r, 90))
    }

    // capture
    const moved = newPieces.find(p => p.id === id)!
    if (moved.steps < 52) {
      const gp = gpos(moved.color, moved.steps)

      newPieces.forEach((p, i) => {
        if (p.color !== moved.color && p.steps >= 0 && p.steps < 52) {
          if (gpos(p.color, p.steps) === gp && !SAFE.has(moved.steps)) {

            const [r,c] = TRACK[gp]
            setExplosions(e => [...e, { x:c*CS, y:r*CS, id:Date.now() }])

            setTimeout(() => {
              setExplosions(e => e.slice(1))
            }, 400)

            newPieces[i] = { ...p, steps: -1 }
            play(200, 200)
          }
        }
      })
    }

    setPieces([...newPieces])

    const win = newPieces.filter(p => p.color === turn).every(p => p.steps >= 57)
    if (win) setWinner(turn)

    if (dice !== 6) setTurn(turn === 'red' ? 'blue' : 'red')
    setRolled(false)
  }

  // ---------- ROLL ----------
  const rollDice = () => {
    if (rolling || rolled || turn !== 'red' || winner) return

    setRolling(true)
    let ticks = 0

    intervalRef.current = setInterval(() => {
      setDice(Math.ceil(Math.random()*6))
      play(900, 20)

      if (++ticks > 12) {
        clearInterval(intervalRef.current)
        const val = Math.ceil(Math.random()*6)

        setDice(val)
        setRolling(false)
        setRolled(true)

        const mv = getMovable('red', val, pieces)
        setMovable(mv)

        if (!mv.length) setTimeout(()=>setTurn('blue'),600)
      }
    },60)
  }

  // ---------- BOT ----------
  useEffect(()=>{
    if (turn!=='blue'||rolled||winner) return

    const t = setTimeout(async ()=>{
      const val = Math.ceil(Math.random()*6)
      setDice(val)

      const mv = getMovable('blue', val, pieces)

      if (mv.length) {
        const pick = mv[Math.floor(Math.random()*mv.length)]
        await movePiece(pick,val)
      } else setTurn('red')

    },800)

    return ()=>clearTimeout(t)
  },[turn,rolled,pieces])

  // ---------- UI ----------
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#06060f] text-white">

      {/* BOARD */}
      <div style={{ width: BP, height: BP, position:'relative' }}>

        {/* pieces */}
        {pieces.map(p=>{
          const [r,c] = getXY(p)
          const active = movable.includes(p.id)

          return (
            <div
              key={p.id}
              onClick={()=>active && movePiece(p.id,dice)}
              style={{
                position:'absolute',
                left:c*CS,
                top:r*CS,
                width:CS,
                height:CS,
                borderRadius:'50%',
                background:CLR[p.color],

                transform: active ? 'scale(1.25)' : 'scale(1)',
                transition:'all .25s cubic-bezier(.34,1.56,.64,1)',

                boxShadow: active
                  ? `0 0 20px ${CLR[p.color]}`
                  : '0 2px 6px rgba(0,0,0,0.6)',

                cursor: active?'pointer':'default'
              }}
            />
          )
        })}

        {/* explosions */}
        {explosions.map(e=>(
          <div key={e.id} style={{
            position:'absolute',
            left:e.x,
            top:e.y,
            width:30,
            height:30,
            borderRadius:'50%',
            background:'radial-gradient(circle, #fff, transparent)',
            animation:'boom .4s ease-out'
          }}/>
        ))}
      </div>

      {/* DICE */}
      <div
        onClick={rollDice}
        style={{
          marginTop:20,
          width:70,
          height:70,
          borderRadius:16,
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          fontSize:32,

          background: rolling
            ? 'linear-gradient(135deg,#ff4d6d,#4dabf7)'
            : 'rgba(255,255,255,0.08)',

          animation: rolling ? 'dice .5s linear infinite':'none',
          cursor:'pointer'
        }}
      >
        {dice||'🎲'}
      </div>

      {/* WIN */}
      {winner && (
        <div className="mt-4 text-xl">
          {winner==='red'?'YOU WIN 🎉':'BOT WINS 🤖'}
        </div>
      )}

      <style>{`
        @keyframes dice {
          0%{transform:rotate(0)}
          100%{transform:rotate(360deg)}
        }

        @keyframes boom {
          0%{transform:scale(.5);opacity:1}
          100%{transform:scale(2);opacity:0}
        }
      `}</style>
    </div>
  )
}
