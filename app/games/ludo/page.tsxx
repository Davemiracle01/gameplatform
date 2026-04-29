'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const CS = 22 // cell size px
const BP = CS * 15 // board px

const TRACK: [number,number][] = [
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[6,9],[6,10],[6,11],[6,12],[6,13],
  [6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[8,8],[9,8],[10,8],[11,8],[12,8],
]

const START: Record<string,number> = { red:0, blue:13, green:26, yellow:39 }
const SAFE = new Set([0,8,13,21,26,34,39,47])

const HOME_COL: Record<string,[number,number][]> = {
  red:    [[12,7],[11,7],[10,7],[9,7],[8,7]],
  blue:   [[7,1],[7,2],[7,3],[7,4],[7,5]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
}

const HOME_POS: Record<string,[number,number][]> = {
  red:    [[10,1],[10,3],[12,1],[12,3]],
  blue:   [[1,1],[1,3],[3,1],[3,3]],
  green:  [[1,10],[1,12],[3,10],[3,12]],
  yellow: [[10,10],[10,12],[12,10],[12,12]],
}

const CLR: Record<string,string> = {
  red:'#f87171', blue:'#60a5fa', green:'#4ade80', yellow:'#facc15'
}

type Color = 'red'|'blue'
interface Piece { id:string; color:Color; steps:number }

const gpos = (color:Color, steps:number) => (START[color]+steps)%52

function pieceXY(p:Piece):[number,number] {
  if (p.steps < 0) return HOME_POS[p.color][parseInt(p.id.split('-')[1])]
  if (p.steps >= 57) return [7,7]
  if (p.steps >= 52) return HOME_COL[p.color][p.steps-52]
  return TRACK[gpos(p.color, p.steps)]
}

function canMove(p:Piece, d:number):boolean {
  if (p.steps >= 57) return false
  if (p.steps < 0) return d === 6
  return p.steps + d <= 57
}

function cellBg(r:number, c:number):string {
  if (r<=5&&c<=5) return 'rgba(96,165,250,0.08)'
  if (r<=5&&c>=9) return 'rgba(74,222,128,0.08)'
  if (r>=9&&c<=5) return 'rgba(248,113,113,0.08)'
  if (r>=9&&c>=9) return 'rgba(250,204,21,0.08)'
  const ti = TRACK.findIndex(([tr,tc])=>tr===r&&tc===c)
  if (ti>=0) {
    if (ti===START.red) return 'rgba(248,113,113,0.35)'
    if (ti===START.blue) return 'rgba(96,165,250,0.35)'
    if (ti===START.green) return 'rgba(74,222,128,0.35)'
    if (ti===START.yellow) return 'rgba(250,204,21,0.35)'
    if (SAFE.has(ti)) return 'rgba(255,255,255,0.12)'
    return 'rgba(255,255,255,0.05)'
  }
  for (const [col,cells] of Object.entries(HOME_COL))
    if (cells.some(([cr,cc])=>cr===r&&cc===c)) return CLR[col]+'22'
  if (r===7&&c===7) return 'rgba(255,255,255,0.18)'
  return 'rgba(255,255,255,0.03)'
}

const initPieces = ():Piece[] => [
  ...Array(4).fill(0).map((_,i)=>({id:`red-${i}`,color:'red' as Color,steps:-1})),
  ...Array(4).fill(0).map((_,i)=>({id:`blue-${i}`,color:'blue' as Color,steps:-1})),
]

export default function LudoGame() {
  const router = useRouter()
  const [pieces, setPieces] = useState<Piece[]>(initPieces)
  const [turn, setTurn] = useState<Color>('red')
  const [dice, setDice] = useState(0)
  const [rolled, setRolled] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [movable, setMovable] = useState<string[]>([])
  const [winner, setWinner] = useState<Color|null>(null)
  const [msg, setMsg] = useState('Your turn! Tap or fling the dice 🎲')
  const [highlight, setHighlight] = useState<string|null>(null)
  const ivRef = useRef<any>(null)
  const touchStart = useRef<{x:number,y:number,t:number}|null>(null)

  const getMovable = useCallback((color:Color, roll:number, pcs:Piece[]) =>
    pcs.filter(p=>p.color===color&&canMove(p,roll)).map(p=>p.id)
  ,[])

  const applyMove = useCallback((pieceId:string, roll:number, pcs:Piece[]):Piece[] => {
    const updated = pcs.map(p => {
      if (p.id !== pieceId) return p
      const ns = p.steps < 0 ? 0 : Math.min(p.steps+roll, 57)
      return {...p, steps:ns}
    })
    const moved = updated.find(p=>p.id===pieceId)!
    if (moved.steps>=0 && moved.steps<52) {
      const gp = gpos(moved.color, moved.steps)
      if (!SAFE.has(moved.steps)) {
        updated.forEach((p,i)=>{
          if (p.color!==moved.color && p.steps>=0 && p.steps<52)
            if (gpos(p.color,p.steps)===gp) updated[i]={...p,steps:-1}
        })
      }
    }
    return updated
  },[])

  const startRoll = useCallback((forColor:Color, curPieces:Piece[]) => {
    if (ivRef.current) clearInterval(ivRef.current)
    setRolling(true)
    let n = 0
    ivRef.current = setInterval(()=>{
      setDice(Math.ceil(Math.random()*6))
      if (++n > 12) {
        clearInterval(ivRef.current)
        const val = Math.ceil(Math.random()*6)
        setDice(val)
        setRolling(false)
        setRolled(true)
        const mv = getMovable(forColor, val, curPieces)
        setMovable(mv)
        if (mv.length===0) {
          setMsg(`${forColor==='red'?'You':'Bot'} rolled ${val} — no moves!`)
          setTimeout(()=>{
            setTurn(t=>t==='red'?'blue':'red')
            setRolled(false); setDice(0); setMovable([])
          },1400)
        } else if (forColor==='red') {
          setMsg(`Rolled ${val}! Tap a glowing piece ✨`)
        }
      }
    },60)
  },[getMovable])

  const rollDice = useCallback(()=>{
    if (rolled||rolling||winner||turn!=='red') return
    startRoll('red', pieces)
  },[rolled,rolling,winner,turn,pieces,startRoll])

  const movePiece = useCallback((pid:string)=>{
    if (!rolled||!movable.includes(pid)) return
    setHighlight(pid)
    setTimeout(()=>setHighlight(null),400)
    const newPieces = applyMove(pid, dice, pieces)
    setPieces(newPieces)
    const won = newPieces.filter(p=>p.color===turn).every(p=>p.steps>=57)
    if (won) { setWinner(turn); return }
    if (dice===6) {
      setRolled(false); setDice(0); setMovable([])
      setMsg('🎯 Rolled 6! Roll again!')
    } else {
      setTurn('blue'); setRolled(false); setDice(0); setMovable([])
      setMsg('🤖 Bot is thinking...')
    }
  },[rolled,movable,dice,pieces,turn,applyMove])

  // Bot turn
  useEffect(()=>{
    if (turn!=='blue'||rolled||winner) return
    const t = setTimeout(()=>startRoll('blue', pieces), 1000)
    return ()=>clearTimeout(t)
  },[turn,rolled,winner,pieces])

  useEffect(()=>{
    if (turn!=='blue'||!rolled||winner||movable.length===0) return
    const t = setTimeout(()=>{
      const pid = movable[Math.floor(Math.random()*movable.length)]
      setHighlight(pid)
      const newPieces = applyMove(pid, dice, pieces)
      setPieces(newPieces)
      setTimeout(()=>setHighlight(null),400)
      const won = newPieces.filter(p=>p.color==='blue').every(p=>p.steps>=57)
      if (won) { setWinner('blue'); return }
      if (dice===6) {
        setRolled(false); setDice(0); setMovable([])
      } else {
        setTurn('red'); setRolled(false); setDice(0); setMovable([])
        setMsg('Your turn! Tap or fling the dice 🎲')
      }
    },800)
    return ()=>clearTimeout(t)
  },[turn,rolled,movable,dice,winner,pieces])

  const onTouchStart = (e:React.TouchEvent)=>{
    touchStart.current = {x:e.touches[0].clientX, y:e.touches[0].clientY, t:Date.now()}
  }
  const onTouchEnd = (e:React.TouchEvent)=>{
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX-touchStart.current.x
    const dy = e.changedTouches[0].clientY-touchStart.current.y
    const dt = Date.now()-touchStart.current.t
    const speed = Math.sqrt(dx*dx+dy*dy)/dt
    touchStart.current = null
    if (speed > 0.3 || Math.sqrt(dx*dx+dy*dy) > 15) rollDice()
    else rollDice()
  }

  const reset = ()=>{
    if (ivRef.current) clearInterval(ivRef.current)
    setPieces(initPieces()); setTurn('red'); setDice(0)
    setRolled(false); setRolling(false); setMovable([])
    setWinner(null); setMsg('Your turn! Tap or fling the dice 🎲')
  }

  const DE = ['','⚀','⚁','⚂','⚃','⚄','⚅']

  return (
    <div className="min-h-screen text-white flex flex-col items-center" style={{background:'linear-gradient(135deg,#08080f,#0d0d1a)'}}>
      <div className="w-full max-w-sm p-3 flex flex-col gap-3">

        <div className="flex justify-between items-center">
          <button onClick={()=>router.push('/games')} className="text-gray-500 text-sm">←</button>
          <div className="flex items-center gap-2">
            <div style={{width:8,height:8,borderRadius:'50%',background:CLR[turn],boxShadow:`0 0 8px ${CLR[turn]}`}} />
            <span className="font-bold tracking-widest text-sm">LUDO</span>
          </div>
          <button onClick={reset} className="text-indigo-400 text-xs">Reset</button>
        </div>

        <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}} className="px-4 py-2 rounded-2xl text-center">
          <p className="text-xs text-gray-300">{msg}</p>
        </div>

        {/* Board */}
        <div style={{position:'relative',width:BP,height:BP,margin:'0 auto',borderRadius:12,overflow:'hidden',background:'#080810'}}>
          {/* Grid cells */}
          {Array.from({length:15},(_,r)=>Array.from({length:15},(_,c)=>(
            <div key={`${r}-${c}`} style={{
              position:'absolute', left:c*CS+1, top:r*CS+1,
              width:CS-2, height:CS-2, borderRadius:2,
              background:cellBg(r,c),
            }}>
              {(() => {
                const ti = TRACK.findIndex(([tr,tc])=>tr===r&&tc===c)
                if (ti>=0&&SAFE.has(ti)&&!Object.values(START).includes(ti))
                  return <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,opacity:0.4}}>★</div>
                if (r===7&&c===7)
                  return <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>🏠</div>
                return null
              })()}
            </div>
          ))).flat()}

          {/* Pieces */}
          {pieces.map(p=>{
            const [row,col] = pieceXY(p)
            const mv = movable.includes(p.id)
            const hl = highlight===p.id
            return (
              <div
                key={p.id}
                onClick={()=>movePiece(p.id)}
                style={{
                  position:'absolute',
                  left:col*CS+CS*0.15, top:row*CS+CS*0.15,
                  width:CS*0.7, height:CS*0.7,
                  borderRadius:'50%',
                  background: p.steps>=57 ? 'rgba(255,255,255,0.15)' : CLR[p.color],
                  border: mv ? '1.5px solid white' : '1px solid rgba(0,0,0,0.3)',
                  boxShadow: hl ? `0 0 20px ${CLR[p.color]}` : mv ? `0 0 10px ${CLR[p.color]}88, 0 0 20px ${CLR[p.color]}44` : '0 1px 3px rgba(0,0,0,0.5)',
                  cursor: mv ? 'pointer' : 'default',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:CS*0.28, fontWeight:'bold', color:'white',
                  opacity: p.steps>=57 ? 0.35 : 1,
                  zIndex: mv ? 20 : 10,
                  transition:'left 0.35s cubic-bezier(.25,.1,.25,1), top 0.35s cubic-bezier(.25,.1,.25,1), box-shadow 0.2s, transform 0.15s',
                  transform: hl ? 'scale(1.4)' : mv ? 'scale(1.1)' : 'scale(1)',
                  animation: mv ? 'piece-pulse 0.9s ease-in-out infinite' : 'none',
                }}
              >
                {p.steps>=57 ? '✓' : parseInt(p.id.split('-')[1])+1}
              </div>
            )
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Dice */}
          <div
            onClick={rollDice}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{
              width:64, height:64, flexShrink:0,
              background: rolling
                ? `conic-gradient(${CLR.red},${CLR.blue},${CLR.green},${CLR.yellow},${CLR.red})`
                : dice>0 ? `radial-gradient(circle at center, rgba(255,255,255,0.15), rgba(255,255,255,0.05))`
                : 'rgba(255,255,255,0.07)',
              border:`2px solid ${rolled ? CLR.red : rolling ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
              borderRadius:16,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:32,
              cursor: (turn==='red'&&!rolled&&!winner) ? 'pointer' : 'default',
              boxShadow: rolled ? `0 0 20px ${CLR.red}66` : rolling ? '0 0 30px rgba(99,102,241,0.6)' : 'none',
              transition:'all 0.15s',
              animation: rolling ? 'dice-shake 0.12s linear infinite' : 'none',
              userSelect:'none', WebkitUserSelect:'none',
              opacity: (turn==='blue'||!!winner) ? 0.5 : 1,
            }}
          >
            {dice===0 ? '🎲' : DE[dice]}
          </div>

          <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',gap:4}}>
              {pieces.filter(p=>p.color==='red').map(p=>(
                <div key={p.id} onClick={()=>movePiece(p.id)} style={{
                  flex:1, height:28,
                  background: movable.includes(p.id) ? CLR.red : 'rgba(248,113,113,0.12)',
                  border:`1px solid ${movable.includes(p.id)?'white':'rgba(248,113,113,0.25)'}`,
                  borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight:'bold', color:'white',
                  cursor: movable.includes(p.id)?'pointer':'default',
                  boxShadow: movable.includes(p.id)?`0 0 10px ${CLR.red}`:'none',
                  transition:'all 0.2s',
                }}>
                  {p.steps<0?'🏠':p.steps>=57?'✓':p.steps}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:4}}>
              {pieces.filter(p=>p.color==='blue').map(p=>(
                <div key={p.id} style={{
                  flex:1, height:28,
                  background:'rgba(96,165,250,0.12)',
                  border:'1px solid rgba(96,165,250,0.25)',
                  borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, color:CLR.blue,
                }}>
                  {p.steps<0?'🤖':p.steps>=57?'✓':p.steps}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        {!winner && !rolled && turn==='red' && (
          <p className="text-center text-gray-600 text-xs">Tap dice to roll · Fling it for extra luck 😄</p>
        )}

        {winner && (
          <div style={{
            background: winner==='red' ? 'rgba(248,113,113,0.1)' : 'rgba(96,165,250,0.1)',
            border:`2px solid ${CLR[winner]}`,
            borderRadius:20, padding:20, textAlign:'center'
          }}>
            <p style={{fontSize:28, marginBottom:4}}>{winner==='red'?'🎉':'🤖'}</p>
            <p style={{fontWeight:'bold', fontSize:18, color:CLR[winner], marginBottom:12}}>
              {winner==='red'?'YOU WIN!':'BOT WINS!'}
            </p>
            <button onClick={reset} style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'white',padding:'8px 24px',borderRadius:12,fontWeight:'bold',fontSize:14,cursor:'pointer'}}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes piece-pulse {
          0%,100% { transform:scale(1.1); }
          50% { transform:scale(1.25); }
        }
        @keyframes dice-shake {
          0%,100% { transform:rotate(-12deg) scale(1.05); }
          50% { transform:rotate(12deg) scale(1.05); }
        }
      `}</style>
    </div>
  )
           }
