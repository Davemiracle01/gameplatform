'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type Color = 'red' | 'green' | 'blue' | 'yellow';
type GameMode = 'bots' | 'players';

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
  steps: number;
}

interface Explosion {
  x: number;
  y: number;
  id: number;
}

interface HumanSlot {
  name: string;
  color: Color;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS: Record<Color, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
};

const GLOW: Record<Color, string> = {
  red: '0 0 16px #ef4444, 0 0 32px #ef444488',
  green: '0 0 16px #22c55e, 0 0 32px #22c55e88',
  blue: '0 0 16px #3b82f6, 0 0 32px #3b82f688',
  yellow: '0 0 16px #eab308, 0 0 32px #eab30888',
};

const LIGHT_BG: Record<Color, string> = {
  red: '#3d0000',
  green: '#003d00',
  blue: '#00003d',
  yellow: '#3d3000',
};

const HOME_SLOTS: Record<Color, [number, number][]> = {
  red:    [[1,1],[1,3],[3,1],[3,3]],
  green:  [[1,11],[1,13],[3,11],[3,13]],
  blue:   [[11,11],[11,13],[13,11],[13,13]],
  yellow: [[11,1],[11,3],[13,1],[13,3]],
};

const TRACK: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[8,8],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
];

const HOME_PATH: Record<Color, [number, number][]> = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

const START_POS: Record<Color, number> = {
  red: 0, green: 13, blue: 26, yellow: 39,
};

const SAFE_SPOTS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// CELL and BOARD are now dynamic — see useBoardSize() hook below
const CELL = 36; // fallback / used by BoardSVG which gets size injected
const BOARD = 15 * CELL;

const ALL_COLORS: Color[] = ['red', 'green', 'blue', 'yellow'];
const COLOR_LABELS: Record<Color, string> = { red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow' };
const BOT_NAMES = ['Alien Alpha', 'Alien Beta', 'Alien Gamma'];

// ─── Dynamic board sizing ─────────────────────────────────────────────────────

function useBoardSize() {
  const [cellSize, setCellSize] = React.useState(CELL);
  React.useEffect(() => {
    function update() {
      // Leave ~16px padding on each side; board = 15 cells
      const available = Math.min(window.innerWidth - 32, window.innerHeight * 0.72);
      const size = Math.max(20, Math.floor(available / 15));
      setCellSize(size);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return { cellSize, boardPx: cellSize * 15 };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPosition(piece: Piece, cellSize: number = CELL): [number, number] {
  const S = cellSize;
  const boardSize = 15 * S;
  if (piece.steps === -1) {
    const slots = HOME_SLOTS[piece.color];
    const idx = parseInt(piece.id.split('-')[1]);
    const [r, c] = slots[idx];
    return [c * S + S / 2, r * S + S / 2];
  }
  if (piece.steps >= 57) return [boardSize / 2, boardSize / 2];
  if (piece.steps >= 52) {
    const idx = piece.steps - 52;
    const [r, c] = HOME_PATH[piece.color][idx];
    return [c * S + S / 2, r * S + S / 2];
  }
  const trackIdx = (START_POS[piece.color] + piece.steps) % 52;
  const [r, c] = TRACK[trackIdx];
  return [c * S + S / 2, r * S + S / 2];
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
};

function DiceFace({ value, spinning }: { value: number; spinning: boolean }) {
  const pips = value > 0 ? PIPS[value] : [];
  return (
    <div
      className={`relative w-16 h-16 rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-xl shadow-2xl flex items-center justify-center ${spinning ? 'animate-spin' : ''}`}
      style={{ transition: 'transform 0.1s' }}
    >
      {pips.map(([px, py], i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full bg-white shadow"
          style={{ left: `${px}%`, top: `${py}%`, transform: 'translate(-50%,-50%)' }}
        />
      ))}
      {value === 0 && <span className="text-white/40 text-2xl font-black">?</span>}
    </div>
  );
}

// ─── Board SVG ───────────────────────────────────────────────────────────────

function BoardSVG({ cellSize = CELL }: { cellSize?: number }) {
  const S = cellSize;
  const boardSize = 15 * S;
  const cols: { color: Color; zone: [number,number,number,number] }[] = [
    { color: 'red',    zone: [0, 0, 6, 6] },
    { color: 'green',  zone: [0, 9, 6, 6] },
    { color: 'blue',   zone: [9, 9, 6, 6] },
    { color: 'yellow', zone: [9, 0, 6, 6] },
  ];

  const trackColors: Record<number, Color> = {
    0:'red', 1:'red', 2:'red', 3:'red', 4:'red',
    13:'green', 14:'green', 15:'green', 16:'green', 17:'green',
    26:'blue', 27:'blue', 28:'blue', 29:'blue', 30:'blue',
    39:'yellow', 40:'yellow', 41:'yellow', 42:'yellow', 43:'yellow',
  };

  return (
    <svg width={boardSize} height={boardSize} viewBox={`0 0 ${boardSize} ${boardSize}`} className="absolute inset-0">
      <rect width={boardSize} height={boardSize} fill="#0d0d2b" rx="12"/>
      {cols.map(({ color, zone: [r, c, h, w] }) => (
        <rect key={color} x={c*S} y={r*S} width={w*S} height={h*S}
          fill={LIGHT_BG[color]} stroke={COLORS[color]} strokeWidth="2" rx="8"/>
      ))}
      {(Object.entries(HOME_SLOTS) as [Color, [number, number][]][]).map(([color, slots]) =>
        slots.map(([r, c], i) => (
          <circle key={`hb-${color}-${i}`}
            cx={c*S+S/2} cy={r*S+S/2} r={S*0.38}
            fill={COLORS[color]} opacity={0.25}
            stroke={COLORS[color]} strokeWidth="1.5"/>
        ))
      )}
      {TRACK.map(([r, c], idx) => {
        const tc = trackColors[idx];
        return (
          <rect key={`tr-${idx}`} x={c*S+1} y={r*S+1} width={S-2} height={S-2}
            fill={tc ? COLORS[tc] : '#1a1a40'} opacity={tc ? 0.4 : 0.6}
            stroke={tc ? COLORS[tc] : '#ffffff18'} strokeWidth="1" rx="3"/>
        );
      })}
      {TRACK.map(([r, c], idx) => {
        if (!SAFE_SPOTS.has(idx)) return null;
        return (
          <text key={`safe-${idx}`} x={c*S+S/2} y={r*S+S/2+5}
            textAnchor="middle" fontSize={S*0.5} opacity={0.5}>⭐</text>
        );
      })}
      {(Object.entries(HOME_PATH) as [Color, [number, number][]][]).map(([color, path]) =>
        path.map(([r, c], i) => (
          <rect key={`hp-${color}-${i}`} x={c*S+1} y={r*S+1} width={S-2} height={S-2}
            fill={COLORS[color]} opacity={i===5 ? 0.9 : 0.3}
            stroke={COLORS[color]} strokeWidth="1" rx="3"/>
        ))
      )}
      <polygon
        points={`${boardSize/2},${boardSize/2-S*1.5} ${boardSize/2+S*0.5},${boardSize/2-S*0.3} ${boardSize/2+S*1.5},${boardSize/2-S*0.3} ${boardSize/2+S*0.8},${boardSize/2+S*0.5} ${boardSize/2+S},${boardSize/2+S*1.5} ${boardSize/2},${boardSize/2+S} ${boardSize/2-S},${boardSize/2+S*1.5} ${boardSize/2-S*0.8},${boardSize/2+S*0.5} ${boardSize/2-S*1.5},${boardSize/2-S*0.3} ${boardSize/2-S*0.5},${boardSize/2-S*0.3}`}
        fill="none" stroke="#ffffff30" strokeWidth="1.5"/>
      <text x={boardSize/2} y={boardSize/2+14} textAnchor="middle" fontSize="28" opacity="0.6">🌟</text>
    </svg>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({
  selected, onChange, taken,
}: { selected: Color; onChange: (c: Color) => void; taken: Color[] }) {
  return (
    <div className="flex gap-2">
      {ALL_COLORS.map(c => {
        const isTaken = taken.includes(c) && c !== selected;
        return (
          <button
            key={c}
            disabled={isTaken}
            onClick={() => onChange(c)}
            title={COLOR_LABELS[c]}
            className="relative w-9 h-9 rounded-xl border-4 transition-all duration-200"
            style={{
              backgroundColor: COLORS[c],
              borderColor: selected === c ? '#fff' : 'transparent',
              boxShadow: selected === c ? GLOW[c] : 'none',
              transform: selected === c ? 'scale(1.2)' : 'scale(1)',
              opacity: isTaken ? 0.25 : 1,
              cursor: isTaken ? 'not-allowed' : 'pointer',
            }}
          >
            {isTaken && (
              <span className="absolute inset-0 flex items-center justify-center text-white/80 text-xs font-black">✕</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Player Row (setup) ───────────────────────────────────────────────────────

function PlayerRow({
  index, slot, onChange, takenColors, isBot, removable, onRemove,
}: {
  index: number;
  slot: HumanSlot;
  onChange: (s: HumanSlot) => void;
  takenColors: Color[];
  isBot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 transition-all"
      style={{ background: `linear-gradient(135deg, ${COLORS[slot.color]}14, #ffffff05)` }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: COLORS[slot.color] + '33', border: `2px solid ${COLORS[slot.color]}66` }}
      >
        {isBot ? '🤖' : '👽'}
      </div>

      {/* Name input */}
      <input
        type="text"
        value={slot.name}
        onChange={e => onChange({ ...slot, name: e.target.value })}
        placeholder={`Player ${index + 1}`}
        maxLength={16}
        readOnly={isBot}
        className="flex-1 min-w-0 bg-transparent border-b border-white/20 pb-0.5 text-sm font-bold outline-none focus:border-blue-400 transition-colors placeholder-white/20"
        style={{ caretColor: COLORS[slot.color] }}
      />

      {/* Color picker */}
      <ColorPicker
        selected={slot.color}
        onChange={c => onChange({ ...slot, color: c })}
        taken={takenColors}
      />

      {/* Remove button */}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
        >✕</button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SpaceLudo() {
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('bots');

  // Bot mode state (original)
  const [humanName, setHumanName] = useState('Demon');
  const [humanColor, setHumanColor] = useState<Color>('blue');
  const [numBots, setNumBots] = useState(2);

  // Multiplayer mode state
  const [humanSlots, setHumanSlots] = useState<HumanSlot[]>([
    { name: 'Player 1', color: 'blue' },
    { name: 'Player 2', color: 'red' },
  ]);

  const [players, setPlayers] = useState<Player[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [dice, setDice] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [movablePieces, setMovablePieces] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState<Player | null>(null);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [confetti, setConfetti] = useState<{x:number;y:number;c:string;id:number}[]>([]);
  const [botRollTrigger, setBotRollTrigger] = useState(0);

  const { cellSize, boardPx } = useBoardSize();
  const cellSizeRef = useRef(cellSize);
  useEffect(() => { cellSizeRef.current = cellSize; }, [cellSize]);

  const piecesRef = useRef<Piece[]>([]);
  const playersRef = useRef<Player[]>([]);
  const currentTurnRef = useRef(0);
  const movablePiecesRef = useRef<string[]>([]);
  const diceRef = useRef(0);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBotTurnRef = useRef(false);

  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { currentTurnRef.current = currentTurnIndex; }, [currentTurnIndex]);
  useEffect(() => { movablePiecesRef.current = movablePieces; }, [movablePieces]);
  useEffect(() => { diceRef.current = dice; }, [dice]);

  // ── Multiplayer slot helpers ───────────────────────────────────────────────

  const takenColorsFor = (idx: number) => humanSlots.filter((_, i) => i !== idx).map(s => s.color);

  const addPlayer = () => {
    if (humanSlots.length >= 4) return;
    const used = humanSlots.map(s => s.color);
    const free = ALL_COLORS.find(c => !used.includes(c))!;
    setHumanSlots(prev => [...prev, { name: `Player ${prev.length + 1}`, color: free }]);
  };

  const removePlayer = (idx: number) => {
    setHumanSlots(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, slot: HumanSlot) => {
    setHumanSlots(prev => prev.map((s, i) => i === idx ? slot : s));
  };

  // ── Setup ──────────────────────────────────────────────────────────────────

  const startGame = () => {
    let allPlayers: Player[];

    if (gameMode === 'bots') {
      allPlayers = [{ id: 0, name: humanName || 'Player', color: humanColor, isBot: false }];
      const remaining = ALL_COLORS.filter(c => c !== humanColor);
      for (let i = 0; i < numBots; i++) {
        allPlayers.push({ id: i + 1, name: BOT_NAMES[i], color: remaining[i], isBot: true });
      }
    } else {
      allPlayers = humanSlots.map((slot, i) => ({
        id: i,
        name: slot.name.trim() || `Player ${i + 1}`,
        color: slot.color,
        isBot: false,
      }));
    }

    const allPieces: Piece[] = [];
    allPlayers.forEach(player => {
      for (let i = 0; i < 4; i++) {
        allPieces.push({ id: `${player.color}-${i}`, playerId: player.id, color: player.color, steps: -1 });
      }
    });

    setPlayers(allPlayers);
    setPieces(allPieces);
    piecesRef.current = allPieces;
    playersRef.current = allPlayers;
    setCurrentTurnIndex(0);
    currentTurnRef.current = 0;
    setGamePhase('playing');
    setWinner(null);
    setDice(0);
    setMovablePieces([]);
    isBotTurnRef.current = false;
    setMessage(`${allPlayers[0].name}'s turn — Roll the dice!`);
  };

  // ── Next Turn ──────────────────────────────────────────────────────────────

  const nextTurn = useCallback((currentPlayers: Player[], fromIndex: number) => {
    const nextIndex = (fromIndex + 1) % currentPlayers.length;
    setCurrentTurnIndex(nextIndex);
    currentTurnRef.current = nextIndex;
    setDice(0);
    diceRef.current = 0;
    setMovablePieces([]);
    movablePiecesRef.current = [];
    setMessage(`${currentPlayers[nextIndex].name}'s turn — Roll the dice!`);
    isBotTurnRef.current = currentPlayers[nextIndex].isBot;
  }, []);

  // ── Move Piece ─────────────────────────────────────────────────────────────

  const movePiece = useCallback(async (pieceId: string, roll: number, currentPieces: Piece[], currentPlayers: Player[], turnIdx: number) => {
    if (!movablePiecesRef.current.includes(pieceId)) return;

    const pieceIndex = currentPieces.findIndex(p => p.id === pieceId);
    if (pieceIndex === -1) return;

    const piece = currentPieces[pieceIndex];
    const currentPlayer = currentPlayers[turnIdx];

    setMovablePieces([]);
    movablePiecesRef.current = [];

    let newPieces = [...currentPieces];
    const startStep = piece.steps === -1 ? 0 : piece.steps;
    const finalStep = piece.steps === -1 ? 0 : Math.min(piece.steps + roll, 57);

    for (let s = startStep; s <= finalStep; s++) {
      newPieces[pieceIndex] = { ...newPieces[pieceIndex], steps: s };
      setPieces([...newPieces]);
      piecesRef.current = [...newPieces];
      await new Promise(r => setTimeout(r, 70));
    }

    if (finalStep < 52) {
      const posIndex = (START_POS[piece.color] + finalStep) % 52;
      if (!SAFE_SPOTS.has(posIndex)) {
        const captured = newPieces.filter(p =>
          p.playerId !== piece.playerId &&
          p.steps >= 0 && p.steps < 52 &&
          (START_POS[p.color] + p.steps) % 52 === posIndex
        );
        captured.forEach(occ => {
          const occIdx = newPieces.findIndex(p => p.id === occ.id);
          const [ex, ey] = getPosition(occ, cellSizeRef.current);
          const expId = Date.now() + Math.random();
          setExplosions(prev => [...prev, { x: ex, y: ey, id: expId }]);
          setTimeout(() => setExplosions(e => e.filter(ex => ex.id !== expId)), 700);
          newPieces[occIdx] = { ...newPieces[occIdx], steps: -1 };
        });
        if (captured.length > 0) {
          setPieces([...newPieces]);
          piecesRef.current = [...newPieces];
        }
      }
    }

    const playerFinished = newPieces.filter(p => p.playerId === currentPlayer.id).every(p => p.steps >= 57);
    if (playerFinished) {
      setWinner(currentPlayer);
      setGamePhase('finished');
      const pieces_conf = Array.from({ length: 40 }, (_, i) => ({
        x: Math.random() * 100, y: Math.random() * 100,
        c: ['#ef4444','#22c55e','#3b82f6','#eab308','#fff','#a855f7'][i % 6],
        id: i,
      }));
      setConfetti(pieces_conf);
      return;
    }

    if (roll === 6) {
      setMessage(`${currentPlayer.name} rolled 6 — Roll again!`);
      isBotTurnRef.current = currentPlayer.isBot;
      if (currentPlayer.isBot) setBotRollTrigger(t => t + 1);
    } else {
      nextTurn(currentPlayers, turnIdx);
    }
  }, [nextTurn]);

  // ── Human Roll ─────────────────────────────────────────────────────────────

  const rollDiceFunc = useCallback(async () => {
    const tIdx = currentTurnRef.current;
    const curPlayers = playersRef.current;
    if (rolling || curPlayers[tIdx]?.isBot) return;

    setRolling(true);
    setMessage('Rolling...');

    for (let i = 0; i < 10; i++) {
      setDice(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 55));
    }

    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDice(finalRoll);
    diceRef.current = finalRoll;
    setRolling(false);

    const currentPlayer = curPlayers[tIdx];
    const playerPieces = piecesRef.current.filter(p => p.playerId === currentPlayer.id);
    const movable = playerPieces
      .filter(p => {
        if (p.steps >= 57) return false;
        if (p.steps === -1) return finalRoll === 6;
        return p.steps + finalRoll <= 57;
      })
      .map(p => p.id);

    setMovablePieces(movable);
    movablePiecesRef.current = movable;

    if (movable.length === 0) {
      setMessage(`No moves for ${currentPlayer.name}. Next turn...`);
      setTimeout(() => nextTurn(playersRef.current, currentTurnRef.current), 1200);
    } else {
      setMessage(`Rolled ${finalRoll}! Tap a glowing alien to move.`);
    }
  }, [rolling, nextTurn]);

  const handlePieceClick = (pieceId: string) => {
    if (movablePiecesRef.current.includes(pieceId)) {
      movePiece(pieceId, diceRef.current, piecesRef.current, playersRef.current, currentTurnRef.current);
    }
  };

  // ── Bot Logic ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const curPlayers = playersRef.current;
    const tIdx = currentTurnRef.current;
    if (!curPlayers.length || !curPlayers[tIdx]?.isBot) return;

    isBotTurnRef.current = true;

    const botPlay = async () => {
      if (!isBotTurnRef.current) return;
      const idx = currentTurnRef.current;
      const players_ = playersRef.current;
      const bot = players_[idx];
      if (!bot?.isBot) return;

      setMessage(`${bot.name} is thinking...`);
      await new Promise(r => setTimeout(r, 700));
      if (!isBotTurnRef.current) return;

      for (let i = 0; i < 8; i++) {
        setDice(Math.floor(Math.random() * 6) + 1);
        await new Promise(r => setTimeout(r, 55));
      }
      const roll = Math.floor(Math.random() * 6) + 1;
      setDice(roll);
      diceRef.current = roll;

      const curPieces = piecesRef.current;
      const botPieces = curPieces.filter(p => p.playerId === bot.id);
      const movable = botPieces.filter(p => {
        if (p.steps >= 57) return false;
        if (p.steps === -1) return roll === 6;
        return p.steps + roll <= 57;
      });

      if (movable.length === 0) {
        setMessage(`${bot.name} rolled ${roll} — no moves!`);
        setTimeout(() => nextTurn(playersRef.current, currentTurnRef.current), 1000);
        return;
      }

      const capturePriority = movable.find(p => {
        if (p.steps < 0) return false;
        const newPos = (START_POS[p.color] + p.steps + roll) % 52;
        return curPieces.some(
          opp => opp.playerId !== bot.id && opp.steps >= 0 && opp.steps < 52 &&
            !SAFE_SPOTS.has((START_POS[opp.color] + opp.steps) % 52) &&
            (START_POS[opp.color] + opp.steps) % 52 === newPos
        );
      });

      const chosen = capturePriority || movable.sort((a, b) => b.steps - a.steps)[0];
      setMovablePieces([chosen.id]);
      movablePiecesRef.current = [chosen.id];

      await new Promise(r => setTimeout(r, 500));
      if (isBotTurnRef.current) {
        movePiece(chosen.id, roll, piecesRef.current, playersRef.current, idx);
      }
    };

    botTimeoutRef.current = setTimeout(botPlay, 500);
    return () => { if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurnIndex, botRollTrigger, gamePhase]);

  const resetGame = () => {
    isBotTurnRef.current = false;
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setGamePhase('setup');
    setDice(0);
    setMovablePieces([]);
    setWinner(null);
    setConfetti([]);
    setExplosions([]);
  };

  const currentPlayer = players[currentTurnIndex];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#080818] text-white overflow-hidden relative" style={{ fontFamily: "'Exo 2', 'Orbitron', sans-serif" }}>
      {/* Star fields */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 0.8px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.18 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#aaaaff 0.4px, transparent 1px)', backgroundSize: '17px 17px', backgroundPosition: '8px 8px', opacity: 0.1 }} />

      {/* ── SETUP SCREEN ──────────────────────────────────────────────────── */}
      {gamePhase === 'setup' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="text-center mb-8">
            <div className="text-7xl mb-3" style={{ filter: 'drop-shadow(0 0 20px #3b82f6)' }}>🚀</div>
            <h1 className="text-5xl font-black tracking-[0.2em] bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              SPACE LUDO
            </h1>
            <p className="text-blue-300/70 mt-2 tracking-widest text-sm uppercase">Alien Invasion Edition</p>
          </div>

          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #111133ee, #0d0d2bee)' }}
          >
            {/* ── Mode Toggle ── */}
            <div className="flex border-b border-white/10">
              {(['bots', 'players'] as GameMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setGameMode(mode)}
                  className="flex-1 py-3.5 text-xs font-black tracking-widest uppercase transition-all duration-200"
                  style={{
                    background: gameMode === mode
                      ? 'linear-gradient(135deg, #7c3aed33, #2563eb22)'
                      : 'transparent',
                    color: gameMode === mode ? '#a78bfa' : '#ffffff40',
                    borderBottom: gameMode === mode ? '2px solid #7c3aed' : '2px solid transparent',
                  }}
                >
                  {mode === 'bots' ? '🤖 vs Bots' : '👥 vs Players'}
                </button>
              ))}
            </div>

            <div className="p-6">

              {/* ── BOT MODE ── */}
              {gameMode === 'bots' && (
                <>
                  <div className="mb-5">
                    <label className="block text-xs uppercase tracking-widest text-blue-300/70 mb-2">Your Name</label>
                    <input
                      type="text"
                      value={humanName}
                      onChange={e => setHumanName(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-lg outline-none focus:border-blue-500/60 transition-colors"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs uppercase tracking-widest text-blue-300/70 mb-3">Your Color</label>
                    <div className="flex gap-3 justify-center">
                      {ALL_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setHumanColor(c)}
                          className="w-12 h-12 rounded-2xl border-4 transition-all duration-200"
                          style={{
                            backgroundColor: COLORS[c],
                            borderColor: humanColor === c ? '#fff' : 'transparent',
                            boxShadow: humanColor === c ? GLOW[c] : 'none',
                            transform: humanColor === c ? 'scale(1.15)' : 'scale(1)',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs uppercase tracking-widest text-blue-300/70 mb-2">
                      Opponents: <span className="text-white font-bold">{numBots}</span> Bot{numBots !== 1 ? 's' : ''}
                    </label>
                    <input
                      type="range" min="1" max="3" value={numBots}
                      onChange={e => setNumBots(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-white/30 mt-1">
                      <span>1</span><span>2</span><span>3</span>
                    </div>
                  </div>
                </>
              )}

              {/* ── PLAYER MODE ── */}
              {gameMode === 'players' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs uppercase tracking-widest text-blue-300/70">
                      Players <span className="text-white font-bold">({humanSlots.length}/4)</span>
                    </label>
                    {humanSlots.length < 4 && (
                      <button
                        onClick={addPlayer}
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-bold tracking-wide transition-colors px-2 py-1 rounded-lg hover:bg-purple-500/10"
                      >
                        <span className="text-base leading-none">＋</span> Add Player
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {humanSlots.map((slot, idx) => (
                      <PlayerRow
                        key={idx}
                        index={idx}
                        slot={slot}
                        onChange={s => updateSlot(idx, s)}
                        takenColors={takenColorsFor(idx)}
                        removable={humanSlots.length > 2}
                        onRemove={() => removePlayer(idx)}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-white/20 text-center mt-3 tracking-wide">
                    Pass the device — take turns rolling!
                  </p>
                </div>
              )}

              {/* Launch button */}
              <button
                onClick={startGame}
                className="w-full py-4 rounded-2xl text-lg font-black tracking-widest uppercase transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                  boxShadow: '0 0 30px #7c3aed66',
                }}
              >
                🛸 Launch Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYING SCREEN ────────────────────────────────────────────────── */}
      {gamePhase === 'playing' && (
        <>
          {/* Top Bar */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <button onClick={resetGame} className="text-xl opacity-60 hover:opacity-100 transition-opacity">⬅</button>
            <div className="text-sm font-black tracking-[0.25em] opacity-80">SPACE LUDO</div>
            <div
              className="text-xs px-3 py-1 rounded-full border"
              style={{
                borderColor: currentPlayer ? COLORS[currentPlayer.color] + '66' : '#fff3',
                color: currentPlayer ? COLORS[currentPlayer.color] : '#fff',
              }}
            >
              Turn {currentTurnIndex + 1}
            </div>
          </div>

          {/* Message bar */}
          <div
            className="text-center py-1 text-xs font-semibold tracking-wide px-4 min-h-[28px] transition-colors duration-300"
            style={{ color: currentPlayer ? COLORS[currentPlayer.color] : '#fff' }}
          >
            {message}
          </div>

          {/* Board + overlaid player cards */}
          <div className="flex flex-col items-center justify-start">
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{
                width: boardPx,
                height: boardPx,
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: '0 0 40px #3b82f622, 0 20px 60px #00000080',
              }}
            >
              <BoardSVG cellSize={cellSize} />

              {/* Pieces */}
              {pieces.map(piece => {
                const [px, py] = getPosition(piece, cellSize);
                const isMovable = movablePieces.includes(piece.id);
                const finished = piece.steps >= 57;
                const pieceSize = Math.max(18, cellSize * 0.72);
                return (
                  <div
                    key={piece.id}
                    className="absolute flex items-center justify-center cursor-pointer transition-all duration-75"
                    style={{
                      left: px, top: py,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isMovable ? 20 : 10,
                      pointerEvents: isMovable ? 'auto' : 'none',
                    }}
                    onClick={() => handlePieceClick(piece.id)}
                  >
                    {isMovable && (
                      <div
                        className="absolute rounded-full animate-ping"
                        style={{ width: pieceSize * 1.5, height: pieceSize * 1.5, border: `2px solid ${COLORS[piece.color]}`, opacity: 0.5 }}
                      />
                    )}
                    <div
                      className="rounded-full flex items-center justify-center border-2 shadow-lg transition-all duration-200"
                      style={{
                        width: pieceSize, height: pieceSize,
                        fontSize: pieceSize * 0.55,
                        backgroundColor: COLORS[piece.color],
                        borderColor: isMovable ? '#fff' : '#000',
                        boxShadow: isMovable ? GLOW[piece.color] : 'none',
                        opacity: finished ? 0.4 : 1,
                        transform: isMovable ? 'scale(1.2)' : 'scale(1)',
                      }}
                    >
                      {finished ? '✓' : '👽'}
                    </div>
                  </div>
                );
              })}

              {/* Explosions */}
              {explosions.map(ex => (
                <div
                  key={ex.id}
                  className="absolute pointer-events-none text-2xl animate-ping"
                  style={{ left: ex.x, top: ex.y, transform: 'translate(-50%,-50%)', zIndex: 50 }}
                >💥</div>
              ))}

              {/* Player cards overlaid in corners */}
              {players.map((p, i) => {
                const pPieces = pieces.filter(pc => pc.playerId === p.id);
                const finishedCount = pPieces.filter(pc => pc.steps >= 57).length;
                const pct = Math.round((finishedCount / 4) * 100);
                const isActive = i === currentTurnIndex;
                // corner positions: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
                const corners = [
                  { top: 4, left: 4 },
                  { top: 4, right: 4 },
                  { bottom: 4, left: 4 },
                  { bottom: 4, right: 4 },
                ];
                const pos = corners[i] || corners[0];
                return (
                  <div
                    key={p.id}
                    className="absolute rounded-xl px-2 py-1 transition-all duration-300"
                    style={{
                      ...pos,
                      background: isActive
                        ? `${COLORS[p.color]}cc`
                        : '#00000088',
                      border: `1.5px solid ${isActive ? '#fff' : COLORS[p.color] + '88'}`,
                      boxShadow: isActive ? `0 0 12px ${COLORS[p.color]}` : 'none',
                      zIndex: 30,
                      minWidth: cellSize * 2.8,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span style={{ fontSize: cellSize * 0.45 }}>{p.isBot ? '🤖' : '👽'}</span>
                      <span className="text-white font-black truncate" style={{ fontSize: cellSize * 0.38, maxWidth: cellSize * 2 }}>{p.name}</span>
                    </div>
                    <div className="text-white/80 font-bold" style={{ fontSize: cellSize * 0.34 }}>{pct}%</div>
                  </div>
                );
              })}
            </div>

            {/* Dice row below board */}
            <div className="flex flex-col items-center gap-1 mt-2">
              <div
                onClick={rollDiceFunc}
                className={`cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150 select-none ${rolling ? 'animate-spin' : ''}`}
                style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))' }}
              >
                <DiceFace value={dice} spinning={rolling} />
              </div>
              <p className="text-xs text-white/30 tracking-widest">
                {currentPlayer?.isBot ? 'Bot is playing...' : 'TAP DICE TO ROLL'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── FINISHED SCREEN ───────────────────────────────────────────────── */}
      {gamePhase === 'finished' && winner && (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center relative overflow-hidden">
          {confetti.map(c => (
            <div
              key={c.id}
              className="absolute w-3 h-3 rounded-sm animate-bounce"
              style={{
                left: `${c.x}%`, top: `${c.y}%`,
                backgroundColor: c.c,
                animationDelay: `${(c.id * 0.07) % 1}s`,
                animationDuration: `${0.6 + (c.id % 5) * 0.2}s`,
              }}
            />
          ))}

          <div className="text-8xl mb-4" style={{ filter: 'drop-shadow(0 0 30px #eab308)' }}>🏆</div>
          <div className="text-8xl mb-6" style={{ filter: `drop-shadow(0 0 20px ${COLORS[winner.color]})` }}>
            {winner.isBot ? '🤖' : '👽'}
          </div>

          <h1 className="text-5xl font-black mb-2 tracking-widest"
            style={{ color: COLORS[winner.color], textShadow: GLOW[winner.color] }}>
            {winner.name}
          </h1>
          <p className="text-2xl mb-2 opacity-80">WINS THE GALAXY!</p>
          <p className="text-sm text-white/40 mb-10 tracking-widest uppercase">Master of the Cosmos</p>

          <button
            onClick={resetGame}
            className="px-10 py-4 rounded-2xl text-lg font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${COLORS[winner.color]}, ${COLORS[winner.color]}99)`,
              boxShadow: GLOW[winner.color],
            }}
          >
            🚀 Play Again
          </button>
        </div>
      )}
    </div>
  );
}
