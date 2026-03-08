import type { CellState, Difficulty, WordInfo, WordMembership } from '../types/game';
import { BOARD_SIZE, DIFFICULTY_CONFIGS } from '../utils/constants';
import { WORD_LIST, WORD_SET } from '../utils/wordList';
import { getWordEmoji } from '../utils/emojiHints';

export type GeneratedBoard = {
  cells: CellState[][];
  words: WordInfo[];
  preFillCount: number;
  totalLetters: number;
};

// ── Algorithmic Crossword Grid Builder ──────────────────────────

type Direction = 'across' | 'down';
type Placement = { word: string; row: number; col: number; dir: Direction; intersections: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a valid crossword grid where every across/down run of 2+ letters
 * is a real word from WORD_SET.
 */
function buildCrosswordGrid(): { grid: string[][]; placedWords: string[] } {
  const SIZE = BOARD_SIZE;

  // Work with null = empty, letters = placed, will fill nulls with '#' at end
  const grid: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const placedWords: string[] = [];

  // Sort words: medium first (more intersection opportunities), then short, then long
  const sorted = shuffle(WORD_LIST.filter(w => w.length <= 13));
  const medium = sorted.filter(w => w.length >= 4 && w.length <= 6);
  const short = sorted.filter(w => w.length === 3);
  const long = sorted.filter(w => w.length >= 7);
  const wordQueue = [...shuffle(medium), ...shuffle(long), ...shuffle(short)];

  // Place first word horizontally at center
  const firstWord = wordQueue.find(w => w.length >= 5 && w.length <= 8) || wordQueue[0];
  const startCol = Math.floor((SIZE - firstWord.length) / 2);
  const startRow = Math.floor(SIZE / 2);
  for (let i = 0; i < firstWord.length; i++) {
    grid[startRow][startCol + i] = firstWord[i];
  }
  placedWords.push(firstWord);

  // Track used words
  const usedWords = new Set<string>([firstWord]);

  // Try placing remaining words
  for (const word of wordQueue) {
    if (usedWords.has(word)) continue;
    if (placedWords.length >= 50) break; // enough words

    const placement = findBestPlacement(grid, word, SIZE);
    if (placement) {
      applyPlacement(grid, placement);
      placedWords.push(word);
      usedWords.add(word);
    }
  }

  // Fill empty cells with '#'
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === null) grid[r][c] = '#';
    }
  }

  return { grid: grid as string[][], placedWords };
}

function findBestPlacement(
  grid: (string | null)[][],
  word: string,
  size: number,
): Placement | null {
  const candidates: Placement[] = [];

  // Try horizontal
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - word.length; c++) {
      const result = canPlace(grid, word, r, c, 'across', size);
      if (result > 0) {
        candidates.push({ word, row: r, col: c, dir: 'across', intersections: result });
      }
    }
  }

  // Try vertical
  for (let r = 0; r <= size - word.length; r++) {
    for (let c = 0; c < size; c++) {
      const result = canPlace(grid, word, r, c, 'down', size);
      if (result > 0) {
        candidates.push({ word, row: r, col: c, dir: 'down', intersections: result });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Prefer placements with more intersections, with some randomness
  candidates.sort((a, b) => b.intersections - a.intersections);
  // Pick from top candidates with some randomness
  const topN = Math.min(3, candidates.length);
  return candidates[Math.floor(Math.random() * topN)];
}

/**
 * Check if a word can be placed at (row, col) in given direction.
 * Returns number of intersections (> 0 means valid), 0 means invalid.
 * A placement must have at least 1 intersection with existing letters.
 */
function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: Direction,
  size: number,
): number {
  let intersections = 0;
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;

  // Check start buffer (cell before the word must be empty or out of bounds)
  const beforeR = row - dr;
  const beforeC = col - dc;
  if (beforeR >= 0 && beforeC >= 0 && grid[beforeR][beforeC] !== null) return 0;

  // Check end buffer (cell after the word must be empty or out of bounds)
  const afterR = row + dr * word.length;
  const afterC = col + dc * word.length;
  if (afterR < size && afterC < size && grid[afterR][afterC] !== null) return 0;

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid[r][c];

    if (existing !== null) {
      // Must match the existing letter (intersection)
      if (existing !== word[i]) return 0;
      intersections++;
    } else {
      // Cell is empty — check perpendicular neighbors must be empty
      // For horizontal placement, check above and below
      // For vertical placement, check left and right
      if (dir === 'across') {
        if (r > 0 && grid[r - 1][c] !== null) return 0;
        if (r < size - 1 && grid[r + 1][c] !== null) return 0;
      } else {
        if (c > 0 && grid[r][c - 1] !== null) return 0;
        if (c < size - 1 && grid[r][c + 1] !== null) return 0;
      }
    }
  }

  return intersections;
}

function applyPlacement(grid: (string | null)[][], placement: Placement): void {
  const { word, row, col, dir } = placement;
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

/**
 * Validate that every horizontal and vertical run of 2+ letters is a valid word.
 */
function validateGrid(grid: string[][]): boolean {
  const size = grid.length;

  // Check horizontal runs
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (grid[r][c] !== '#') {
        let run = '';
        while (c < size && grid[r][c] !== '#') {
          run += grid[r][c];
          c++;
        }
        if (run.length >= 2 && !WORD_SET.has(run)) {
          return false;
        }
      } else {
        c++;
      }
    }
  }

  // Check vertical runs
  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      if (grid[r][c] !== '#') {
        let run = '';
        while (r < size && grid[r][c] !== '#') {
          run += grid[r][c];
          r++;
        }
        if (run.length >= 2 && !WORD_SET.has(run)) {
          return false;
        }
      } else {
        r++;
      }
    }
  }

  return true;
}

/**
 * Generate a valid crossword grid with retries.
 */
function generateValidGrid(): string[][] {
  const MAX_ATTEMPTS = 20;
  let bestGrid: string[][] | null = null;
  let bestWordCount = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { grid, placedWords } = buildCrosswordGrid();

    if (validateGrid(grid)) {
      // Count actual words on the grid
      const wordCount = countGridWords(grid);
      if (wordCount >= 15) {
        return grid; // Good enough
      }
      if (wordCount > bestWordCount) {
        bestGrid = grid;
        bestWordCount = wordCount;
      }
    }
  }

  // Return best valid grid found, or fallback to last attempt
  if (bestGrid) return bestGrid;

  // Ultimate fallback: build a simple grid and validate it
  for (let i = 0; i < 10; i++) {
    const fallback = buildSimpleFallbackGrid();
    if (validateGrid(fallback)) return fallback;
  }
  return buildSimpleFallbackGrid();
}

function countGridWords(grid: string[][]): number {
  const size = grid.length;
  let count = 0;

  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (grid[r][c] !== '#') {
        let len = 0;
        while (c < size && grid[r][c] !== '#') { len++; c++; }
        if (len >= 2) count++;
      } else { c++; }
    }
  }

  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      if (grid[r][c] !== '#') {
        let len = 0;
        while (r < size && grid[r][c] !== '#') { len++; r++; }
        if (len >= 2) count++;
      } else { r++; }
    }
  }

  return count;
}

function buildSimpleFallbackGrid(): string[][] {
  const SIZE = BOARD_SIZE;
  const grid: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill('#'));

  // Place a handful of crossing words manually from WORD_LIST
  const words5 = WORD_LIST.filter(w => w.length === 5);
  const words3 = WORD_LIST.filter(w => w.length === 3);

  // Center horizontal
  const w1 = words5[Math.floor(Math.random() * words5.length)];
  const midR = 7, midC = 5;
  for (let i = 0; i < w1.length; i++) grid[midR][midC + i] = w1[i];

  // Try to cross it vertically
  for (let i = 0; i < w1.length; i++) {
    const letter = w1[i];
    const crossWord = words3.find(w => w.includes(letter) && w !== w1);
    if (crossWord) {
      const idx = crossWord.indexOf(letter);
      const startR = midR - idx;
      if (startR >= 0 && startR + crossWord.length <= SIZE) {
        let valid = true;
        for (let j = 0; j < crossWord.length; j++) {
          const r = startR + j;
          const c = midC + i;
          if (r !== midR && grid[r][c] !== '#') { valid = false; break; }
          // Check perpendicular
          if (r !== midR) {
            if (c > 0 && grid[r][c - 1] !== '#') { valid = false; break; }
            if (c < SIZE - 1 && grid[r][c + 1] !== '#') { valid = false; break; }
          }
        }
        if (valid) {
          for (let j = 0; j < crossWord.length; j++) {
            grid[startR + j][midC + i] = crossWord[j];
          }
        }
      }
    }
  }

  return grid;
}

// ── Public API ──────────────────────────────────────────────────

export function generateBoard(difficulty: Difficulty): GeneratedBoard {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const grid = generateValidGrid();

  // Build word list from the grid
  const words = detectWords(grid);

  // Create base cells
  const cells: CellState[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    cells[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const letter = grid[r][c];
      const isBlack = letter === '#';
      cells[r][c] = {
        row: r,
        col: c,
        solution: isBlack ? null : letter,
        current: null,
        isPreFilled: false,
        isLocked: isBlack,
        placedBy: null,
        wordMemberships: [],
        wordStarts: [],
      };
    }
  }

  // Assign word memberships
  for (const word of words) {
    for (let i = 0; i < word.cells.length; i++) {
      const { row, col } = word.cells[i];
      cells[row][col].wordMemberships.push({
        wordId: word.id,
        direction: word.direction,
        index: i,
      });
    }
  }

  // Assign crossword numbers to word-start cells
  const sortedWords = [...words].sort((a, b) => {
    const aStart = a.cells[0];
    const bStart = b.cells[0];
    if (aStart.row !== bStart.row) return aStart.row - bStart.row;
    return aStart.col - bStart.col;
  });

  let wordNumber = 1;
  const numberedCells = new Set<string>();
  for (const word of sortedWords) {
    const start = word.cells[0];
    const key = `${start.row},${start.col}`;
    let num: number;
    if (numberedCells.has(key)) {
      num = cells[start.row][start.col].wordStarts[0].number;
    } else {
      num = wordNumber++;
      numberedCells.add(key);
    }
    cells[start.row][start.col].wordStarts.push({
      number: num,
      emoji: word.emoji,
      direction: word.direction,
    });
  }

  // Count total non-black letters
  let totalLetters = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (cells[r][c].solution !== null) totalLetters++;
    }
  }

  // Determine pre-fill count
  const preFillRate = config.preFillMin + Math.random() * (config.preFillMax - config.preFillMin);
  const targetPreFill = Math.floor(totalLetters * preFillRate);

  // Pre-fill strategy: prioritize intersections and word edges
  const preFillCandidates = buildPreFillCandidates(cells, words);
  const preFilled = selectPreFills(preFillCandidates, targetPreFill, cells, words);

  let preFillCount = 0;
  for (const { row, col } of preFilled) {
    cells[row][col].current = cells[row][col].solution;
    cells[row][col].isPreFilled = true;
    cells[row][col].isLocked = true;
    preFillCount++;
  }

  // Update word completion status
  for (const word of words) {
    word.isComplete = word.cells.every(
      ({ row, col }) => cells[row][col].current === cells[row][col].solution
    );
  }

  return { cells, words, preFillCount, totalLetters };
}

function detectWords(grid: string[][]): WordInfo[] {
  const words: WordInfo[] = [];
  let wordId = 0;

  // Across words
  for (let r = 0; r < BOARD_SIZE; r++) {
    let c = 0;
    while (c < BOARD_SIZE) {
      if (grid[r][c] !== '#') {
        const start = c;
        let word = '';
        const cells: { row: number; col: number }[] = [];
        while (c < BOARD_SIZE && grid[r][c] !== '#') {
          word += grid[r][c];
          cells.push({ row: r, col: c });
          c++;
        }
        if (word.length >= 2) {
          words.push({
            id: `w${wordId++}`,
            direction: 'across',
            row: r,
            col: start,
            length: word.length,
            word,
            emoji: getWordEmoji(word),
            cells,
            isComplete: false,
            completedBy: null,
          });
        }
      } else {
        c++;
      }
    }
  }

  // Down words
  for (let c = 0; c < BOARD_SIZE; c++) {
    let r = 0;
    while (r < BOARD_SIZE) {
      if (grid[r][c] !== '#') {
        const start = r;
        let word = '';
        const cells: { row: number; col: number }[] = [];
        while (r < BOARD_SIZE && grid[r][c] !== '#') {
          word += grid[r][c];
          cells.push({ row: r, col: c });
          r++;
        }
        if (word.length >= 2) {
          words.push({
            id: `w${wordId++}`,
            direction: 'down',
            row: start,
            col: c,
            length: word.length,
            word,
            emoji: getWordEmoji(word),
            cells,
            isComplete: false,
            completedBy: null,
          });
        }
      } else {
        r++;
      }
    }
  }

  return words;
}

type CellCoord = { row: number; col: number; score: number };

function buildPreFillCandidates(cells: CellState[][], words: WordInfo[]): CellCoord[] {
  const scores: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(0)
  );

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (cells[r][c].solution !== null) {
        scores[r][c] = cells[r][c].wordMemberships.length * 2;
      }
    }
  }

  for (const word of words) {
    const first = word.cells[0];
    const last = word.cells[word.cells.length - 1];
    scores[first.row][first.col] += 3;
    scores[last.row][last.col] += 3;
  }

  const candidates: CellCoord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (cells[r][c].solution !== null) {
        candidates.push({
          row: r,
          col: c,
          score: scores[r][c] + Math.random() * 2,
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function selectPreFills(
  candidates: CellCoord[],
  target: number,
  cells: CellState[][],
  words: WordInfo[],
): { row: number; col: number }[] {
  const selected = new Set<string>();
  const result: { row: number; col: number }[] = [];

  const wordFillCount = new Map<string, number>();
  for (const word of words) {
    wordFillCount.set(word.id, 0);
  }

  for (const candidate of candidates) {
    if (result.length >= target) break;

    const { row, col } = candidate;
    const key = `${row},${col}`;
    if (selected.has(key)) continue;

    const memberships = cells[row][col].wordMemberships;
    let wouldFillWord = false;
    for (const m of memberships) {
      const word = words.find(w => w.id === m.wordId)!;
      const currentFill = wordFillCount.get(m.wordId)! + 1;
      if (currentFill >= word.length) {
        wouldFillWord = true;
        break;
      }
    }
    if (wouldFillWord) continue;

    selected.add(key);
    result.push({ row, col });
    for (const m of memberships) {
      wordFillCount.set(m.wordId, wordFillCount.get(m.wordId)! + 1);
    }
  }

  // Ensure no word has zero pre-filled letters
  for (const word of words) {
    if (wordFillCount.get(word.id)! === 0 && word.length > 1) {
      const shuffled = [...word.cells].sort(() => Math.random() - 0.5);
      for (const cell of shuffled) {
        const key = `${cell.row},${cell.col}`;
        if (!selected.has(key)) {
          const memberships = cells[cell.row][cell.col].wordMemberships;
          let safe = true;
          for (const m of memberships) {
            const w = words.find(ww => ww.id === m.wordId)!;
            if (wordFillCount.get(m.wordId)! + 1 >= w.length) {
              safe = false;
              break;
            }
          }
          if (safe) {
            selected.add(key);
            result.push({ row: cell.row, col: cell.col });
            for (const m of memberships) {
              wordFillCount.set(m.wordId, wordFillCount.get(m.wordId)! + 1);
            }
            break;
          }
        }
      }
    }
  }

  return result;
}
