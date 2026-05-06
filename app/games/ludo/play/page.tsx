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
