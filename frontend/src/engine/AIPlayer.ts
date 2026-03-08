import type { Difficulty, Tile, PlacementResult } from '../types/game';
import { DIFFICULTY_CONFIGS, AI_TIMING } from '../utils/constants';
import type { BoardEngine } from './BoardEngine';

export type AIMove = {
  tileId: string;
  letter: string;
  row: number;
  col: number;
};

export class AIPlayer {
  private difficulty: Difficulty;

  constructor(difficulty: Difficulty) {
    this.difficulty = difficulty;
  }

  computeMoves(tiles: Tile[], board: BoardEngine): AIMove[] {
    const config = DIFFICULTY_CONFIGS[this.difficulty];
    const maxTiles = config.aiMaxTiles;
    const missChance = config.aiMissChance;
    const wordPriority = config.aiWordPriority;

    // Find valid placements for each tile
    type Candidate = {
      tile: Tile;
      row: number;
      col: number;
      score: number;
    };

    const candidates: Candidate[] = [];

    for (const tile of tiles) {
      // Simulate a miss (AI deliberately places wrong or skips tile)
      if (Math.random() < missChance) continue;

      const validCells = board.getCellsNeedingLetter(tile.letter);
      for (const { row, col } of validCells) {
        let score = 10; // base score for correct placement

        if (wordPriority) {
          // Check if placing this tile would complete a word
          const words = board.getWordsForCell(row, col);
          for (const word of words) {
            if (word.isComplete) continue;
            // Count how many cells are already filled
            const filledCount = word.cells.filter(
              ({ row: r, col: c }) => board.cells[r][c].isLocked
            ).length;
            // +1 for this placement
            if (filledCount + 1 === word.length) {
              // This would complete the word!
              score += 100;
              if (word.length >= 7) score += 50; // long word bonus
            } else {
              // Partial progress toward completion
              score += (filledCount / word.length) * 20;
            }
          }
        }

        // Prefer intersections
        const cell = board.getCell(row, col);
        if (cell && cell.wordMemberships.length > 1) {
          score += 5;
        }

        candidates.push({ tile, row, col, score });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Greedy selection: pick best, remove tile from consideration
    const moves: AIMove[] = [];
    const usedTiles = new Set<string>();
    const usedCells = new Set<string>();

    for (const candidate of candidates) {
      if (moves.length >= maxTiles) break;
      if (usedTiles.has(candidate.tile.id)) continue;
      const cellKey = `${candidate.row},${candidate.col}`;
      if (usedCells.has(cellKey)) continue;

      moves.push({
        tileId: candidate.tile.id,
        letter: candidate.tile.letter,
        row: candidate.row,
        col: candidate.col,
      });
      usedTiles.add(candidate.tile.id);
      usedCells.add(cellKey);
    }

    return moves;
  }

  getThinkTime(): number {
    return AI_TIMING.THINK_MIN + Math.random() * (AI_TIMING.THINK_MAX - AI_TIMING.THINK_MIN);
  }

  static getTileRevealDelay(): number {
    return AI_TIMING.TILE_REVEAL_DELAY;
  }
}
