'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

type Color = 'red' | 'green' | 'blue' | 'yellow';

interface Player {
  id: number;
  name: string;
  color: Color;
}

interface Piece {
  id: string;
  playerId: number;
  color: Color;
  steps: number;
}

// ─── Your Original Constants (kept) ─────────────────────────────────
const COLORS: Record<Color, string> = {
  red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#eab308'
};

const HOME_SLOTS: Record<Color, [number, number][]> = {
  red: [[1,1],[1,3],[3,1],[3,3]],
  green: [[1,11],[1,13],[3,11],[3,13]],
  blue: [[11,11],[11,13],[13,11],[13,13]],
  yellow: [[11,1],[11,3],[13,1],[13,3]],
};

const TRACK: [number, number][] = [ /* paste your full TRACK here from original */ ];
const HOME_PATH: Record<Color, [number, number][]> = { /* paste your full HOME_PATH */ };
const START_POS: Record<Color, number> = { red: 0, green: 13, blue: 26, yellow: 39 };
const SAFE_SPOTS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Fill these with your original arrays (copy from your old page.tsx)
const FULL_TRACK = [/* ... your long TRACK array ... */]; // I'll remind you to fill if needed

// ─── Better Dice Component ─────────────────────────────────
function RealisticDice({ value, onRoll, isRolling }: { 
  value: number; 
  onRoll: () => void; 
  isRolling: boolean;
}) {
  const diceRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (isRolling) return;
    
    // Push down effect
    if (diceRef.current) {
      diceRef.current.style.transform = 'scale(0.85) rotateX(20deg) rotateY(30deg)';
    }

    setTimeout(() => onRoll(), 80);
  };

  return (
    <div 
      ref={diceRef}
      onClick={handleClick}
      className={`w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center cursor-pointer select-none transition-all duration-200 border-4 border-amber-900 ${isRolling ? 'animate-bounce' : 'hover:scale-110 active:scale-95'}`}
      style={{ 
        boxShadow: '10px 20px 30px rgba(0,0,0,0.6), inset 0 8px 12px rgba(255,255,255,0.8)',
        transformStyle: 'preserve-3d'
      }}
    >
      <div className="text-8xl font-black text-black drop-shadow-md">
        {value}
      </div>
    </div>
  );
}

// Main Game Component
export default function ClassicLudoPlay() {
  const searchParams = useSearchParams();
  
  const roomCode = searchParams.get('room') || '';
  const playerName = searchParams.get('name') || 'Player';
  const playerColor = (searchParams.get('color') as Color) || 'red';

  const [gamePhase, setGamePhase] = useState<'playing' | 'finished'>('playing');
  const [dice, setDice] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);

  // TODO: We'll expand this with full logic from your original game
  const players: Player[] = [
    { id: 0, name: playerName, color: playerColor },
    { id: 1, name: "Friend 2", color: 'green' },
    { id: 2, name: "Friend 3", color: 'blue' },
    { id: 3, name: "Friend 4", color: 'yellow' },
  ];

  const rollDice = async () => {
    setIsRolling(true);

    // Rolling animation
    for (let i = 0; i < 15; i++) {
      setDice(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 50));
    }

    const final = Math.floor(Math.random() * 6) + 1;
    setDice(final);
    
    setTimeout(() => {
      setIsRolling(false);
      // TODO: Later we will check if current player can move etc.
      console.log(`Rolled: ${final}`);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0a0703] text-white pb-20">
      {/* Header */}
      <div className="bg-black/80 border-b border-amber-900 p-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-4xl font-black text-amber-400 tracking-wider">LUDO</h1>
          <p className="text-xs text-amber-300/70">Room: <span className="font-mono text-amber-400">{roomCode}</span></p>
        </div>
        <div className="text-right">
          <p className="text-sm">You are</p>
          <p className="font-bold" style={{color: COLORS[playerColor]}}>{playerName}</p>
        </div>
      </div>

      {/* Dice Area */}
      <div className="flex justify-center mt-8 mb-6">
        <RealisticDice 
          value={dice} 
          onRoll={rollDice} 
          isRolling={isRolling} 
        />
      </div>

      <p className="text-center text-amber-300/70 text-sm mb-8">
        {isRolling ? "Rolling..." : "Tap the dice to roll"}
      </p>

      {/* Board will go here later */}
      <div className="flex justify-center">
        <div className="text-center text-amber-400/30 text-xl py-20 border border-dashed border-amber-900 rounded-3xl w-[90%] max-w-[500px]">
          🎮 Classic Board Coming Next Step
          <br />
          <span className="text-sm">Your original beautiful board will be placed here</span>
        </div>
      </div>

      {/* Players List */}
      <div className="px-6 mt-8">
        <p className="text-amber-300 mb-3 text-sm font-bold">PLAYERS</p>
        {players.map((p, i) => (
          <div 
            key={i}
            className={`flex items-center gap-3 p-4 rounded-2xl mb-2 ${i === currentTurn ? 'bg-amber-400/10 border border-amber-400' : 'bg-black/40'}`}
          >
            <div className="w-8 h-8 rounded-full" style={{backgroundColor: COLORS[p.color]}} />
            <span className="font-medium">{p.name}</span>
            {i === 0 && <span className="text-xs ml-auto text-amber-400">(You)</span>}
          </div>
        ))}
      </div>
    </div>
  );
        }
