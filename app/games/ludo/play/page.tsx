'use client';

import React, { useState, useEffect, useRef } from 'react';
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
const COLORS: Record<Color, string> = {
  red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#eab308'
};

const HOME_SLOTS: Record<Color, [number, number][]> = {
  red:    [[1,1],[1,3],[3,1],[3,3]],
  green:  [[1,11],[1,13],[3,11],[3,13]],
  blue:   [[11,11],[11,13],[13,11],[13,13]],
  yellow: [[11,1],[11,3],[13,1],[13,3]],
};

const TRACK: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[6,9],[6,10],
  [6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],
  [8,10],[8,9],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,6],[8,5],
  [8,4],[8,3],[8,2],[8,1],[8,0],[7,0]
];

const HOME_PATH: Record<Color, [number, number][]> = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

const START_POS: Record<Color, number> = { red: 0, green: 13, blue: 26, yellow: 39 };
const SAFE_SPOTS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Realistic Dice Component
function RealisticDice({ value, onRoll, isRolling }: { 
  value: number; 
  onRoll: () => void; 
  isRolling: boolean;
}) {
  const diceRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (isRolling) return;
    if (diceRef.current) {
      diceRef.current.style.transform = 'scale(0.75) rotateX(40deg) rotateY(-35deg)';
    }
    setTimeout(onRoll, 120);
  };

  return (
    <div 
      ref={diceRef}
      onClick={handleClick}
      className={`w-32 h-32 bg-white rounded-3xl shadow-2xl flex items-center justify-center cursor-pointer border-8 border-amber-950 transition-all ${isRolling ? 'animate-bounce' : 'hover:scale-110 active:scale-95'}`}
      style={{ boxShadow: '15px 30px 50px rgba(0,0,0,0.8), inset 0 15px 20px rgba(255,255,255,0.9)' }}
    >
      <div className="text-8xl font-black text-black drop-shadow">{value}</div>
    </div>
  );
           }
export default function ClassicLudoPlay() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room') || '';
  const playerName = searchParams.get('name') || 'Demon';
  const playerColor = (searchParams.get('color') as Color) || 'red';

  const [players] = useState([
    { id: 0, name: playerName, color: playerColor },
    { id: 1, name: "Player 2", color: 'green' as Color },
    { id: 2, name: "Player 3", color: 'blue' as Color },
    { id: 3, name: "Player 4", color: 'yellow' as Color },
  ]);

  const [pieces, setPieces] = useState<any[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [dice, setDice] = useState(1);
  const [isRolling, setIsRolling] = useState(false);

  // Initialize pieces
  useEffect(() => {
    const initial: any[] = [];
    players.forEach(p => {
      for (let i = 0; i < 4; i++) {
        initial.push({
          id: `\( {p.color}- \){i}`,
          playerId: p.id,
          color: p.color,
          steps: -1
        });
      }
    });
    setPieces(initial);
  }, [players]);

  const rollDice = async () => {
    if (isRolling) return;

    setIsRolling(true);
    for (let i = 0; i < 12; i++) {
      setDice(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 55));
    }
    const final = Math.floor(Math.random() * 6) + 1;
    setDice(final);
    setIsRolling(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0703] text-white pb-12">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 border-b border-amber-900 p-4 z-50">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-black text-amber-400 tracking-wider">LUDO</h1>
          <div>
            <p className="text-xs text-amber-300/70">ROOM CODE</p>
            <p className="font-mono text-lg text-amber-400">{roomCode}</p>
          </div>
        </div>
      </div>

      {/* Dice */}
      <div className="flex justify-center mt-10">
        <RealisticDice value={dice} onRoll={rollDice} isRolling={isRolling} />
      </div>

      <p className="text-center mt-3 text-amber-300/70">
        {isRolling ? "Rolling the dice..." : "Tap dice to roll"}
      </p>

      {/* Board Placeholder */}
      <div className="flex justify-center mt-8 px-4">
        <div className="relative w-full max-w-[420px] aspect-square border-8 border-amber-900 rounded-3xl bg-[#1a140f] flex items-center justify-center overflow-hidden">
          <p className="text-amber-400/40 text-center text-lg">
            Full Board + Pieces<br />
            will be added in next step
          </p>
        </div>
      </div>

      {/* Players */}
      <div className="px-6 mt-10">
        <p className="text-amber-300 mb-4 font-bold">PLAYERS IN ROOM</p>
        {players.map((p, i) => (
          <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl mb-3 ${i === currentTurnIndex ? 'bg-amber-400/10 border border-amber-400' : 'bg-black/40'}`}>
            <div className="w-10 h-10 rounded-full" style={{ backgroundColor: COLORS[p.color] }} />
            <div>
              <p className="font-medium">{p.name}</p>
              {i === 0 && <p className="text-xs text-amber-400">(You)</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
