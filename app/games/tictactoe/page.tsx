'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Cell = 'X' | 'O' | null
type Mode = 'select' | 'pvp' | 'bot'

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
]

function checkWinner(board: Cell[]): { winner: Cell; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a,b,c] = line
    if (board[a] && board[a]===board[b] && board[a]===board[c])
      return { winner: board[a], line }
  }
  return null
}

function getBotMove(board: Cell[]): number {
  // Try to win
  for (const [a,b,c] of WIN_LINES) {
    if (board[a]==='O'&&board[b]==='O'&&board[c]===null) return c
    if (board[a]==='O'&&board[c]==='O'&&board[b]===null) return b
    if (board[b]==='O'&&board[c]==='O'&&board[a]===null) return a
  }
  // Block player
  for (const [a,b,c] of WIN_LINES) {
    if (board[a]==='X'&&board[b]==='X'&&board[c]===null) return c
    if (board[a]==='X'&&board[c]==='X'&&board[b]===null) return b
    if (board[b]==='X'&&board[c]==='X'&&board[a]===null) return a
  }
  // Take center
  if (board[4]===null) return 4
  // Take corners
  const corners = [0,2,6,8].filter(i=>board[i]===null)
  if (corners.length) return corners[Math.floor(Math.random()*corners.length)]
  // Take any
  const empty = board.map((c,i)=>c===null?i:-1).filter(i=>i>=0)
  return empty[Math.floor(Math.random()*empty.length)]
}

export default function TicTacToe() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('select')
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [turn, setTurn] = useState<'X'|'O'>('X')
  const [result, setResult] = useState<{winner:Cell,line:number[]}|'draw'|null>(null)
  const [scores, setScores] = useState({X:0,O:0,draw:0})
  const [botThinking, setBotThinking] = useState(false)
  const [winLine, setWinLine] = useState<number[]>([])

  const reset = () => {
    setBoard(Array(9).fill(null))
    setTurn('X')
    setResult(null)
    setWinLine([])
    setBotThinking(false)
  }

  const handleClick = (i: number) => {
    if (board[i] || result || botThinking) return
    if (mode==='bot' && turn==='O') return

    const newBoard = [...board]
    newBoard[i] = turn
    setBoard(newBoard)

    const win = checkWinner(newBoard)
    if (win) {
      setResult(win)
      setWinLine(win.line)
      setScores(s=>({...s, [win.winner!]: s[win.winner as 'X'|'O']+1}))
      return
    }
    if (newBoard.every(c=>c!==null)) {
      setResult('draw')
      setScores(s=>({...s, draw:s.draw+1}))
      return
    }
    setTurn(t=>t==='X'?'O':'X')
  }

  // Bot move
  useEffect(()=>{
    if (mode!=='bot'||turn!=='O'||result||botThinking) return
    setBotThinking(true)
    const t = setTimeout(()=>{
      const move = getBotMove(board)
      const newBoard = [...board]
      newBoard[move] = 'O'
      setBoard(newBoard)
      setBotThinking(false)
      const win = checkWinner(newBoard)
      if (win) {
        setResult(win); setWinLine(win.line)
        setScores(s=>({...s, O:s.O+1}))
        return
      }
      if (newBoard.every(c=>c!==null)) {
        setResult('draw'); setScores(s=>({...s, draw:s.draw+1}))
        return
      }
      setTurn('X')
    }, 600)
    return ()=>clearTimeout(t)
  },[turn,mode,result])

  const cellStyle = (i: number) => {
    const val = board[i]
    const isWin = winLine.includes(i)
    return {
      width:'100%', aspectRatio:'1',
      background: isWin
        ? val==='X' ? 'rgba(99,102,241,0.3)' : 'rgba(248,113,113,0.3)'
        : 'rgba(255,255,255,0.04)',
      border: isWin
        ? `2px solid ${val==='X'?'#6366f1':'#f87171'}`
        : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: 42, fontWeight: 700, cursor: (!val&&!result&&!botThinking)?'pointer':'default',
      color: val==='X' ? '#818cf8' : '#f87171',
      transition: 'all 0.15s',
      boxShadow: isWin ? `0 0 20px ${val==='X'?'rgba(99,102,241,0.4)':'rgba(248,113,113,0.4)'}` : 'none',
    } as React.CSSProperties
  }

  if (mode==='select') {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#06060f,#0d0a1a)',color:'white',padding:20,gap:16}}>
        <button onClick={()=>router.push('/games')} style={{position:'absolute',top:20,left:20,background:'none',border:'none',color:'#6b7280',fontSize:14,cursor:'pointer'}}>← Back</button>
        <div style={{fontSize:48,marginBottom:8}}>✕ ○</div>
        <h1 style={{fontSize:26,fontWeight:700,letterSpacing:2,marginBottom:4}}>TIC TAC TOE</h1>
        <p style={{color:'#6b7280',fontSize:13,marginBottom:24}}>Pick a game mode</p>
        <button
          onClick={()=>{setMode('bot');reset()}}
          style={{width:'100%',maxWidth:320,padding:'18px 0',borderRadius:18,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'white',fontWeight:700,fontSize:16,cursor:'pointer',boxShadow:'0 4px 20px rgba(99,102,241,0.4)'}}
        >
          🤖 Play vs Bot
        </button>
        <button
          onClick={()=>{setMode('pvp');reset()}}
          style={{width:'100%',maxWidth:320,padding:'18px 0',borderRadius:18,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'white',fontWeight:700,fontSize:16,cursor:'pointer'}}
        >
          👥 2 Players (Same Phone)
        </button>
      </div>
    )
  }

  const statusMsg = () => {
    if (botThinking) return '🤖 Bot is thinking...'
    if (!result) {
      if (mode==='bot') return turn==='X' ? 'Your turn (X)' : 'Bot\'s turn (O)'
      return `Player ${turn==='X'?1:2}'s turn (${turn})`
    }
    if (result==='draw') return "It's a draw!"
    if (mode==='bot') return result.winner==='X' ? '🎉 You win!' : '🤖 Bot wins!'
    return `🎉 Player ${result.winner==='X'?1:2} wins!`
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',background:'linear-gradient(135deg,#06060f,#0d0a1a)',color:'white',padding:'16px 12px',gap:12}}>

      {/* Header */}
      <div style={{width:'100%',maxWidth:380,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button onClick={()=>setMode('select')} style={{background:'none',border:'none',color:'#6b7280',fontSize:14,cursor:'pointer'}}>← Menu</button>
        <span style={{fontWeight:700,letterSpacing:3,fontSize:13}}>TIC TAC TOE</span>
        <button onClick={reset} style={{background:'none',border:'none',color:'#818cf8',fontSize:12,cursor:'pointer'}}>New Game</button>
      </div>

      {/* Scores */}
      <div style={{width:'100%',maxWidth:380,display:'flex',gap:8}}>
        {[
          {label: mode==='bot'?'You':'P1', key:'X', color:'#818cf8'},
          {label:'Draw', key:'draw', color:'#6b7280'},
          {label: mode==='bot'?'Bot':'P2', key:'O', color:'#f87171'},
        ].map(s=>(
          <div key={s.key} style={{
            flex:1, padding:'10px 0', borderRadius:14, textAlign:'center',
            background:'rgba(255,255,255,0.04)', border:`1px solid ${s.color}33`
          }}>
            <div style={{fontSize:22,fontWeight:700,color:s.color}}>{scores[s.key as keyof typeof scores]}</div>
            <div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{
        width:'100%',maxWidth:380,
        background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:14,padding:'10px 16px',textAlign:'center'
      }}>
        <span style={{fontSize:13,fontWeight:600,color: result&&result!=='draw' ? (result.winner==='X'?'#818cf8':'#f87171') : '#d1d5db'}}>
          {statusMsg()}
        </span>
      </div>

      {/* Board */}
      <div style={{width:'100%',maxWidth:380,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:4}}>
        {board.map((cell,i)=>(
          <div key={i} style={cellStyle(i)} onClick={()=>handleClick(i)}>
            {cell && (
              <span style={{
                display:'block',
                animation: 'popIn 0.15s cubic-bezier(.34,1.56,.64,1)',
              }}>
                {cell}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Play again */}
      {result && (
        <button
          onClick={reset}
          style={{
            width:'100%',maxWidth:380,padding:'14px 0',borderRadius:16,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border:'none',color:'white',fontWeight:700,fontSize:15,cursor:'pointer',
            boxShadow:'0 4px 20px rgba(99,102,241,0.4)',
          }}
        >
          Play Again
        </button>
      )}

      <style>{`
        @keyframes popIn {
          0%{transform:scale(0) rotate(-10deg);opacity:0}
          100%{transform:scale(1) rotate(0deg);opacity:1}
        }
      `}</style>
    </div>
  )
    }
