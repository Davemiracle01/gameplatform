export type PieceColor = 'red' | 'blue' | 'green' | 'yellow'
export type PieceStatus = 'home' | 'active' | 'finished'

export interface Piece {
  id: string
  color: PieceColor
  index: number
  position: number // -1=home, 0-51=ring, 52-56=home stretch, 57=done
  status: PieceStatus
}

export interface Player {
  id: string
  name: string
  color: PieceColor
  isHost: boolean
}

export interface GameState {
  players: Player[]
  pieces: Piece[]
  currentPlayerIndex: number
  diceValue: number | null
  diceRolled: boolean
  phase: 'waiting' | 'playing' | 'finished'
  winner: string | null
  lastAction: string | null
}

export const COLORS: PieceColor[] = ['red', 'blue', 'green', 'yellow']

export const COLOR_HEX: Record<PieceColor, string> = {
  red: '#f43f5e',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#f59e0b',
}

export const COLOR_DARK: Record<PieceColor, string> = {
  red: '#4c0519',
  blue: '#1e3a5f',
  green: '#14532d',
  yellow: '#451a03',
}

// Where each color enters the board (index into shared 52-ring)
export const START_SQUARES: Record<PieceColor, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
}

// Safe squares on the ring (0-indexed)
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47])

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function createInitialState(players: Player[]): GameState {
  const pieces: Piece[] = []
  players.forEach((p) => {
    for (let i = 0; i < 4; i++) {
      pieces.push({ id: `${p.color}-${i}`, color: p.color, index: i, position: -1, status: 'home' })
    }
  })
  return {
    players, pieces,
    currentPlayerIndex: 0,
    diceValue: null, diceRolled: false,
    phase: 'playing', winner: null, lastAction: null,
  }
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex]
}

export function absoluteSquare(piece: Piece): number {
  if (piece.position < 0 || piece.position >= 52) return piece.position
  return (START_SQUARES[piece.color] + piece.position) % 52
}

export function getMovablePieces(state: GameState, dice: number): string[] {
  const player = getCurrentPlayer(state)
  return state.pieces
    .filter((p) => p.color === player.color && p.status !== 'finished')
    .filter((p) => {
      if (p.status === 'home') return dice === 6
      return p.position + dice <= 56
    })
    .map((p) => p.id)
}

export function applyMove(state: GameState, pieceId: string, dice: number): GameState {
  const pieces = state.pieces.map((p) => ({ ...p }))
  const idx = pieces.findIndex((p) => p.id === pieceId)
  const piece = pieces[idx]
  const player = getCurrentPlayer(state)
  let extraTurn = dice === 6

  if (piece.status === 'home') {
    piece.position = 0
    piece.status = 'active'
  } else {
    piece.position += dice
  }

  if (piece.position >= 56) {
    piece.position = 56
    piece.status = 'finished'
    extraTurn = true
  }

  let captured = false
  if (piece.status === 'active' && piece.position < 52) {
    const abs = absoluteSquare(piece)
    if (!SAFE_SQUARES.has(abs)) {
      for (let i = 0; i < pieces.length; i++) {
        const other = pieces[i]
        if (other.color !== piece.color && other.status === 'active' && other.position < 52) {
          if (absoluteSquare(other) === abs) {
            pieces[i] = { ...other, position: -1, status: 'home' }
            captured = true
            extraTurn = true
          }
        }
      }
    }
  }

  const finished = pieces.filter((p) => p.color === player.color && p.status === 'finished')
  const winner = finished.length === 4 ? player.id : null
  const nextIndex = extraTurn
    ? state.currentPlayerIndex
    : (state.currentPlayerIndex + 1) % state.players.length

  const action = winner
    ? `🏆 ${player.name} wins the game!`
    : captured ? `${player.name} captured a piece! 🎯`
    : piece.status === 'finished' ? `${player.name} got a piece home! ✅`
    : extraTurn ? `${player.name} rolled ${dice} — extra turn! 🎲`
    : `${player.name} moved ${dice} steps`

  return {
    ...state, pieces,
    currentPlayerIndex: nextIndex,
    diceValue: dice, diceRolled: true,
    phase: winner ? 'finished' : 'playing',
    winner, lastAction: action,
  }
}

export function skipTurn(state: GameState): GameState {
  const player = getCurrentPlayer(state)
  return {
    ...state,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    diceRolled: false, diceValue: null,
    lastAction: `${player.name} has no moves — skipped`,
  }
}

export function resetDiceState(state: GameState): GameState {
  return { ...state, diceRolled: false, diceValue: null }
}
