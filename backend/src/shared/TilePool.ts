import type { CellState, Player, Tile } from './types.js';
import { BOARD_SIZE, TILES_PER_PLAYER } from './constants.js';

export class TilePool {
  private pool: string[] = [];
  private nextId = 0;

  constructor(cells: CellState[][]) {
    // Pool = all missing letters (not pre-filled, not black)
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = cells[r][c];
        if (cell.solution !== null && !cell.isPreFilled) {
          this.pool.push(cell.solution);
        }
      }
    }
    this.shuffle();
  }

  private shuffle(): void {
    for (let i = this.pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.pool[i], this.pool[j]] = [this.pool[j], this.pool[i]];
    }
  }

  drawTiles(count: number, owner: Player): Tile[] {
    const tiles: Tile[] = [];
    const toDraw = Math.min(count, this.pool.length);
    for (let i = 0; i < toDraw; i++) {
      const letter = this.pool.pop()!;
      tiles.push({
        id: `tile-${this.nextId++}`,
        letter,
        owner,
      });
    }
    return tiles;
  }

  refillHand(currentTiles: Tile[], owner: Player): Tile[] {
    const needed = TILES_PER_PLAYER - currentTiles.length;
    if (needed <= 0) return currentTiles;
    const newTiles = this.drawTiles(needed, owner);
    return [...currentTiles, ...newTiles];
  }

  returnTiles(tiles: Tile[]): void {
    for (const tile of tiles) {
      this.pool.push(tile.letter);
    }
    this.shuffle();
  }

  swapTiles(tiles: Tile[], owner: Player): Tile[] {
    this.returnTiles(tiles);
    return this.drawTiles(tiles.length, owner);
  }

  get remaining(): number {
    return this.pool.length;
  }

  get isEmpty(): boolean {
    return this.pool.length === 0;
  }
}
