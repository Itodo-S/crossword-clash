import type { DifficultyConfig } from './types.js';

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
