'use client';

import React, { useState } from 'react';

type Color = 'red' | 'green' | 'blue' | 'yellow';

export default function ClassicLudoLobby() {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('Demon');
  const [selectedColor, setSelectedColor] = useState<Color>('red');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const createRoom = async () => {
    setLoading(true);
    setError('');
    
    const newCode = generateRoomCode();
    
    // For now we'll just go to play page (we'll connect Supabase properly next)
    window.location.href = `/games/ludo/play?room=\( {newCode}&name= \){encodeURIComponent(playerName)}&color=${selectedColor}&mode=create`;
  };

  const joinRoom = () => {
    if (roomCode.length < 5) {
      setError("Please enter a valid room code");
      return;
    }
    setLoading(true);
    window.location.href = `/games/ludo/play?room=\( {roomCode.toUpperCase()}&name= \){encodeURIComponent(playerName)}&color=${selectedColor}&mode=join`;
  };

  return (
    <div className="min-h-screen bg-[#0f0a05] text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-7xl font-black tracking-widest text-amber-400 mb-2">LUDO</h1>
          <p className="text-2xl text-amber-300/80">Classic</p>
        </div>

        {mode === 'menu' && (
          <div className="space-y-4">
            <button 
              onClick={() => setMode('create')}
              className="w-full py-6 text-xl font-bold bg-red-600 hover:bg-red-700 rounded-2xl transition"
            >
              Create New Game
            </button>
            <button 
              onClick={() => setMode('join')}
              className="w-full py-6 text-xl font-bold border-2 border-white/40 hover:bg-white/10 rounded-2xl transition"
            >
              Join Existing Game
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="bg-[#1a140f] border border-amber-900/50 rounded-3xl p-8">
            <button onClick={() => setMode('menu')} className="text-amber-400 mb-6">← Back</button>
            
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-black/60 border border-amber-900 rounded-xl px-5 py-4 text-lg mb-6"
            />

            <div className="mb-8">
              <p className="text-amber-300/70 mb-3">Choose Color</p>
              <div className="flex gap-4 justify-center">
                {(['red', 'green', 'blue', 'yellow'] as Color[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-16 h-16 rounded-2xl border-4 transition-all ${selectedColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c === 'red' ? '#ef4444' : c === 'green' ? '#22c55e' : c === 'blue' ? '#3b82f6' : '#eab308' }}
                  />
                ))}
              </div>
            </div>

            {mode === 'create' && (
              <button
                onClick={createRoom}
                disabled={loading || !playerName.trim()}
                className="w-full py-5 bg-green-600 hover:bg-green-700 rounded-2xl text-xl font-bold disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            )}

            {mode === 'join' && (
              <>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  className="w-full text-center text-3xl tracking-[8px] bg-black/60 border border-amber-900 rounded-xl px-5 py-6 mb-6"
                />
                <button
                  onClick={joinRoom}
                  disabled={loading || roomCode.length < 5}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-xl font-bold disabled:opacity-50"
                >
                  Join Game
                </button>
              </>
            )}

            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
