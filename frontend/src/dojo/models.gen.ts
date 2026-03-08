import type { SchemaType as ISchemaType } from "@dojoengine/sdk";
import type { BigNumberish } from "starknet";

// Model: crossword::models::Player
export interface Player {
  player: string;
  username: BigNumberish;
  referral_code: BigNumberish;
  referred_by: string;
  referral_count: BigNumberish;
  total_score: BigNumberish;
  games_played: BigNumberish;
  games_won: BigNumberish;
  highest_score: BigNumberish;
  words_completed: BigNumberish;
  tiles_placed: BigNumberish;
  turns_played: BigNumberish;
  tiles_swapped: BigNumberish;
  games_forfeited: BigNumberish;
  online_wins: BigNumberish;
  current_level: BigNumberish;
}

// Model: crossword::models::ReferralCode
export interface ReferralCode {
  code: BigNumberish;
  owner: string;
}

// Model: crossword::models::GameResult
export interface GameResult {
  player: string;
  game_id: BigNumberish;
  difficulty: BigNumberish;
  player_score: BigNumberish;
  opponent_score: BigNumberish;
  won: boolean;
  words_completed: BigNumberish;
  tiles_placed: BigNumberish;
  turns_taken: BigNumberish;
  mode: BigNumberish;
  forfeited: boolean;
  timestamp: BigNumberish;
}

// Model: crossword::models::Achievement
export interface Achievement {
  player: string;
  achievement_id: BigNumberish;
  unlocked: boolean;
}

// Model: crossword::models::DailyStreak
export interface DailyStreak {
  player: string;
  last_claim_time: BigNumberish;
  streak_count: BigNumberish;
  total_claims: BigNumberish;
  total_bonus: BigNumberish;
}

// Model: crossword::models::Game
export interface Game {
  game_id: BigNumberish;
  player_one: string;
  player_two: string;
  current_turn: BigNumberish;
  status: BigNumberish;
  result: BigNumberish;
  result_reason: BigNumberish;
  difficulty: BigNumberish;
  mode: BigNumberish;
  score_one: BigNumberish;
  score_two: BigNumberish;
  words_one: BigNumberish;
  words_two: BigNumberish;
  tiles_one: BigNumberish;
  tiles_two: BigNumberish;
  turns_taken: BigNumberish;
  tiles_swapped: BigNumberish;
  move_count: BigNumberish;
}

// Model: crossword::models::PlayerGame
export interface PlayerGame {
  player: string;
  game_id: BigNumberish;
}

// Event: crossword::systems::actions::actions::PlayerRegistered
export interface PlayerRegistered {
  player: string;
  username: BigNumberish;
}

// Event: crossword::systems::actions::actions::ReferralApplied
export interface ReferralApplied {
  player: string;
  referrer: string;
  code: BigNumberish;
}

// Event: crossword::systems::actions::actions::GameStarted
export interface GameStarted {
  player: string;
  game_id: BigNumberish;
  difficulty: BigNumberish;
  mode: BigNumberish;
}

// Event: crossword::systems::actions::actions::GameJoined
export interface GameJoined {
  player: string;
  game_id: BigNumberish;
}

// Event: crossword::systems::actions::actions::PointsScored
export interface PointsScored {
  player: string;
  game_id: BigNumberish;
  points: BigNumberish;
  score_one: BigNumberish;
  score_two: BigNumberish;
}

// Event: crossword::systems::actions::actions::TilePlaced
export interface TilePlaced {
  player: string;
  game_id: BigNumberish;
}

// Event: crossword::systems::actions::actions::WordCompleted
export interface WordCompleted {
  player: string;
  game_id: BigNumberish;
  words_one: BigNumberish;
  words_two: BigNumberish;
}

// Event: crossword::systems::actions::actions::TurnEnded
export interface TurnEnded {
  player: string;
  game_id: BigNumberish;
  turn_number: BigNumberish;
}

// Event: crossword::systems::actions::actions::GameCompleted
export interface GameCompleted {
  player: string;
  game_id: BigNumberish;
  result: BigNumberish;
  result_reason: BigNumberish;
}

// Event: crossword::systems::actions::actions::AchievementUnlocked
export interface AchievementUnlocked {
  player: string;
  achievement_id: BigNumberish;
}

// Event: crossword::systems::actions::actions::DailyRewardClaimed
export interface DailyRewardClaimed {
  player: string;
  streak_count: BigNumberish;
  bonus: BigNumberish;
}

export interface SchemaType extends ISchemaType {
  crossword: {
    Player: Player;
    ReferralCode: ReferralCode;
    GameResult: GameResult;
    Achievement: Achievement;
    DailyStreak: DailyStreak;
    Game: Game;
    PlayerGame: PlayerGame;
    PlayerRegistered: PlayerRegistered;
    ReferralApplied: ReferralApplied;
    GameStarted: GameStarted;
    GameJoined: GameJoined;
    PointsScored: PointsScored;
    TilePlaced: TilePlaced;
    WordCompleted: WordCompleted;
    TurnEnded: TurnEnded;
    GameCompleted: GameCompleted;
    AchievementUnlocked: AchievementUnlocked;
    DailyRewardClaimed: DailyRewardClaimed;
  };
}

export const schema: SchemaType = {
  crossword: {
    Player: {
      player: "",
      username: 0,
      referral_code: 0,
      referred_by: "",
      referral_count: 0,
      total_score: 0,
      games_played: 0,
      games_won: 0,
      highest_score: 0,
      words_completed: 0,
      tiles_placed: 0,
      turns_played: 0,
      tiles_swapped: 0,
      games_forfeited: 0,
      online_wins: 0,
      current_level: 0,
    },
    ReferralCode: {
      code: 0,
      owner: "",
    },
    GameResult: {
      player: "",
      game_id: 0,
      difficulty: 0,
      player_score: 0,
      opponent_score: 0,
      won: false,
      words_completed: 0,
      tiles_placed: 0,
      turns_taken: 0,
      mode: 0,
      forfeited: false,
      timestamp: 0,
    },
    Achievement: {
      player: "",
      achievement_id: 0,
      unlocked: false,
    },
    DailyStreak: {
      player: "",
      last_claim_time: 0,
      streak_count: 0,
      total_claims: 0,
      total_bonus: 0,
    },
    Game: {
      game_id: 0,
      player_one: "",
      player_two: "",
      current_turn: 0,
      status: 0,
      result: 0,
      result_reason: 0,
      difficulty: 0,
      mode: 0,
      score_one: 0,
      score_two: 0,
      words_one: 0,
      words_two: 0,
      tiles_one: 0,
      tiles_two: 0,
      turns_taken: 0,
      tiles_swapped: 0,
      move_count: 0,
    },
    PlayerGame: {
      player: "",
      game_id: 0,
    },
    PlayerRegistered: {
      player: "",
      username: 0,
    },
    ReferralApplied: {
      player: "",
      referrer: "",
      code: 0,
    },
    GameStarted: {
      player: "",
      game_id: 0,
      difficulty: 0,
      mode: 0,
    },
    GameJoined: {
      player: "",
      game_id: 0,
    },
    PointsScored: {
      player: "",
      game_id: 0,
      points: 0,
      score_one: 0,
      score_two: 0,
    },
    TilePlaced: {
      player: "",
      game_id: 0,
    },
    WordCompleted: {
      player: "",
      game_id: 0,
      words_one: 0,
      words_two: 0,
    },
    TurnEnded: {
      player: "",
      game_id: 0,
      turn_number: 0,
    },
    GameCompleted: {
      player: "",
      game_id: 0,
      result: 0,
      result_reason: 0,
    },
    AchievementUnlocked: {
      player: "",
      achievement_id: 0,
    },
    DailyRewardClaimed: {
      player: "",
      streak_count: 0,
      bonus: 0,
    },
  },
};

export enum ModelsMapping {
  Player = "crossword-Player",
  ReferralCode = "crossword-ReferralCode",
  GameResult = "crossword-GameResult",
  Achievement = "crossword-Achievement",
  DailyStreak = "crossword-DailyStreak",
  Game = "crossword-Game",
  PlayerGame = "crossword-PlayerGame",
  PlayerRegistered = "crossword-PlayerRegistered",
  ReferralApplied = "crossword-ReferralApplied",
  GameStarted = "crossword-GameStarted",
  GameJoined = "crossword-GameJoined",
  PointsScored = "crossword-PointsScored",
  TilePlaced = "crossword-TilePlaced",
  WordCompleted = "crossword-WordCompleted",
  TurnEnded = "crossword-TurnEnded",
  GameCompleted = "crossword-GameCompleted",
  AchievementUnlocked = "crossword-AchievementUnlocked",
  DailyRewardClaimed = "crossword-DailyRewardClaimed",
}
