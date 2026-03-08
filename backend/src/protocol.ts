import type { CellState, Difficulty, PlacementResult, Player, Tile, WordInfo } from './shared/types.js';

// ── Client → Server Events ──────────────────────────────────────

export interface ClientEvents {
  'room:create': (payload: { playerName: string }) => void;
  'room:join': (payload: { roomCode: string; playerName: string }) => void;
  'game:select-difficulty': (payload: { difficulty: Difficulty }) => void;
  'game:place-tile': (payload: { tileId: string; row: number; col: number }) => void;
  'game:end-turn': () => void;
  'game:swap-tiles': () => void;
  'game:skip-turn': () => void;
}

// ── Server → Client Events ──────────────────────────────────────

/** Board cell as sent to clients — solution is null for unfilled cells */
export type SanitizedCell = Omit<CellState, 'solution'> & {
  solution: string | null;
};

export interface GameStartedPayload {
  board: SanitizedCell[][];
  words: WordInfo[];
  yourTiles: Tile[];
  scores: { human: number; ai: number };
  currentTurn: Player;
  poolRemaining: number;
}

export interface TilePlacedPayload {
  result: PlacementResult;
  placedBy: Player;
  scores: { human: number; ai: number };
}

export interface TurnEndedPayload {
  currentTurn: Player;
  yourTiles: Tile[];
  scores: { human: number; ai: number };
  poolRemaining: number;
}

export interface GameOverPayload {
  reason: string;
  scores: { human: number; ai: number };
  winner: Player | 'draw';
}

export interface StateSyncPayload {
  board: SanitizedCell[][];
  words: WordInfo[];
  yourTiles: Tile[];
  scores: { human: number; ai: number };
  currentTurn: Player;
  poolRemaining: number;
  turnTimeLeft: number;
}

export interface ServerEvents {
  'room:created': (payload: { roomCode: string }) => void;
  'room:joined': (payload: { hostName: string; guestName: string }) => void;
  'room:error': (payload: { message: string }) => void;
  'room:opponent-disconnected': () => void;
  'room:opponent-reconnected': () => void;
  'room:opponent-left': () => void;
  'game:started': (payload: GameStartedPayload) => void;
  'game:tile-placed': (payload: TilePlacedPayload) => void;
  'game:turn-ended': (payload: TurnEndedPayload) => void;
  'game:timer-tick': (payload: { timeLeft: number }) => void;
  'game:over': (payload: GameOverPayload) => void;
  'game:state-sync': (payload: StateSyncPayload) => void;
}
