'use client'
import { useRouter } from 'next/navigation'

export default function GamesPage() {
  const router = useRouter()
  const games = [
    { title:'Ludo', desc:'Play vs bot • Multiplayer coming soon', icon:'🎲', path:'/games/ludo' },
    { title:'Tic Tac Toe', desc:'vs Bot or 2 players same phone', icon:'✕○', path:'/games/tictactoe' },
  ]
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#06060f,#0d0a1a)',color:'white',padding:'16px 12px'}}>
      <div style={{maxWidth:400,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h1 style={{fontSize:20,fontWeight:700}}>Games</h1>
          <button onClick={()=>router.push('/dashboard')} style={{background:'none',border:'none',color:'#6b7280',fontSize:14,cursor:'pointer'}}>← Back</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {games.map(g=>(
            <div key={g.path} onClick={()=>router.push(g.path)}
              style={{
                padding:20, borderRadius:20, cursor:'pointer',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.08)',
                display:'flex', alignItems:'center', gap:16,
                transition:'border 0.2s',
              }}
            >
              <div style={{fontSize:36,width:52,textAlign:'center'}}>{g.icon}</div>
              <div>
                <p style={{fontWeight:700,fontSize:16,marginBottom:4}}>{g.title}</p>
                <p style={{color:'#6b7280',fontSize:12}}>{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
