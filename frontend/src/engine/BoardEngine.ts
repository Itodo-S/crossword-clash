import type { CellState, Player, PlacementResult, WordInfo } from '../types/game';
import { BOARD_SIZE } from '../utils/constants';

export class BoardEngine {
  cells: CellState[][];
  words: WordInfo[];

  constructor(cells: CellState[][], words: WordInfo[]) {
    this.cells = cells;
    this.words = words;
  }

  getCell(row: number, col: number): CellState | null {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return this.cells[row][col];
  }

  isBlackCell(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    return cell === null || cell.solution === null;
  }

  isCellEmpty(row: number, col: number): boolean {
    const cell = this.getCell(row, col);
    return cell !== null && cell.solution !== null && !cell.isLocked && cell.current === null;
  }

  placeTile(row: number, col: number, letter: string, player: Player): PlacementResult {
    const cell = this.cells[row][col];

    const correct = cell.solution === letter;

    if (correct) {
      cell.current = letter;
      cell.isLocked = true;
      cell.placedBy = player;
    }

    // Check for word completions
    const wordsCompleted: WordInfo[] = [];
    if (correct) {
      for (const membership of cell.wordMemberships) {
        const word = this.words.find(w => w.id === membership.wordId);
        if (word && !word.isComplete) {
          const isNowComplete = word.cells.every(
            ({ row: r, col: c }) => this.cells[r][c].isLocked && this.cells[r][c].current !== null
          );
          if (isNowComplete) {
            word.isComplete = true;
            word.completedBy = player;
            wordsCompleted.push(word);
          }
        }
      }
    }

    return {
      correct,
      cell: { row, col },
      letter,
      wordsCompleted,
    };
  }

  getEmptyCells(): { row: number; col: number; solution: string }[] {
    const empty: { row: number; col: number; solution: string }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.cells[r][c];
        if (cell.solution !== null && !cell.isLocked && cell.current === null) {
          empty.push({ row: r, col: c, solution: cell.solution });
        }
      }
    }
    return empty;
  }

  isBoardFull(): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.cells[r][c];
        if (cell.solution !== null && !cell.isLocked) return false;
      }
    }
    return true;
  }

  getCompletionPercentage(): number {
    let filled = 0;
    let total = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (this.cells[r][c].solution !== null) {
          total++;
          if (this.cells[r][c].isLocked) filled++;
        }
      }
    }
    return total === 0 ? 100 : Math.round((filled / total) * 100);
  }

  getWordById(wordId: string): WordInfo | undefined {
    return this.words.find(w => w.id === wordId);
  }

  getWordsForCell(row: number, col: number): WordInfo[] {
    const cell = this.getCell(row, col);
    if (!cell) return [];
    return cell.wordMemberships
      .map(m => this.words.find(w => w.id === m.wordId))
      .filter((w): w is WordInfo => w !== undefined);
  }

  getIncompleteWords(): WordInfo[] {
    return this.words.filter(w => !w.isComplete);
  }

  getCellsNeedingLetter(letter: string): { row: number; col: number }[] {
    const result: { row: number; col: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.cells[r][c];
        if (cell.solution === letter && !cell.isLocked && cell.current === null) {
          result.push({ row: r, col: c });
        }
      }
    }
    return result;
  }
}
