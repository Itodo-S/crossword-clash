import { create } from 'zustand';
import type {
  Difficulty,
  GameMode,
  Player,
  Tile,
  PlacementResult,
  ScoreEvent,
  GamePhase,
  AIState,
  GameOverReason,
  WordInfo,
  CellState,
} from '../types/game';
import { BoardEngine } from '../engine/BoardEngine';
import { TilePool } from '../engine/TilePool';
import { AIPlayer } from '../engine/AIPlayer';
import { generateBoard } from '../engine/CrosswordGenerator';
import { soundManager } from '../engine/SoundManager';
import {
  TILES_PER_PLAYER,
  SCORING,
  TURN_TIME,
  MAX_CONSECUTIVE_SKIPS,
} from '../utils/constants';
import { emitPlaceTile, emitEndTurn, emitSwapTiles, emitSkipTurn } from '../socket/useOnlineGame';
import { contractCall, contractCallAsync, readPlayerGameId } from '../utils/contractBridge';

const DIFF_MAP: Record<string, number> = { easy: 0, normal: 1, hard: 2 };
const MODE_MAP: Record<string, number> = { 'vs-ai': 0, 'vs-online': 2 };

// Map local gameOverReason to felt252 result_reason strings
const REASON_MAP: Record<string, string> = {
  'board-full': 'board_full',
  'consecutive-skips': 'consecutive_skips',
  'pool-empty': 'pool_empty',
  'time-up': 'time_up',
  'forfeit': 'forfeit',
};

// ── Contract helpers ────────────────────────────────────────────────
// Fire-and-forget calls — the game engine doesn't block on chain receipts.

/** Get the current game ID from store state. */
function getGameId(): number | null {
  return useGameStore.getState().currentGameId;
}

/** Record points on-chain for either the player or opponent (AI). */
function chainScorePoints(points: number, forOpponent: boolean) {
  const gameId = getGameId();
  if (gameId == null) return;
  contractCall('scorePoints', gameId, points, forOpponent);
}

/** Record a tile placement on-chain. */
function chainPlaceTile(forOpponent: boolean) {
  const gameId = getGameId();
  if (gameId == null) return;
  contractCall('placeTile', gameId, forOpponent);
}

/** Record a word completion on-chain. */
function chainCompleteWord(forOpponent: boolean) {
  const gameId = getGameId();
  if (gameId == null) return;
  contractCall('completeWord', gameId, forOpponent);
}

/** Record end-of-turn on-chain. */
function chainEndTurn() {
  const gameId = getGameId();
  if (gameId == null) return;
  contractCall('endTurn', gameId);
}

/** Record end-of-game on-chain with result_reason. */
function chainEndGame(reason?: string) {
  const gameId = getGameId();
  if (gameId == null) return;
  const resultReason = REASON_MAP[reason ?? ''] ?? 'board_full';
  contractCall('endGame', gameId, resultReason);
}

type GameState = {
  // Game config
  difficulty: Difficulty;
  gameMode: GameMode;

  // On-chain game ID (set after startGame contract call)
  currentGameId: number | null;

  // Core state
  phase: GamePhase;
  board: BoardEngine | null;
  tilePool: TilePool | null;
  aiPlayer: AIPlayer | null;

  // Player state
  humanTiles: Tile[];
  aiTiles: Tile[];
  humanScore: number;
  aiScore: number;
  scoreEvents: ScoreEvent[];

  // Turn state
  currentTurn: Player;
  turnTimeLeft: number;
  consecutiveSkips: number;
  selectedTileId: string | null;
  pendingPlacements: PlacementResult[];
  turnPlacementCount: number;

  // AI
  aiState: AIState;

  // Online pool count (when tilePool is null)
  poolRemaining: number;

  // UI
  completedWords: WordInfo[];
  gameOverReason: GameOverReason | null;
  showWordPopup: WordInfo | null;

  // Actions
  setDifficulty: (d: Difficulty) => void;
  setGameMode: (m: GameMode) => void;
  setCurrentGameId: (id: number | null) => void;
  startGame: () => void;
  selectTile: (tileId: string | null) => void;
  placeTile: (row: number, col: number) => PlacementResult | null;
  endTurn: () => void;
  swapTiles: () => void;
  skipTurn: () => void;
  tickTimer: () => void;
  setAiState: (state: AIState) => void;
  executeAiTurn: () => Promise<void>;
  dismissWordPopup: () => void;
  togglePause: () => void;
  resetGame: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  difficulty: 'normal',
  gameMode: 'vs-ai',
  currentGameId: null,
  phase: 'playing',
  board: null,
  tilePool: null,
  aiPlayer: null,
  humanTiles: [],
  aiTiles: [],
  humanScore: 0,
  aiScore: 0,
  scoreEvents: [],
  currentTurn: 'human',
  turnTimeLeft: TURN_TIME,
  consecutiveSkips: 0,
  selectedTileId: null,
  pendingPlacements: [],
  turnPlacementCount: 0,
  aiState: 'idle',
  poolRemaining: 0,
  completedWords: [],
  gameOverReason: null,
  showWordPopup: null,

  setDifficulty: (d) => set({ difficulty: d }),
  setGameMode: (m) => set({ gameMode: m }),
  setCurrentGameId: (id) => set({ currentGameId: id }),

  startGame: () => {
    const { difficulty, gameMode } = get();
    const { cells, words } = generateBoard(difficulty);
    const board = new BoardEngine(cells, words);
    const pool = new TilePool(cells);
    const ai = gameMode === 'vs-ai' ? new AIPlayer(difficulty) : null;

    const humanTiles = pool.drawTiles(TILES_PER_PLAYER, 'human');
    const aiTiles = pool.drawTiles(TILES_PER_PLAYER, 'ai');

    soundManager.init();

    set({
      phase: 'playing',
      board,
      tilePool: pool,
      aiPlayer: ai,
      humanTiles,
      aiTiles,
      humanScore: 0,
      aiScore: 0,
      scoreEvents: [],
      currentTurn: 'human',
      turnTimeLeft: TURN_TIME,
      consecutiveSkips: 0,
      selectedTileId: null,
      pendingPlacements: [],
      turnPlacementCount: 0,
      aiState: 'idle',
      completedWords: [],
      gameOverReason: null,
      showWordPopup: null,
    });

    // Call startGame on-chain, then read back the assigned game_id.
    const diffNum = DIFF_MAP[difficulty] ?? 1;
    const modeNum = MODE_MAP[gameMode] ?? 0;
    (async () => {
      const tx = await contractCallAsync('startGame', diffNum, modeNum);
      if (tx) {
        const gameId = await readPlayerGameId();
        if (gameId) {
          useGameStore.getState().setCurrentGameId(gameId);
        }
      }
    })();

    soundManager.play('turn-start');
  },

  selectTile: (tileId) => {
    if (tileId) soundManager.play('tile-pickup');
    set({ selectedTileId: tileId });
  },

  placeTile: (row, col) => {
    const state = get();
    if (!state.board || !state.selectedTileId) return null;

    // Online mode: emit to server, don't mutate locally
    // Contract calls happen in useOnlineGame when server confirms the result
    if (state.gameMode === 'vs-online') {
      if (state.currentTurn !== 'human') return null;
      const tile = state.humanTiles.find(t => t.id === state.selectedTileId);
      if (!tile) return null;
      emitPlaceTile(tile.id, row, col);
      set({ selectedTileId: null });
      return null;
    }

    const player = state.currentTurn;

    if (player !== 'human') return null;

    const tiles = player === 'human' ? state.humanTiles : state.aiTiles;
    const tile = tiles.find(t => t.id === state.selectedTileId);
    if (!tile) return null;

    if (!state.board.isCellEmpty(row, col)) return null;

    const result = state.board.placeTile(row, col, tile.letter, player);
    const isOpponent = player !== 'human';

    if (result.correct) {
      soundManager.play('tile-place-correct');

      const placementCount = state.turnPlacementCount + 1;
      let points = SCORING.CORRECT_TILE;
      if (placementCount > 1) {
        points += SCORING.CONSECUTIVE_BONUS * (placementCount - 1);
      }

      const newEvents: ScoreEvent[] = [
        { points, reason: 'Correct placement', player },
      ];

      // ── On-chain: score the tile placement points ──
      chainScorePoints(points, isOpponent);
      chainPlaceTile(isOpponent);

      for (const word of result.wordsCompleted) {
        let wordBonus: number = SCORING.WORD_COMPLETE;
        if (word.length >= SCORING.LONG_WORD_MIN_LENGTH) {
          wordBonus = Math.floor(wordBonus * SCORING.LONG_WORD_MULTIPLIER);
        }
        newEvents.push({
          points: wordBonus,
          reason: `Completed "${word.word}"`,
          player,
        });

        // ── On-chain: score the word completion bonus ──
        chainScorePoints(wordBonus, isOpponent);
        chainCompleteWord(isOpponent);

        soundManager.play('word-complete');
      }

      const totalPoints = newEvents.reduce((sum, e) => sum + e.points, 0);

      const scoreKey = player === 'human' ? 'humanScore' : 'aiScore';
      const tilesKey = player === 'human' ? 'humanTiles' : 'aiTiles';

      set((s) => ({
        [tilesKey]: (s[tilesKey] as Tile[]).filter(t => t.id !== tile.id),
        [scoreKey]: (s[scoreKey] as number) + totalPoints,
        scoreEvents: [...s.scoreEvents, ...newEvents],
        selectedTileId: null,
        pendingPlacements: [...s.pendingPlacements, result],
        turnPlacementCount: placementCount,
        showWordPopup: result.wordsCompleted.length > 0 ? result.wordsCompleted[0] : s.showWordPopup,
        completedWords: [...s.completedWords, ...result.wordsCompleted],
      }));
    } else {
      soundManager.play('tile-place-wrong');

      const scoreKey = player === 'human' ? 'humanScore' : 'aiScore';

      // ── On-chain: record the wrong tile placement immediately ──
      chainPlaceTile(isOpponent);

      set((s) => ({
        [scoreKey]: (s[scoreKey] as number) + SCORING.WRONG_ATTEMPT,
        scoreEvents: [
          ...s.scoreEvents,
          { points: SCORING.WRONG_ATTEMPT, reason: 'Wrong placement', player },
        ],
        selectedTileId: null,
      }));
    }

    // Check game over
    setTimeout(() => {
      const s = get();
      if (s.board?.isBoardFull()) {
        set({ phase: 'game-over', gameOverReason: 'board-full' });
        soundManager.play('game-over');
        chainEndGame('board-full');
      }
    }, 100);

    return result;
  },

  endTurn: () => {
    const state = get();

    // Online mode: emit to server
    if (state.gameMode === 'vs-online') {
      chainEndTurn();
      emitEndTurn();
      return;
    }

    if (!state.tilePool || !state.board) return;

    const newEvents: ScoreEvent[] = [];
    const player = state.currentTurn;
    const isOpponent = player !== 'human';

    // All tiles used bonus
    const tiles = player === 'human' ? state.humanTiles : state.aiTiles;
    if (tiles.length === 0 && state.turnPlacementCount > 0) {
      newEvents.push({
        points: SCORING.ALL_TILES_BONUS,
        reason: 'All tiles used!',
        player,
      });
      // ── On-chain: score the all-tiles bonus ──
      chainScorePoints(SCORING.ALL_TILES_BONUS, isOpponent);
    }

    // Fast turn bonus
    if (state.turnTimeLeft > TURN_TIME - SCORING.FAST_TURN_THRESHOLD && state.turnPlacementCount > 0) {
      newEvents.push({
        points: SCORING.FAST_TURN_BONUS,
        reason: 'Fast turn!',
        player,
      });
      // ── On-chain: score the fast-turn bonus ──
      chainScorePoints(SCORING.FAST_TURN_BONUS, isOpponent);
    }

    const bonusPoints = newEvents.reduce((sum, e) => sum + e.points, 0);

    // Refill tiles
    const currentTiles = player === 'human' ? state.humanTiles : state.aiTiles;
    const refilled = state.tilePool.refillHand(currentTiles, player);

    const poolEmpty = state.tilePool.isEmpty;
    const otherTiles = player === 'human' ? state.aiTiles : state.humanTiles;

    // Switch turn
    const nextTurn: Player = player === 'human' ? 'ai' : 'human';

    const update: Partial<GameState> = {
      currentTurn: nextTurn,
      turnTimeLeft: TURN_TIME,
      turnPlacementCount: 0,
      pendingPlacements: [],
      selectedTileId: null,
      consecutiveSkips: state.turnPlacementCount === 0 ? state.consecutiveSkips + 1 : 0,
      scoreEvents: [...state.scoreEvents, ...newEvents],
    };

    if (player === 'human') {
      update.humanTiles = refilled;
      update.humanScore = state.humanScore + bonusPoints;
    } else {
      update.aiTiles = refilled;
      update.aiScore = state.aiScore + bonusPoints;
    }

    set(update as GameState);

    // ── On-chain: record end of turn ──
    chainEndTurn();

    // Check game over conditions
    const s = get();
    if (s.consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
      set({ phase: 'game-over', gameOverReason: 'consecutive-skips' });
      soundManager.play('game-over');
      chainEndGame('consecutive-skips');
      return;
    }
    if (poolEmpty && refilled.length === 0 && otherTiles.length === 0) {
      set({ phase: 'game-over', gameOverReason: 'pool-empty' });
      soundManager.play('game-over');
      chainEndGame('pool-empty');
      return;
    }

    soundManager.play('turn-start');
  },

  swapTiles: () => {
    const state = get();

    // Online mode: emit to server
    if (state.gameMode === 'vs-online') {
      const gameId = getGameId();
      if (gameId != null) contractCall('swapTiles', gameId);
      soundManager.play('swap-tiles');
      emitSwapTiles();
      return;
    }

    if (!state.tilePool) return;
    if (state.tilePool.isEmpty) return;

    const player = state.currentTurn;
    if (state.gameMode === 'vs-ai' && player !== 'human') return;

    soundManager.play('swap-tiles');
    const tiles = player === 'human' ? state.humanTiles : state.aiTiles;
    const newTiles = state.tilePool.swapTiles(tiles, player);

    if (player === 'human') {
      set({ humanTiles: newTiles });
    } else {
      set({ aiTiles: newTiles });
    }

    // ── On-chain: swap_tiles already increments turns_taken,
    // so we call swap_tiles instead of endTurn to avoid double-increment ──
    const gameId = getGameId();
    if (gameId != null) contractCall('swapTiles', gameId);

    // End the turn locally (switches turn, refills, etc.) but skip the
    // on-chain endTurn call since swap_tiles handles turns_taken.
    // We inline the local turn-switch logic here:
    const nextTurn: Player = player === 'human' ? 'ai' : 'human';
    set({
      currentTurn: nextTurn,
      turnTimeLeft: TURN_TIME,
      turnPlacementCount: 0,
      pendingPlacements: [],
      selectedTileId: null,
      consecutiveSkips: 0, // swap counts as action, resets skips
    });
    soundManager.play('turn-start');
  },

  skipTurn: () => {
    const state = get();

    // Online mode: emit to server
    if (state.gameMode === 'vs-online') {
      const gameId = getGameId();
      if (gameId != null) contractCall('skipTurn', gameId);
      emitSkipTurn();
      return;
    }

    // ── On-chain: skip_turn already increments turns_taken,
    // so we call skip_turn instead of endTurn to avoid double-increment ──
    {
      const gameId = getGameId();
      if (gameId != null) contractCall('skipTurn', gameId);
    }

    // End the turn locally (switches turn, refills, etc.) but skip the
    // on-chain endTurn call since skip_turn handles turns_taken.
    if (!state.tilePool || !state.board) return;

    const player = state.currentTurn;
    const currentTiles = player === 'human' ? state.humanTiles : state.aiTiles;
    const refilled = state.tilePool.refillHand(currentTiles, player);
    const poolEmpty = state.tilePool.isEmpty;
    const otherTiles = player === 'human' ? state.aiTiles : state.humanTiles;
    const nextTurn: Player = player === 'human' ? 'ai' : 'human';

    const newSkips = state.consecutiveSkips + 1;

    const update: Partial<GameState> = {
      currentTurn: nextTurn,
      turnTimeLeft: TURN_TIME,
      turnPlacementCount: 0,
      pendingPlacements: [],
      selectedTileId: null,
      consecutiveSkips: newSkips,
    };

    if (player === 'human') {
      update.humanTiles = refilled;
    } else {
      update.aiTiles = refilled;
    }

    set(update as GameState);

    // Check game over conditions
    if (newSkips >= MAX_CONSECUTIVE_SKIPS) {
      set({ phase: 'game-over', gameOverReason: 'consecutive-skips' });
      soundManager.play('game-over');
      chainEndGame('consecutive-skips');
      return;
    }
    if (poolEmpty && refilled.length === 0 && otherTiles.length === 0) {
      set({ phase: 'game-over', gameOverReason: 'pool-empty' });
      soundManager.play('game-over');
      chainEndGame('pool-empty');
      return;
    }

    soundManager.play('turn-start');
  },

  tickTimer: () => {
    const state = get();
    if (state.phase !== 'playing') return;
    // Online mode: server drives the timer — no-op
    if (state.gameMode === 'vs-online') return;

    const newTime = state.turnTimeLeft - 1;
    if (newTime <= 10 && newTime > 0) {
      soundManager.play('timer-warning');
    }
    if (newTime <= 0) {
      get().endTurn();
      return;
    }
    set({ turnTimeLeft: newTime });
  },

  setAiState: (aiState) => set({ aiState }),

  executeAiTurn: async () => {
    const state = get();
    if (!state.board || !state.aiPlayer || state.currentTurn !== 'ai') return;
    if (state.gameMode !== 'vs-ai') return;

    set({ aiState: 'thinking' });

    const thinkTime = state.aiPlayer.getThinkTime();
    await new Promise(r => setTimeout(r, thinkTime));

    const moves = state.aiPlayer.computeMoves(state.aiTiles, state.board);

    if (moves.length === 0) {
      set({ aiState: 'idle' });
      get().endTurn();
      return;
    }

    set({ aiState: 'placing' });

    let placementCount = 0;
    const newEvents: ScoreEvent[] = [];
    let turnPoints = 0;

    for (const move of moves) {
      await new Promise(r => setTimeout(r, AIPlayer.getTileRevealDelay()));

      const s = get();
      if (!s.board || s.phase !== 'playing') break;

      const result = s.board.placeTile(move.row, move.col, move.letter, 'ai');
      if (result.correct) {
        soundManager.play('tile-place-correct');
        placementCount++;

        let points = SCORING.CORRECT_TILE;
        if (placementCount > 1) {
          points += SCORING.CONSECUTIVE_BONUS * (placementCount - 1);
        }
        turnPoints += points;
        newEvents.push({ points, reason: 'AI correct placement', player: 'ai' });

        // ── On-chain: score AI tile placement ──
        chainScorePoints(points, true);
        chainPlaceTile(true);

        for (const word of result.wordsCompleted) {
          let wordBonus: number = SCORING.WORD_COMPLETE;
          if (word.length >= SCORING.LONG_WORD_MIN_LENGTH) {
            wordBonus = Math.floor(wordBonus * SCORING.LONG_WORD_MULTIPLIER);
          }
          turnPoints += wordBonus;
          newEvents.push({
            points: wordBonus,
            reason: `AI completed "${word.word}"`,
            player: 'ai',
          });

          // ── On-chain: score AI word completion ──
          chainScorePoints(wordBonus, true);
          chainCompleteWord(true);

          soundManager.play('word-complete');
        }

        set((s) => ({
          aiTiles: s.aiTiles.filter(t => t.id !== move.tileId),
          aiScore: s.aiScore + turnPoints,
          turnPlacementCount: placementCount,
          completedWords: [...s.completedWords, ...result.wordsCompleted],
          showWordPopup: result.wordsCompleted.length > 0 ? result.wordsCompleted[0] : s.showWordPopup,
        }));

        turnPoints = 0;
      }
    }

    set((s) => ({
      scoreEvents: [...s.scoreEvents, ...newEvents],
      aiState: 'idle',
    }));

    const s = get();
    if (s.board?.isBoardFull()) {
      set({ phase: 'game-over', gameOverReason: 'board-full' });
      soundManager.play('game-over');
      chainEndGame('board-full');
      return;
    }

    get().endTurn();
  },

  dismissWordPopup: () => set({ showWordPopup: null }),

  togglePause: () => {
    const state = get();
    if (state.phase === 'playing') {
      set({ phase: 'paused' });
    } else if (state.phase === 'paused') {
      set({ phase: 'playing' });
    }
  },

  resetGame: () => {
    soundManager.stopMusic();
    set({
      phase: 'playing',
      currentGameId: null,
      board: null,
      tilePool: null,
      aiPlayer: null,
      humanTiles: [],
      aiTiles: [],
      humanScore: 0,
      aiScore: 0,
      scoreEvents: [],
      currentTurn: 'human',
      turnTimeLeft: TURN_TIME,
      consecutiveSkips: 0,
      selectedTileId: null,
      pendingPlacements: [],
      turnPlacementCount: 0,
      aiState: 'idle',
      poolRemaining: 0,
      completedWords: [],
      gameOverReason: null,
      showWordPopup: null,
    });
  },
}));
