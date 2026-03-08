import type { DifficultyConfig } from '../types/game';

export const BOARD_SIZE = 15;

export const TILES_PER_PLAYER = 6;

export const TURN_TIME = 60; // seconds

export const MAX_CONSECUTIVE_SKIPS = 4; // 2 per player = game over

export const SCORING = {
  CORRECT_TILE: 10,
  CONSECUTIVE_BONUS: 5,
  WORD_COMPLETE: 50,
  LONG_WORD_MULTIPLIER: 1.5,
  LONG_WORD_MIN_LENGTH: 7,
  ALL_TILES_BONUS: 30,
  FAST_TURN_BONUS: 15,
  FAST_TURN_THRESHOLD: 10, // seconds
  WRONG_ATTEMPT: -5,
} as const;

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    preFillMin: 0.55,
    preFillMax: 0.65,
    aiMaxTiles: 2,
    aiMissChance: 0.3,
    aiWordPriority: false,
    label: 'Easy',
  },
  normal: {
    preFillMin: 0.35,
    preFillMax: 0.45,
    aiMaxTiles: 3,
    aiMissChance: 0.1,
    aiWordPriority: true,
    label: 'Normal',
  },
  hard: {
    preFillMin: 0.20,
    preFillMax: 0.30,
    aiMaxTiles: 4,
    aiMissChance: 0,
    aiWordPriority: true,
    label: 'Hard',
  },
};

export const AI_TIMING = {
  THINK_MIN: 1500,
  THINK_MAX: 3500,
  TILE_REVEAL_DELAY: 400,
} as const;

export const COLORS = {
  bg: '#0c1220',
  surface: '#162032',
  accent: '#06b6d4',
  gold: '#fbbf24',
  green: '#10b981',
  blue: '#38bdf8',
  correct: '#10b981',
  wrong: '#ef4444',
  preFilled: '#64748b',
  empty: '#1a2332',
  black: '#080d16',
  tileHuman: '#06b6d4',
  tileAI: '#f59e0b',
  tilePending: '#a78bfa',
} as const;
