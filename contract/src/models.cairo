use starknet::ContractAddress;

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Player {
    #[key]
    pub player: ContractAddress,
    pub username: felt252,
    pub referral_code: felt252,
    pub referred_by: ContractAddress,
    pub referral_count: u32,
    pub total_score: u32,
    pub games_played: u32,
    pub games_won: u32,
    pub highest_score: u32,
    pub words_completed: u32,
    pub tiles_placed: u32,
    pub turns_played: u32,
    pub tiles_swapped: u32,
    pub games_forfeited: u32,
    pub online_wins: u32,
    pub current_level: u8,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ReferralCode {
    #[key]
    pub code: felt252,
    pub owner: ContractAddress,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct GameResult {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub game_id: u64,
    pub difficulty: u8,
    pub player_score: u32,
    pub opponent_score: u32,
    pub won: bool,
    pub words_completed: u32,
    pub tiles_placed: u32,
    pub turns_taken: u32,
    pub mode: u8,
    pub forfeited: bool,
    pub timestamp: u64,
}

// Achievement badge — tracks whether a player earned a specific achievement.
//
// Achievement IDs:
//   1  = 'first_clash'       — Complete your first game
//   2  = 'word_smith'        — Complete 5+ words in a single game
//   3  = 'veteran'           — Play 10 games
//   4  = 'perfect_round'     — Win with opponent scoring 0
//   5  = 'dominator'         — Win by 50+ points
//   6  = 'word_master'       — Complete 10+ words in a single game
//   7  = 'high_scorer'       — Score 500+ in a single game
//   8  = 'social_player'     — Apply a referral code
//   9  = 'influencer'        — Refer 5 players
//   10 = 'streak_keeper'     — Reach a 7-day daily streak
//   11 = 'online_champion'   — Win 5 online games
//   12 = 'hard_mode_hero'    — Win a hard difficulty game
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Achievement {
    #[key]
    pub player: ContractAddress,
    #[key]
    pub achievement_id: u8,
    pub unlocked: bool,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct DailyStreak {
    #[key]
    pub player: ContractAddress,
    pub last_claim_time: u64,
    pub streak_count: u32,
    pub total_claims: u32,
    pub total_bonus: u32,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Game {
    #[key]
    pub game_id: u64,
    pub player_one: ContractAddress,
    pub player_two: ContractAddress,
    pub current_turn: u8,
    pub status: u8,
    pub result: u8,
    pub result_reason: felt252,
    pub difficulty: u8,
    pub mode: u8,
    pub score_one: u32,
    pub score_two: u32,
    pub words_one: u32,
    pub words_two: u32,
    pub tiles_one: u32,
    pub tiles_two: u32,
    pub turns_taken: u32,
    pub tiles_swapped: u32,
    pub move_count: u32,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct PlayerGame {
    #[key]
    pub player: ContractAddress,
    pub game_id: u64,
}
