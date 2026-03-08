export type Difficulty = 'easy' | 'normal' | 'hard';

export type Player = 'human' | 'ai';

export type WordStartInfo = {
  number: number;
  emoji: string;
  direction: 'across' | 'down';
};

export type CellState = {
  row: number;
  col: number;
  solution: string | null; // null = black cell
  current: string | null;
  isPreFilled: boolean;
  isLocked: boolean;
  placedBy: Player | null;
  wordMemberships: WordMembership[];
  wordStarts: WordStartInfo[];
};

export type WordMembership = {
  wordId: string;
  direction: 'across' | 'down';
  index: number;
};

export type WordInfo = {
  id: string;
  direction: 'across' | 'down';
  row: number;
  col: number;
  length: number;
  word: string;
  emoji: string;
  cells: { row: number; col: number }[];
  isComplete: boolean;
  completedBy: Player | null;
};

export type Tile = {
  id: string;
  letter: string;
  owner: Player;
};

export type PlacementResult = {
  correct: boolean;
  cell: { row: number; col: number };
  letter: string;
  wordsCompleted: WordInfo[];
};

export type ScoreEvent = {
  points: number;
  reason: string;
  player: Player;
};

export type DifficultyConfig = {
  preFillMin: number;
  preFillMax: number;
  aiMaxTiles: number;
  aiMissChance: number;
  aiWordPriority: boolean;
  label: string;
};

export type GameOverReason = 'board-full' | 'pool-empty' | 'consecutive-skips' | 'opponent-left';
