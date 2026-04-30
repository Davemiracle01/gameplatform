'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Color = 'red' | 'green' | 'blue' | 'yellow';

interface Player {
  id: number;
  name: string;
  color: Color;
  isBot: boolean;
}

interface Piece {
  id: string;
  playerId: number;
  color: Color;
  steps: number; // -1 = home, 0-51 = track, 52-56 = home column, 57 = finished
}

const COLORS: Record<Color, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
};

const COLOR_NAMES: Record<Color, string> = {
  red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow',
};

const HOME_SLOTS: Record<Color, [number, number][]> = {
  red: [[2,2],[2,4],[4,2],[4,4]],
  green: [[2,10],[2,12],[4,10],[4,12]],
  blue: [[10,10],[10,12],[12,10],[12,12]],
  yellow: [[10,2],[10,4],[12,2],[12,4]],
};

const TRACK: [number,number][] = [
  // Standard 52-square Ludo track (15x15 grid, indices 0-14)
  [6,1],[6,2],[6,3],[6,4],[6,5], [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7], [0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14], [8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[8,8],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7], [14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0]
];

const HOME_PATH: Record<Color, [number,number][]> = {
  red: [[7,1],[7,2],[7,3],[7,4],[7,5]],
  green: [[1,7],[2,7],[3,7],[4,7],[5,7]],
  blue: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

const START_POS: Record<Color, number> = {
  red: 0, green: 13, blue: 26, yellow: 39
};

const SAFE_SPOTS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function getPosition(piece: Piece): [number, number] {
  if (piece.steps === -1) {
    const slots = HOME_SLOTS[piece.color];
    const idx = parseInt(piece.id.split('-')[1]);
    const [r, c] = slots[idx];
    return [r * 40 + 20, c * 40 + 20];
  }
  if (piece.steps >= 57) return [280, 280]; // center
  if (piece.steps >= 52) {
    const idx = piece.steps - 52;
    const [r, c] = HOME_PATH[piece.color][idx];
    return [r * 40 + 20, c * 40 + 20];
  }
  const trackIdx = (START_POS[piece.color] + piece.steps) % 52;
  const [r, c] = TRACK[trackIdx];
  return [r * 40 + 20, c * 40 + 20];
}

export default function SpaceLudo() {
  const router = useRouter();
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [humanName, setHumanName] = useState('Demon');
  const [humanColor, setHumanColor] = useState<Color>('blue');
  const [numBots, setNumBots] = useState(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [dice, setDice] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [movablePieces, setMovablePieces] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState<Player | null>(null);
  const [explosions, setExplosions] = useState<{x: number; y: number; id: number}[]>([]);

  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const availableColors = ['red', 'green', 'blue', 'yellow'] as Color[];

  // Setup game
  const startGame = () => {
    const allPlayers: Player[] = [];
    const usedColors = new Set<Color>();

    // Human player
    allPlayers.push({
      id: 0,
      name: humanName,
      color: humanColor,
      isBot: false,
    });
    usedColors.add(humanColor);

    // Bots
    let botId = 1;
    const remainingColors = availableColors.filter(c => c !== humanColor);

    for (let i = 0; i < numBots; i++) {
      const botColor = remainingColors[i % remainingColors.length];
      allPlayers.push({
        id: botId++,
        name: `Alien ${botId}`,
        color: botColor,
        isBot: true,
      });
      usedColors.add(botColor);
    }

    // Create pieces
    const allPieces: Piece[] = [];
    allPlayers.forEach(player => {
      for (let i = 0; i < 4; i++) {
        allPieces.push({
          id: `\( {player.color}- \){i}`,
          playerId: player.id,
          color: player.color,
          steps: -1,
        });
      }
    });

    setPlayers(allPlayers);
    setPieces(allPieces);
    setCurrentTurnIndex(0);
    setGamePhase('playing');
    setWinner(null);
    setDice(0);
    setMessage(`${allPlayers[0].name} turn now..`);
  };

  const rollDiceFunc = useCallback(async () => {
    if (rolling || players[currentTurnIndex]?.isBot) return;

    setRolling(true);
    setMessage('Rolling...');

    for (let i = 0; i < 12; i++) {
      setDice(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 60));
    }

    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDice(finalRoll);
    setRolling(false);

    const currentPlayer = players[currentTurnIndex];
    const playerPieces = pieces.filter(p => p.playerId === currentPlayer.id);

    const movable = playerPieces
      .filter(p => {
        if (p.steps >= 57) return false;
        if (p.steps === -1) return finalRoll === 6;
        return p.steps + finalRoll <= 57;
      })
      .map(p => p.id);

    setMovablePieces(movable);

    if (movable.length === 0) {
      setMessage(`No moves! Next turn...`);
      setTimeout(nextTurn, 1200);
    } else {
      setMessage(`Rolled ${finalRoll}! Tap a glowing alien to move.`);
    }
  }, [rolling, players, currentTurnIndex, pieces]);

  const movePiece = async (pieceId: string) => {
    if (!movablePieces.includes(pieceId)) return;

    const pieceIndex = pieces.findIndex(p => p.id === pieceId);
    const piece = pieces[pieceIndex];
    const roll = dice;
    const currentPlayer = players[currentTurnIndex];

    setMovablePieces([]);

    let newPieces = [...pieces];
    let newSteps = piece.steps === -1 ? 0 : piece.steps + roll;

    // Move step by step for animation
    for (let i = (piece.steps === -1 ? 0 : piece.steps); i < newSteps; i++) {
      newPieces[pieceIndex] = { ...newPieces[pieceIndex], steps: i + 1 };
      setPieces([...newPieces]);
      await new Promise(r => setTimeout(r, 80));
    }

    // Check captures
    if (newSteps < 52 && !SAFE_SPOTS.has((START_POS[piece.color] + newSteps) % 52)) {
      const posIndex = (START_POS[piece.color] + newSteps) % 52;
      const occupied = newPieces.filter(p => 
        p.playerId !== piece.playerId && 
        p.steps >= 0 && p.steps < 52 && 
        (START_POS[p.color] + p.steps) % 52 === posIndex
      );

      occupied.forEach(occ => {
        const occIndex = newPieces.findIndex(p => p.id === occ.id);
        newPieces[occIndex] = { ...newPieces[occIndex], steps: -1 };
        const [x, y] = getPosition(occ);
        setExplosions(prev => [...prev, { x, y, id: Date.now() }]);
        setTimeout(() => setExplosions(e => e.filter(ex => ex.id !== Date.now())), 500);
      });
    }

    setPieces(newPieces);

    // Check win
    const playerFinished = newPieces
      .filter(p => p.playerId === currentPlayer.id)
      .every(p => p.steps >= 57);

    if (playerFinished) {
      setWinner(currentPlayer);
      setGamePhase('finished');
      setMessage(`${currentPlayer.name} WINS! 🎉`);
      return;
    }

    // Extra turn on 6
    if (roll === 6) {
      setMessage(`${currentPlayer.name} rolled 6! Roll again.`);
    } else {
      nextTurn();
    }
  };

  const nextTurn = () => {
    let nextIndex = (currentTurnIndex + 1) % players.length;
    setCurrentTurnIndex(nextIndex);
    setDice(0);
    setMovablePieces([]);
    const nextPlayer = players[nextIndex];
    setMessage(`${nextPlayer.name} turn now..`);
  };

  // Bot logic
  useEffect(() => {
    if (gamePhase !== 'playing' || !players.length || players[currentTurnIndex]?.isBot === false) return;

    const botPlay = async () => {
      setMessage(`${players[currentTurnIndex].name} is thinking...`);
      await new Promise(r => setTimeout(r, 800));

      const roll = Math.floor(Math.random() * 6) + 1;
      setDice(roll);

      const botPieces = pieces.filter(p => p.playerId === players[currentTurnIndex].id);
      const movable = botPieces.filter(p => {
        if (p.steps >= 57) return false;
        if (p.steps === -1) return roll === 6;
        return p.steps + roll <= 57;
      });

      if (movable.length === 0) {
        setTimeout(nextTurn, 1000);
        return;
      }

      // Prefer moving furthest piece
      const chosen = movable.sort((a, b) => b.steps - a.steps)[0];
      await new Promise(r => setTimeout(r, 600));
      movePiece(chosen.id);
    };

    botTimeoutRef.current = setTimeout(botPlay, 600);
    return () => { if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current); };
  }, [currentTurnIndex, players, pieces, gamePhase]);

  const resetGame = () => {
    setGamePhase('setup');
    setDice(0);
    setMovablePieces([]);
    setWinner(null);
  };

  const currentPlayer = players[currentTurnIndex];

  return (
    <div className="min-h-screen bg-[#0a0a2e] text-white overflow-hidden relative font-sans">
      {/* Stars background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.8px,transparent_1px)] bg-[length:30px_30px] opacity-30" />

      {gamePhase === 'setup' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="text-center mb-10">
            <div className="text-6xl mb-4">🪐</div>
            <h1 className="text-5xl font-bold tracking-widest">SPACE LUDO</h1>
            <p className="text-xl text-blue-300 mt-2">Alien Edition</p>
          </div>

          <div className="bg-[#111133] p-8 rounded-3xl border border-white/10 w-full max-w-md">
            <div className="mb-6">
              <label className="block text-sm mb-2">Your Name</label>
              <input
                type="text"
                value={humanName}
                onChange={(e) => setHumanName(e.target.value)}
                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-lg"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm mb-2">Your Color</label>
              <div className="flex gap-3">
                {availableColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setHumanColor(c)}
                    className={`w-12 h-12 rounded-2xl border-4 transition-all ${humanColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: COLORS[c] }}
                  />
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm mb-2">Number of Bots (0-3)</label>
              <input
                type="range"
                min="0"
                max="3"
                value={numBots}
                onChange={(e) => setNumBots(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="text-center text-2xl font-bold mt-1">{numBots}</div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl text-xl font-bold hover:scale-105 transition-transform"
            >
              START SPACE BATTLE
            </button>
          </div>
        </div>
      )}

      {gamePhase === 'playing' && (
        <>
          {/* Top Bar */}
          <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/40 backdrop-blur">
            <button onClick={resetGame} className="text-2xl">←</button>
            <div className="text-xl font-bold tracking-widest">SPACE LUDO</div>
            <div className="text-sm opacity-70">Turn {currentTurnIndex + 1}</div>
          </div>

          <div className="text-center py-4 text-xl font-medium" style={{ color: currentPlayer ? COLORS[currentPlayer.color] : 'white' }}>
            {message || `${currentPlayer?.name} turn now..`}
          </div>

          {/* Board */}
          <div className="flex justify-center p-4">
            <div className="relative w-[520px] h-[520px] bg-[#0f0f2e] rounded-3xl border-8 border-white/10 overflow-hidden shadow-2xl">
              {/* Grid & Paths - Simplified but functional */}
              <svg viewBox="0 0 520 520" className="absolute inset-0 w-full h-full">
                {/* Background cells and paths would go here - using simple colored areas for speed */}
                <rect x="0" y="0" width="520" height="520" fill="#111133" />
                
                {/* Home areas */}
                {Object.entries(HOME_SLOTS).map(([col, slots]) => {
                  const color = col as Color;
                  return slots.map(([r, c], i) => (
                    <circle 
                      key={`\( {color}- \){i}`}
                      cx={c * 40 + 20} 
                      cy={r * 40 + 20} 
                      r="18" 
                      fill={COLORS[color]} 
                      opacity="0.15"
                    />
                  ));
                })}
              </svg>

              {/* Pieces */}
              {pieces.map(piece => {
                const [x, y] = getPosition(piece);
                const isMovable = movablePieces.includes(piece.id);
                const owner = players.find(p => p.id === piece.playerId);

                return (
                  <div
                    key={piece.id}
                    className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-all"
                    style={{ left: x, top: y }}
                    onClick={() => movePiece(piece.id)}
                  >
                    {isMovable && (
                      <div className="absolute w-14 h-14 border-4 border-white rounded-full animate-ping opacity-40" />
                    )}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-2xl border-4 shadow-lg"
                      style={{ 
                        backgroundColor: COLORS[piece.color],
                        borderColor: isMovable ? 'white' : '#111'
                      }}
                    >
                      👽
                    </div>
                    <div className="absolute -bottom-1 text-[10px] font-bold text-white drop-shadow">
                      {piece.steps >= 57 ? '✓' : ''}
                    </div>
                  </div>
                );
              })}

              {/* Dice */}
              <div 
                onClick={rollDiceFunc}
                className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/10 backdrop-blur-xl border-4 border-white/30 rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-2xl ${rolling ? 'animate-spin' : ''}`}
              >
                <div className="text-6xl font-black drop-shadow-2xl">
                  {dice || '?'}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="text-center text-sm opacity-60 mt-4">
            Tap dice to roll • Tap glowing aliens to move
          </div>
        </>
      )}

      {gamePhase === 'finished' && winner && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <div className="text-8xl mb-6">🎉🚀</div>
          <h1 className="text-6xl font-bold mb-2" style={{ color: COLORS[winner.color] }}>
            {winner.name} WINS!
          </h1>
          <p className="text-2xl mb-12 opacity-80">Master of the Galaxy</p>
          
          <button 
            onClick={resetGame}
            className="px-12 py-5 bg-white text-black rounded-2xl text-xl font-bold hover:bg-yellow-300 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Explosions */}
      {explosions.map(ex => (
        <div
          key={ex.id}
          className="absolute w-6 h-6 pointer-events-none"
          style={{ left: ex.x - 12, top: ex.y - 12 }}
        >
          💥
        </div>
      ))}
    </div>
  );
}