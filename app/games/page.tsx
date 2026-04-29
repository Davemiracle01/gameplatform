'use client'
import { useRouter } from 'next/navigation'

export default function GamesPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen text-white p-4" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)' }}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Games</h1>
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm">← Back</button>
        </div>
        <div
          onClick={() => router.push('/games/ludo')}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          className="p-6 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all"
        >
          <div className="text-4xl mb-3">🎲</div>
          <h2 className="text-lg font-bold mb-1">Ludo</h2>
          <p className="text-gray-500 text-sm">Play vs bot • Multiplayer coming soon</p>
        </div>
      </div>
    </div>
  )
}
