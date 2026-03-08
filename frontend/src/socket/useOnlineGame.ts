import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from './socketClient';
import { useOnlineStore } from '../store/onlineStore';
import { useGameStore } from '../store/gameStore';
import { BoardEngine } from '../engine/BoardEngine';
import { soundManager } from '../engine/SoundManager';
import { contractCall, contractCallAsync, readPlayerGameId } from '../utils/contractBridge';
import type { CellState, Player, Tile, PlacementResult, WordInfo } from '../types/game';

const DIFF_MAP: Record<string, number> = { easy: 0, normal: 1, hard: 2 };

/** Reconstruct CellState[][] from sanitized board (solution may be null for unfilled) */
function reconstructBoard(sanitizedCells: CellState[][], words: WordInfo[]): BoardEngine {
  return new BoardEngine(sanitizedCells, words);
}

export function useOnlineGame() {
  const initialized = useRef(false);
  const onlineStore = useOnlineStore;
  const gameStore = useGameStore;
  const gameMode = useGameStore((s) => s.gameMode);

  useEffect(() => {
    if (gameMode !== 'vs-online') return;
    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket();

    onlineStore.getState().setConnectionStatus('connecting');

    socket.on('connect', () => {
      onlineStore.getState().setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      onlineStore.getState().setConnectionStatus('disconnected');
    });

    // ── Room Events ────────────────────────────────────────

    socket.on('room:created', ({ roomCode }: { roomCode: string }) => {
      onlineStore.getState().setRoomCode(roomCode);
      onlineStore.getState().setIsHost(true);
    });

    socket.on('room:joined', ({ hostName, guestName }: { hostName: string; guestName: string }) => {
      onlineStore.getState().setRoomPlayers(hostName, guestName);
    });

    socket.on('room:error', ({ message }: { message: string }) => {
      onlineStore.getState().setError(message);
    });

    socket.on('room:opponent-disconnected', () => {
      onlineStore.getState().setOpponentDisconnected(true);
    });

    socket.on('room:opponent-reconnected', () => {
      onlineStore.getState().setOpponentDisconnected(false);
    });

    socket.on('room:opponent-left', () => {
      onlineStore.getState().setOpponentDisconnected(false);
      // Game over — opponent left
      gameStore.setState({
        phase: 'game-over',
        gameOverReason: 'opponent-left',
      });
      // On-chain: end the game with forfeit reason
      const gameId = gameStore.getState().currentGameId;
      if (gameId != null) contractCall('endGame', gameId, 'forfeit');
    });

    // ── Game Events ────────────────────────────────────────

    socket.on('game:started', (payload: {
      board: CellState[][];
      words: WordInfo[];
      yourTiles: Tile[];
      scores: { human: number; ai: number };
      currentTurn: Player;
      poolRemaining: number;
    }) => {
      const board = reconstructBoard(payload.board, payload.words);

      soundManager.init();
      soundManager.play('turn-start');

      gameStore.setState({
        phase: 'playing',
        board,
        humanTiles: payload.yourTiles,
        aiTiles: [], // We never see opponent's tiles
        humanScore: payload.scores.human,
        aiScore: payload.scores.ai,
        currentTurn: payload.currentTurn,
        turnTimeLeft: 60,
        consecutiveSkips: 0,
        selectedTileId: null,
        pendingPlacements: [],
        turnPlacementCount: 0,
        aiState: 'idle',
        poolRemaining: payload.poolRemaining,
        completedWords: [],
        gameOverReason: null,
        showWordPopup: null,
        scoreEvents: [],
      });

      // On-chain: host calls startGame, then relays the game_id to guest
      const isHost = onlineStore.getState().isHost;
      if (isHost) {
        const difficulty = gameStore.getState().difficulty;
        const diffNum = DIFF_MAP[difficulty] ?? 1;
        (async () => {
          const tx = await contractCallAsync('startGame', diffNum, 2); // mode 2 = vs-online
          if (tx) {
            const gameId = await readPlayerGameId();
            if (gameId) {
              gameStore.getState().setCurrentGameId(gameId);
              // Relay on-chain game ID to guest via server
              getSocket().emit('game:chain-started', { gameId });
            }
          }
        })();
      }
    });

    // Guest receives the on-chain game ID from host and calls joinGame
    socket.on('game:chain-id', ({ gameId }: { gameId: number }) => {
      gameStore.getState().setCurrentGameId(gameId);
      (async () => {
        await contractCallAsync('joinGame', gameId);
      })();
    });

    socket.on('game:tile-placed', (payload: {
      result: PlacementResult;
      placedBy: Player;
      scores: { human: number; ai: number };
    }) => {
      const state = gameStore.getState();
      if (!state.board) return;

      const { result, scores } = payload;
      const isMyMove = payload.placedBy === 'human';

      if (result.correct) {
        // Update the board engine directly for the placed cell
        const cell = state.board.cells[result.cell.row][result.cell.col];
        cell.current = result.letter;
        cell.isLocked = true;
        cell.placedBy = payload.placedBy;
        cell.solution = result.letter;

        // Update word completions
        for (const completedWord of result.wordsCompleted) {
          const word = state.board.words.find(w => w.id === completedWord.id);
          if (word) {
            word.isComplete = true;
            word.completedBy = completedWord.completedBy;
          }
        }

        soundManager.play('tile-place-correct');
        if (result.wordsCompleted.length > 0) {
          soundManager.play('word-complete');
        }

        // On-chain: record MY correct placement + score
        if (isMyMove) {
          const scoreDelta = scores.human - state.humanScore;
          if (scoreDelta > 0) contractCall('scorePoints', state.currentGameId, scoreDelta, false);
          contractCall('placeTile', state.currentGameId, false);
          for (const _word of result.wordsCompleted) {
            contractCall('completeWord', state.currentGameId, false);
          }
        }
      } else {
        soundManager.play('tile-place-wrong');

        // On-chain: record MY wrong placement
        if (isMyMove) {
          contractCall('placeTile', state.currentGameId, false);
        }
      }

      // Create new board reference so React detects the mutation
      const updates: Record<string, unknown> = {
        board: new BoardEngine(state.board.cells, state.board.words),
        humanScore: scores.human,
        aiScore: scores.ai,
      };

      if (result.wordsCompleted.length > 0) {
        updates.completedWords = [
          ...gameStore.getState().completedWords,
          ...result.wordsCompleted,
        ];
        updates.showWordPopup = result.wordsCompleted[0];
      }

      // If it was us placing correctly, remove the tile from our hand
      if (payload.placedBy === 'human' && result.correct) {
        const currentTiles = gameStore.getState().humanTiles;
        const tileIndex = currentTiles.findIndex(t => t.letter === result.letter);
        if (tileIndex >= 0) {
          updates.humanTiles = currentTiles.filter((_, i) => i !== tileIndex);
        }
        updates.turnPlacementCount = gameStore.getState().turnPlacementCount + 1;
      }

      gameStore.setState(updates as any);
    });

    socket.on('game:turn-ended', (payload: {
      currentTurn: Player;
      yourTiles: Tile[];
      scores: { human: number; ai: number };
      poolRemaining: number;
    }) => {
      soundManager.play('turn-start');

      gameStore.setState({
        currentTurn: payload.currentTurn,
        humanTiles: payload.yourTiles,
        humanScore: payload.scores.human,
        aiScore: payload.scores.ai,
        turnTimeLeft: 60,
        turnPlacementCount: 0,
        pendingPlacements: [],
        selectedTileId: null,
        poolRemaining: payload.poolRemaining,
      });
    });

    socket.on('game:timer-tick', ({ timeLeft }: { timeLeft: number }) => {
      if (timeLeft <= 10 && timeLeft > 0) {
        soundManager.play('timer-warning');
      }
      gameStore.setState({ turnTimeLeft: timeLeft });
    });

    socket.on('game:over', (payload: {
      reason: string;
      scores: { human: number; ai: number };
      winner: Player | 'draw';
    }) => {
      soundManager.play('game-over');
      gameStore.setState({
        phase: 'game-over',
        gameOverReason: payload.reason as any,
        humanScore: payload.scores.human,
        aiScore: payload.scores.ai,
      });

      // On-chain: end the game
      const gameId = gameStore.getState().currentGameId;
      if (gameId != null) {
        const reasonMap: Record<string, string> = {
          'board-full': 'board_full',
          'consecutive-skips': 'consecutive_skips',
          'pool-empty': 'pool_empty',
          'time-up': 'time_up',
        };
        contractCall('endGame', gameId, reasonMap[payload.reason] ?? 'board_full');
      }
    });

    socket.on('game:state-sync', (payload: {
      board: CellState[][];
      words: WordInfo[];
      yourTiles: Tile[];
      scores: { human: number; ai: number };
      currentTurn: Player;
      poolRemaining: number;
      turnTimeLeft: number;
    }) => {
      const board = reconstructBoard(payload.board, payload.words);

      gameStore.setState({
        phase: 'playing',
        board,
        humanTiles: payload.yourTiles,
        humanScore: payload.scores.human,
        aiScore: payload.scores.ai,
        currentTurn: payload.currentTurn,
        turnTimeLeft: payload.turnTimeLeft,
        poolRemaining: payload.poolRemaining,
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:error');
      socket.off('room:opponent-disconnected');
      socket.off('room:opponent-reconnected');
      socket.off('room:opponent-left');
      socket.off('game:started');
      socket.off('game:chain-id');
      socket.off('game:tile-placed');
      socket.off('game:turn-ended');
      socket.off('game:timer-tick');
      socket.off('game:over');
      socket.off('game:state-sync');
      initialized.current = false;
    };
  }, [gameMode]);
}

// ── Socket emit helpers ─────────────────────────────────────────

export function emitCreateRoom(playerName: string, difficulty: string) {
  getSocket().emit('room:create', { playerName, difficulty });
}

export function emitJoinRoom(roomCode: string, playerName: string) {
  getSocket().emit('room:join', { roomCode, playerName });
}

export function emitPlaceTile(tileId: string, row: number, col: number) {
  getSocket().emit('game:place-tile', { tileId, row, col });
}

export function emitEndTurn() {
  getSocket().emit('game:end-turn');
}

export function emitSwapTiles() {
  getSocket().emit('game:swap-tiles');
}

export function emitSkipTurn() {
  getSocket().emit('game:skip-turn');
}
