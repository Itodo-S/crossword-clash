import type { Server } from 'socket.io';
import type { Difficulty, Player, Tile, PlacementResult, CellState, WordInfo } from './shared/types.js';
import type { SanitizedCell, GameStartedPayload, TilePlacedPayload, TurnEndedPayload, GameOverPayload, StateSyncPayload } from './protocol.js';
import { BoardEngine } from './shared/BoardEngine.js';
import { TilePool } from './shared/TilePool.js';
import { generateBoard } from './shared/CrosswordGenerator.js';
import { SCORING, TURN_TIME, MAX_CONSECUTIVE_SKIPS, TILES_PER_PLAYER } from './shared/constants.js';
import { DISCONNECT_GRACE_MS } from './config.js';

export type RoomStatus = 'waiting' | 'playing' | 'finished';
type PlayerSlot = 'host' | 'guest';

interface PlayerInfo {
  socketId: string;
  name: string;
  connected: boolean;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export class Room {
  code: string;
  status: RoomStatus = 'waiting';
  createdAt = Date.now();

  host: PlayerInfo;
  guest: PlayerInfo | null = null;

  // Game state
  private board: BoardEngine | null = null;
  private tilePool: TilePool | null = null;
  private hostTiles: Tile[] = [];
  private guestTiles: Tile[] = [];
  private hostScore = 0;
  private guestScore = 0;
  private currentTurn: PlayerSlot = 'host';
  private turnTimeLeft = TURN_TIME;
  private turnTimer: ReturnType<typeof setInterval> | null = null;
  private turnPlacementCount = 0;
  private consecutiveSkips = 0;
  private turnStartTime = 0;
  private difficulty: Difficulty = 'normal';

  constructor(code: string, hostSocketId: string, hostName: string, difficulty: Difficulty) {
    this.code = code;
    this.host = { socketId: hostSocketId, name: hostName, connected: true };
    this.difficulty = difficulty;
  }

  // ── Join / Leave ────────────────────────────────────────────

  join(socketId: string, name: string, io: Server): boolean {
    if (this.guest !== null) return false;
    if (this.status !== 'waiting') return false;

    this.guest = { socketId, name, connected: true };

    // Auto-start the game since difficulty was set at room creation
    this.startGame(io);
    return true;
  }

  getSlot(socketId: string): PlayerSlot | null {
    if (this.host.socketId === socketId) return 'host';
    if (this.guest?.socketId === socketId) return 'guest';
    return null;
  }

  getPlayerBySlot(slot: PlayerSlot): PlayerInfo | null {
    return slot === 'host' ? this.host : this.guest;
  }

  // ── Game Start ──────────────────────────────────────────────

  startGame(io: Server): void {
    if (this.status !== 'waiting') return;
    if (!this.guest) return;

    this.status = 'playing';

    const { cells, words } = generateBoard(this.difficulty);
    this.board = new BoardEngine(cells, words);
    this.tilePool = new TilePool(cells);

    // Draw tiles — using 'human' owner for both since each player sees themselves as 'human'
    this.hostTiles = this.tilePool.drawTiles(TILES_PER_PLAYER, 'human');
    this.guestTiles = this.tilePool.drawTiles(TILES_PER_PLAYER, 'human');

    this.hostScore = 0;
    this.guestScore = 0;
    this.currentTurn = 'host';
    this.turnTimeLeft = TURN_TIME;
    this.turnPlacementCount = 0;
    this.consecutiveSkips = 0;
    this.turnStartTime = Date.now();

    // Send personalized game:started to each player
    const hostPayload = this.buildGameStartedPayload('host');
    const guestPayload = this.buildGameStartedPayload('guest');

    io.to(this.host.socketId).emit('game:started', hostPayload);
    io.to(this.guest.socketId).emit('game:started', guestPayload);

    // Start server-authoritative timer
    this.startTurnTimer(io);
  }

  private buildGameStartedPayload(forSlot: PlayerSlot): GameStartedPayload {
    return {
      board: this.sanitizeBoard(forSlot),
      words: this.board!.words,
      yourTiles: forSlot === 'host' ? this.hostTiles : this.guestTiles,
      scores: this.getScores(forSlot),
      currentTurn: this.mapTurnForPlayer(forSlot),
      poolRemaining: this.tilePool!.remaining,
    };
  }

  // ── Tile Placement ──────────────────────────────────────────

  placeTile(socketId: string, tileId: string, row: number, col: number, io: Server): void {
    if (this.status !== 'playing' || !this.board) return;

    const slot = this.getSlot(socketId);
    if (!slot) return;
    if (slot !== this.currentTurn) return; // Not your turn

    const tiles = slot === 'host' ? this.hostTiles : this.guestTiles;
    const tile = tiles.find(t => t.id === tileId);
    if (!tile) return; // Tile not in hand

    if (!this.board.isCellEmpty(row, col)) return; // Cell not available

    // The placedBy in board uses 'human'/'ai' mapping
    // For the board, host's placements = 'human', guest's = 'ai'
    const boardPlayer: Player = slot === 'host' ? 'human' : 'ai';
    const result = this.board.placeTile(row, col, tile.letter, boardPlayer);

    if (result.correct) {
      this.turnPlacementCount++;
      let points = SCORING.CORRECT_TILE;
      if (this.turnPlacementCount > 1) {
        points += SCORING.CONSECUTIVE_BONUS * (this.turnPlacementCount - 1);
      }

      // Word completion bonuses
      for (const word of result.wordsCompleted) {
        let wordBonus: number = SCORING.WORD_COMPLETE;
        if (word.length >= SCORING.LONG_WORD_MIN_LENGTH) {
          wordBonus = Math.floor(wordBonus * SCORING.LONG_WORD_MULTIPLIER);
        }
        points += wordBonus;
      }

      // Update score
      if (slot === 'host') {
        this.hostScore += points;
        this.hostTiles = this.hostTiles.filter(t => t.id !== tileId);
      } else {
        this.guestScore += points;
        this.guestTiles = this.guestTiles.filter(t => t.id !== tileId);
      }
    } else {
      // Wrong placement penalty
      if (slot === 'host') {
        this.hostScore += SCORING.WRONG_ATTEMPT;
      } else {
        this.guestScore += SCORING.WRONG_ATTEMPT;
      }
    }

    // Broadcast to both players
    const hostPayload: TilePlacedPayload = {
      result,
      placedBy: this.mapTurnForPlayer('host'),
      scores: this.getScores('host'),
    };
    const guestPayload: TilePlacedPayload = {
      result,
      placedBy: this.mapTurnForPlayer('guest'),
      scores: this.getScores('guest'),
    };

    io.to(this.host.socketId).emit('game:tile-placed', hostPayload);
    if (this.guest) {
      io.to(this.guest.socketId).emit('game:tile-placed', guestPayload);
    }

    // Check board full
    if (result.correct && this.board.isBoardFull()) {
      this.endGame('board-full', io);
    }
  }

  // ── End Turn ────────────────────────────────────────────────

  endTurn(socketId: string, io: Server): void {
    if (this.status !== 'playing' || !this.tilePool || !this.board) return;

    const slot = this.getSlot(socketId);
    if (!slot) return;
    if (slot !== this.currentTurn) return;

    this.processEndTurn(io);
  }

  private processEndTurn(io: Server): void {
    if (!this.tilePool || !this.board) return;

    const slot = this.currentTurn;
    let bonusPoints = 0;

    // All tiles used bonus
    const tiles = slot === 'host' ? this.hostTiles : this.guestTiles;
    if (tiles.length === 0 && this.turnPlacementCount > 0) {
      bonusPoints += SCORING.ALL_TILES_BONUS;
    }

    // Fast turn bonus
    const elapsed = (Date.now() - this.turnStartTime) / 1000;
    if (elapsed < SCORING.FAST_TURN_THRESHOLD && this.turnPlacementCount > 0) {
      bonusPoints += SCORING.FAST_TURN_BONUS;
    }

    if (slot === 'host') {
      this.hostScore += bonusPoints;
    } else {
      this.guestScore += bonusPoints;
    }

    // Refill tiles
    const currentTiles = slot === 'host' ? this.hostTiles : this.guestTiles;
    const refilled = this.tilePool.refillHand(currentTiles, 'human');
    if (slot === 'host') {
      this.hostTiles = refilled;
    } else {
      this.guestTiles = refilled;
    }

    // Track consecutive skips
    this.consecutiveSkips = this.turnPlacementCount === 0 ? this.consecutiveSkips + 1 : 0;

    // Switch turn
    const poolEmpty = this.tilePool.isEmpty;
    const otherSlot: PlayerSlot = slot === 'host' ? 'guest' : 'host';
    const otherTiles = otherSlot === 'host' ? this.hostTiles : this.guestTiles;

    this.currentTurn = otherSlot;
    this.turnTimeLeft = TURN_TIME;
    this.turnPlacementCount = 0;
    this.turnStartTime = Date.now();

    // Check game over conditions
    if (this.consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
      this.endGame('consecutive-skips', io);
      return;
    }
    if (poolEmpty && refilled.length === 0 && otherTiles.length === 0) {
      this.endGame('pool-empty', io);
      return;
    }

    // Send personalized turn-ended to each player
    const hostPayload: TurnEndedPayload = {
      currentTurn: this.mapTurnForPlayer('host'),
      yourTiles: this.hostTiles,
      scores: this.getScores('host'),
      poolRemaining: this.tilePool.remaining,
    };
    const guestPayload: TurnEndedPayload = {
      currentTurn: this.mapTurnForPlayer('guest'),
      yourTiles: this.guestTiles,
      scores: this.getScores('guest'),
      poolRemaining: this.tilePool.remaining,
    };

    io.to(this.host.socketId).emit('game:turn-ended', hostPayload);
    if (this.guest) {
      io.to(this.guest.socketId).emit('game:turn-ended', guestPayload);
    }

    // Restart timer
    this.startTurnTimer(io);
  }

  // ── Swap Tiles ──────────────────────────────────────────────

  swapTiles(socketId: string, io: Server): void {
    if (this.status !== 'playing' || !this.tilePool) return;

    const slot = this.getSlot(socketId);
    if (!slot) return;
    if (slot !== this.currentTurn) return;
    if (this.tilePool.isEmpty) return;

    const tiles = slot === 'host' ? this.hostTiles : this.guestTiles;
    const newTiles = this.tilePool.swapTiles(tiles, 'human');
    if (slot === 'host') {
      this.hostTiles = newTiles;
    } else {
      this.guestTiles = newTiles;
    }

    this.processEndTurn(io);
  }

  // ── Skip Turn ───────────────────────────────────────────────

  skipTurn(socketId: string, io: Server): void {
    if (this.status !== 'playing') return;

    const slot = this.getSlot(socketId);
    if (!slot) return;
    if (slot !== this.currentTurn) return;

    this.processEndTurn(io);
  }

  // ── Timer ───────────────────────────────────────────────────

  private startTurnTimer(io: Server): void {
    this.stopTurnTimer();
    this.turnTimeLeft = TURN_TIME;

    this.turnTimer = setInterval(() => {
      this.turnTimeLeft--;

      // Broadcast tick to both players
      io.to(this.host.socketId).emit('game:timer-tick', { timeLeft: this.turnTimeLeft });
      if (this.guest) {
        io.to(this.guest.socketId).emit('game:timer-tick', { timeLeft: this.turnTimeLeft });
      }

      if (this.turnTimeLeft <= 0) {
        this.processEndTurn(io);
      }
    }, 1000);
  }

  private stopTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  // ── Game Over ───────────────────────────────────────────────

  private endGame(reason: string, io: Server): void {
    this.status = 'finished';
    this.stopTurnTimer();

    // Determine winner from each player's perspective
    const hostPayload: GameOverPayload = {
      reason,
      scores: this.getScores('host'),
      winner: this.getWinner('host'),
    };
    const guestPayload: GameOverPayload = {
      reason,
      scores: this.getScores('guest'),
      winner: this.getWinner('guest'),
    };

    io.to(this.host.socketId).emit('game:over', hostPayload);
    if (this.guest) {
      io.to(this.guest.socketId).emit('game:over', guestPayload);
    }
  }

  // ── Disconnect / Reconnect ──────────────────────────────────

  handleDisconnect(socketId: string, io: Server): void {
    const slot = this.getSlot(socketId);
    if (!slot) return;

    const player = this.getPlayerBySlot(slot)!;
    player.connected = false;

    // Notify opponent
    const opponent = slot === 'host' ? this.guest : this.host;
    if (opponent && opponent.connected) {
      io.to(opponent.socketId).emit('room:opponent-disconnected');
    }

    // Pause timer if it's the disconnected player's turn
    if (this.status === 'playing' && this.currentTurn === slot) {
      this.stopTurnTimer();
    }

    // Start grace period
    player.disconnectTimer = setTimeout(() => {
      // Grace period expired — forfeit
      if (!player.connected) {
        if (this.status === 'playing') {
          this.endGame('opponent-left', io);
        }
        if (opponent && opponent.connected) {
          io.to(opponent.socketId).emit('room:opponent-left');
        }
      }
    }, DISCONNECT_GRACE_MS);
  }

  handleReconnect(socketId: string, playerName: string, io: Server): StateSyncPayload | null {
    // Find the slot by name match
    let slot: PlayerSlot | null = null;
    if (this.host.name === playerName) {
      slot = 'host';
    } else if (this.guest?.name === playerName) {
      slot = 'guest';
    }
    if (!slot) return null;

    const player = this.getPlayerBySlot(slot)!;

    // Clear grace timer
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = undefined;
    }

    // Re-associate socket
    player.socketId = socketId;
    player.connected = true;

    // Notify opponent
    const opponent = slot === 'host' ? this.guest : this.host;
    if (opponent && opponent.connected) {
      io.to(opponent.socketId).emit('room:opponent-reconnected');
    }

    // Resume timer if it's this player's turn
    if (this.status === 'playing' && this.currentTurn === slot) {
      this.startTurnTimer(io);
    }

    // Return full state for sync
    if (this.status === 'playing' && this.board) {
      return this.buildStateSyncPayload(slot);
    }

    return null;
  }

  private buildStateSyncPayload(forSlot: PlayerSlot): StateSyncPayload {
    return {
      board: this.sanitizeBoard(forSlot),
      words: this.board!.words,
      yourTiles: forSlot === 'host' ? this.hostTiles : this.guestTiles,
      scores: this.getScores(forSlot),
      currentTurn: this.mapTurnForPlayer(forSlot),
      poolRemaining: this.tilePool!.remaining,
      turnTimeLeft: this.turnTimeLeft,
    };
  }

  // ── Board Sanitization ──────────────────────────────────────

  /**
   * Sanitize the board for a specific player.
   * Black cells: solution = null
   * Empty playable cells: solution = '' (hides the actual letter to prevent cheating)
   * Locked/pre-filled cells: solution = actual letter
   */
  private sanitizeBoard(_forSlot: PlayerSlot): SanitizedCell[][] {
    if (!this.board) return [];

    return this.board.cells.map(row =>
      row.map(cell => {
        // Black cell: solution is genuinely null
        // Locked cell: reveal the solution letter
        // Empty playable cell: send '' to indicate playable without revealing answer
        let sanitizedSolution: string | null = null;
        if (cell.solution === null) {
          sanitizedSolution = null; // black cell
        } else if (cell.isLocked) {
          sanitizedSolution = cell.solution; // filled — show letter
        } else {
          sanitizedSolution = ''; // empty playable — hide letter
        }

        const sanitized: SanitizedCell = {
          row: cell.row,
          col: cell.col,
          solution: sanitizedSolution,
          current: cell.current,
          isPreFilled: cell.isPreFilled,
          isLocked: cell.isLocked,
          placedBy: cell.placedBy,
          wordMemberships: cell.wordMemberships,
          wordStarts: cell.wordStarts,
        };
        return sanitized;
      })
    );
  }

  // ── Score / Turn Mapping ────────────────────────────────────

  /**
   * Map host/guest scores to human/ai from a player's perspective.
   * Each player sees themselves as 'human' and opponent as 'ai'.
   */
  private getScores(forSlot: PlayerSlot): { human: number; ai: number } {
    if (forSlot === 'host') {
      return { human: this.hostScore, ai: this.guestScore };
    }
    return { human: this.guestScore, ai: this.hostScore };
  }

  /**
   * Map currentTurn (host/guest) to human/ai from a player's perspective.
   */
  private mapTurnForPlayer(forSlot: PlayerSlot): Player {
    if (this.currentTurn === forSlot) return 'human';
    return 'ai';
  }

  /**
   * Get winner from a player's perspective.
   */
  private getWinner(forSlot: PlayerSlot): Player | 'draw' {
    const scores = this.getScores(forSlot);
    if (scores.human > scores.ai) return 'human';
    if (scores.ai > scores.human) return 'ai';
    return 'draw';
  }

  // ── Cleanup ─────────────────────────────────────────────────

  destroy(): void {
    this.stopTurnTimer();
    if (this.host.disconnectTimer) clearTimeout(this.host.disconnectTimer);
    if (this.guest?.disconnectTimer) clearTimeout(this.guest.disconnectTimer);
  }

  isStale(): boolean {
    // Room is stale if waiting for >10 minutes or finished for >5 minutes
    const now = Date.now();
    if (this.status === 'waiting' && now - this.createdAt > 10 * 60 * 1000) return true;
    if (this.status === 'finished' && now - this.createdAt > 5 * 60 * 1000) return true;
    return false;
  }
}
