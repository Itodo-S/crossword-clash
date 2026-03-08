use starknet::ContractAddress;

#[starknet::interface]
pub trait IActions<TContractState> {
    fn register_player(ref self: TContractState, username: felt252);
    fn apply_referral(ref self: TContractState, code: felt252);
    fn start_game(ref self: TContractState, difficulty: u8, mode: u8);
    fn join_game(ref self: TContractState, game_id: u64);
    fn score_points(ref self: TContractState, game_id: u64, points: u32, for_opponent: bool);
    fn place_tile(ref self: TContractState, game_id: u64, for_opponent: bool);
    fn complete_word(ref self: TContractState, game_id: u64, for_opponent: bool);
    fn end_turn(ref self: TContractState, game_id: u64);
    fn skip_turn(ref self: TContractState, game_id: u64);
    fn swap_tiles(ref self: TContractState, game_id: u64);
    fn end_game(ref self: TContractState, game_id: u64, result_reason: felt252);
    fn forfeit_game(ref self: TContractState, game_id: u64);
    fn claim_daily_reward(ref self: TContractState);
}

#[starknet::interface]
pub trait IActionsView<TContractState> {
    fn get_player(self: @TContractState, addr: ContractAddress) -> (felt252, felt252, u32, u32, u32, u32, u32, u32, u32, u32, u32, u8);
    fn get_player_count(self: @TContractState) -> u32;
    fn get_player_address(self: @TContractState, index: u32) -> ContractAddress;
    fn get_achievement(self: @TContractState, addr: ContractAddress, id: u8) -> bool;
    fn get_daily_streak(self: @TContractState, addr: ContractAddress) -> (u64, u32, u32, u32);
    fn get_game_result(
        self: @TContractState, addr: ContractAddress, game_id: u64,
    ) -> (u8, u32, u32, bool, u32, u32, u32, u8, bool, u64);
    fn get_game(
        self: @TContractState, game_id: u64,
    ) -> (ContractAddress, ContractAddress, u8, u8, u8, u8, u8, u32, u32, u32, u32, u32, u32, u32, u32, u32);
    fn get_player_game(self: @TContractState, addr: ContractAddress) -> u64;
    fn get_game_count(self: @TContractState) -> u64;
}

#[dojo::contract]
pub mod actions {
    use core::num::traits::Zero;
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use crossword::models::{
        Player, ReferralCode, GameResult, Achievement, DailyStreak, Game, PlayerGame,
    };
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, Map, StoragePathEntry,
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use super::{IActions, IActionsView};

    // Achievement ID constants
    pub const ACH_FIRST_CLASH: u8 = 1;
    pub const ACH_WORD_SMITH: u8 = 2;
    pub const ACH_VETERAN: u8 = 3;
    pub const ACH_PERFECT_ROUND: u8 = 4;
    pub const ACH_DOMINATOR: u8 = 5;
    pub const ACH_WORD_MASTER: u8 = 6;
    pub const ACH_HIGH_SCORER: u8 = 7;
    pub const ACH_SOCIAL_PLAYER: u8 = 8;
    pub const ACH_INFLUENCER: u8 = 9;
    pub const ACH_STREAK_KEEPER: u8 = 10;
    pub const ACH_ONLINE_CHAMPION: u8 = 11;
    pub const ACH_HARD_MODE_HERO: u8 = 12;

    // Game status constants
    pub const STATUS_WAITING: u8 = 0;
    pub const STATUS_ACTIVE: u8 = 1;
    pub const STATUS_FINISHED: u8 = 2;

    // Game result constants
    pub const RESULT_NONE: u8 = 0;
    pub const RESULT_P1_WON: u8 = 1;
    pub const RESULT_P2_WON: u8 = 2;
    pub const RESULT_DRAW: u8 = 3;

    #[storage]
    struct Storage {
        player_count: u32,
        players: Map<u32, ContractAddress>,
        player_in_registry: Map<ContractAddress, bool>,
        game_count: u64,
    }

    // ─── Events ───────────────────────────────────────────────────────────

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerRegistered {
        #[key]
        pub player: ContractAddress,
        pub username: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ReferralApplied {
        #[key]
        pub player: ContractAddress,
        pub referrer: ContractAddress,
        pub code: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameStarted {
        #[key]
        pub player: ContractAddress,
        pub game_id: u64,
        pub difficulty: u8,
        pub mode: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameJoined {
        #[key]
        pub player: ContractAddress,
        pub game_id: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PointsScored {
        #[key]
        pub player: ContractAddress,
        pub game_id: u64,
        pub points: u32,
        pub score_one: u32,
        pub score_two: u32,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TilePlaced {
        #[key]
        pub player: ContractAddress,
        pub game_id: u64,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct WordCompleted {
        #[key]
        pub player: ContractAddress,
        pub game_id: u64,
        pub words_one: u32,
        pub words_two: u32,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct TurnEnded {
        #[key]
        pub player: ContractAddress,
        pub game_id: u64,
        pub turn_number: u32,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameCompleted {
        #[key]
        pub player: ContractAddress,
        pub game_id: u64,
        pub result: u8,
        pub result_reason: felt252,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct AchievementUnlocked {
        #[key]
        pub player: ContractAddress,
        pub achievement_id: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DailyRewardClaimed {
        #[key]
        pub player: ContractAddress,
        pub streak_count: u32,
        pub bonus: u32,
    }

    // ─── Write Functions ──────────────────────────────────────────────────

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn register_player(ref self: ContractState, username: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let existing: Player = world.read_model(caller);
            assert(existing.username == 0, 'ALREADY_REGISTERED');

            let referral_code: felt252 = caller.into();

            let existing_code: ReferralCode = world.read_model(referral_code);
            assert(existing_code.owner.is_zero(), 'CODE_ALREADY_EXISTS');

            let player = Player {
                player: caller,
                username,
                referral_code,
                referred_by: Zero::zero(),
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
            };
            world.write_model(@player);

            let code_mapping = ReferralCode { code: referral_code, owner: caller };
            world.write_model(@code_mapping);

            let idx = self.player_count.read();
            self.players.entry(idx).write(caller);
            self.player_count.write(idx + 1);
            self.player_in_registry.entry(caller).write(true);

            world.emit_event(@PlayerRegistered { player: caller, username });
        }

        fn apply_referral(ref self: ContractState, code: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut player: Player = world.read_model(caller);
            assert(player.username != 0, 'NOT_REGISTERED');
            assert(player.referred_by.is_zero(), 'ALREADY_REFERRED');

            let code_entry: ReferralCode = world.read_model(code);
            assert(!code_entry.owner.is_zero(), 'INVALID_REFERRAL_CODE');
            assert(code_entry.owner != caller, 'CANNOT_SELF_REFER');

            player.referred_by = code_entry.owner;
            world.write_model(@player);

            let mut referrer: Player = world.read_model(code_entry.owner);
            referrer.referral_count += 1;
            world.write_model(@referrer);

            self.try_grant(ref world, caller, ACH_SOCIAL_PLAYER);
            self.check_referral_achievements(ref world, code_entry.owner, referrer.referral_count);

            world
                .emit_event(
                    @ReferralApplied { player: caller, referrer: code_entry.owner, code },
                );
        }

        fn start_game(ref self: ContractState, difficulty: u8, mode: u8) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let player: Player = world.read_model(caller);
            assert(player.username != 0, 'NOT_REGISTERED');

            // Auto-close any stale game
            let existing_pg: PlayerGame = world.read_model(caller);
            if existing_pg.game_id != 0 {
                let mut old_game: Game = world.read_model(existing_pg.game_id);
                if old_game.status != STATUS_FINISHED {
                    old_game.status = STATUS_FINISHED;
                    world.write_model(@old_game);
                }
            }

            assert(difficulty <= 2, 'INVALID_DIFFICULTY');
            assert(mode <= 2, 'INVALID_MODE');

            // Increment global game counter
            let game_id = self.game_count.read() + 1;
            self.game_count.write(game_id);

            // Determine player_two: zero address for AI and vs-player local modes
            let player_two: ContractAddress = Zero::zero();

            // For online mode (2), status is waiting; otherwise active
            let status = if mode == 2 { STATUS_WAITING } else { STATUS_ACTIVE };

            let game = Game {
                game_id,
                player_one: caller,
                player_two,
                current_turn: 0,
                status,
                result: RESULT_NONE,
                result_reason: 0,
                difficulty,
                mode,
                score_one: 0,
                score_two: 0,
                words_one: 0,
                words_two: 0,
                tiles_one: 0,
                tiles_two: 0,
                turns_taken: 0,
                tiles_swapped: 0,
                move_count: 0,
            };
            world.write_model(@game);

            // Set PlayerGame mapping
            let pg = PlayerGame { player: caller, game_id };
            world.write_model(@pg);

            world.emit_event(@GameStarted { player: caller, game_id, difficulty, mode });
        }

        fn join_game(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let player: Player = world.read_model(caller);
            assert(player.username != 0, 'NOT_REGISTERED');

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_WAITING, 'GAME_NOT_JOINABLE');
            assert(game.mode == 2, 'NOT_ONLINE_GAME');
            assert(game.player_one != caller, 'CANNOT_JOIN_OWN_GAME');

            game.player_two = caller;
            game.status = STATUS_ACTIVE;
            world.write_model(@game);

            let pg = PlayerGame { player: caller, game_id };
            world.write_model(@pg);

            world.emit_event(@GameJoined { player: caller, game_id });
        }

        fn score_points(ref self: ContractState, game_id: u64, points: u32, for_opponent: bool) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');

            let is_p1 = self.identify_player(@game, caller);

            // for_opponent only allowed in vs-ai mode and caller must be player_one
            if for_opponent {
                assert(game.mode == 0, 'OPPONENT_SCORE_AI_ONLY');
                assert(is_p1, 'ONLY_P1_FOR_OPPONENT');
            }

            if for_opponent {
                // Caller is p1 scoring for AI (p2)
                game.score_two += points;
            } else if is_p1 {
                game.score_one += points;
            } else {
                game.score_two += points;
            }
            world.write_model(@game);

            // Check score-based achievements for the scoring player
            if !for_opponent {
                let my_score = if is_p1 { game.score_one } else { game.score_two };
                if my_score >= 500 {
                    self.try_grant(ref world, caller, ACH_HIGH_SCORER);
                }
            }

            world
                .emit_event(
                    @PointsScored {
                        player: caller,
                        game_id,
                        points,
                        score_one: game.score_one,
                        score_two: game.score_two,
                    },
                );
        }

        fn place_tile(ref self: ContractState, game_id: u64, for_opponent: bool) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');

            let is_p1 = self.identify_player(@game, caller);

            if for_opponent {
                assert(game.mode == 0, 'OPPONENT_SCORE_AI_ONLY');
                assert(is_p1, 'ONLY_P1_FOR_OPPONENT');
            }

            // Count tiles for the actual player doing the placing
            if for_opponent {
                game.tiles_two += 1;
            } else if is_p1 {
                game.tiles_one += 1;
            } else {
                game.tiles_two += 1;
            }
            world.write_model(@game);

            world.emit_event(@TilePlaced { player: caller, game_id });
        }

        fn complete_word(ref self: ContractState, game_id: u64, for_opponent: bool) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');

            let is_p1 = self.identify_player(@game, caller);

            if for_opponent {
                assert(game.mode == 0, 'OPPONENT_SCORE_AI_ONLY');
                assert(is_p1, 'ONLY_P1_FOR_OPPONENT');
            }

            if for_opponent {
                game.words_two += 1;
            } else if is_p1 {
                game.words_one += 1;

                // WORD_SMITH — 5+ words in a single game
                if game.words_one >= 5 {
                    self.try_grant(ref world, caller, ACH_WORD_SMITH);
                }
                // WORD_MASTER — 10+ words in a single game
                if game.words_one >= 10 {
                    self.try_grant(ref world, caller, ACH_WORD_MASTER);
                }
            } else {
                game.words_two += 1;

                // Same achievements for player_two
                if game.words_two >= 5 {
                    self.try_grant(ref world, caller, ACH_WORD_SMITH);
                }
                if game.words_two >= 10 {
                    self.try_grant(ref world, caller, ACH_WORD_MASTER);
                }
            }
            world.write_model(@game);

            world
                .emit_event(
                    @WordCompleted {
                        player: caller,
                        game_id,
                        words_one: game.words_one,
                        words_two: game.words_two,
                    },
                );
        }

        fn end_turn(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');
            self.identify_player(@game, caller);

            game.turns_taken += 1;
            // Toggle current_turn: 0->1, 1->0
            game.current_turn = if game.current_turn == 0 { 1 } else { 0 };
            world.write_model(@game);

            world
                .emit_event(
                    @TurnEnded {
                        player: caller,
                        game_id,
                        turn_number: game.turns_taken,
                    },
                );
        }

        fn skip_turn(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');
            self.identify_player(@game, caller);

            game.turns_taken += 1;
            game.current_turn = if game.current_turn == 0 { 1 } else { 0 };
            world.write_model(@game);

            world
                .emit_event(
                    @TurnEnded {
                        player: caller,
                        game_id,
                        turn_number: game.turns_taken,
                    },
                );
        }

        fn swap_tiles(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');
            self.identify_player(@game, caller);

            game.tiles_swapped += 1;
            game.turns_taken += 1;
            game.current_turn = if game.current_turn == 0 { 1 } else { 0 };
            world.write_model(@game);

            world
                .emit_event(
                    @TurnEnded {
                        player: caller,
                        game_id,
                        turn_number: game.turns_taken,
                    },
                );
        }

        fn end_game(ref self: ContractState, game_id: u64, result_reason: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');
            self.identify_player(@game, caller);

            let now: u64 = get_block_timestamp();

            // Determine winner from on-chain scores
            let result = if game.score_one > game.score_two {
                RESULT_P1_WON
            } else if game.score_two > game.score_one {
                RESULT_P2_WON
            } else {
                RESULT_DRAW
            };

            game.status = STATUS_FINISHED;
            game.result = result;
            game.result_reason = result_reason;
            world.write_model(@game);

            // Finalize stats for player_one
            let p1_won = result == RESULT_P1_WON;
            self
                .finalize_player_stats(
                    ref world,
                    game.player_one,
                    @game,
                    p1_won,
                    game.score_one,
                    game.score_two,
                    game.words_one,
                    game.tiles_one,
                    now,
                );

            // Finalize stats for player_two (skip if zero address / AI)
            if !game.player_two.is_zero() {
                let p2_won = result == RESULT_P2_WON;
                self
                    .finalize_player_stats(
                        ref world,
                        game.player_two,
                        @game,
                        p2_won,
                        game.score_two,
                        game.score_one,
                        game.words_two,
                        game.tiles_two,
                        now,
                    );
            }

            // Clear PlayerGame for both players
            let pg1 = PlayerGame { player: game.player_one, game_id: 0 };
            world.write_model(@pg1);
            if !game.player_two.is_zero() {
                let pg2 = PlayerGame { player: game.player_two, game_id: 0 };
                world.write_model(@pg2);
            }

            world
                .emit_event(
                    @GameCompleted {
                        player: caller,
                        game_id,
                        result,
                        result_reason,
                    },
                );
        }

        fn forfeit_game(ref self: ContractState, game_id: u64) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == STATUS_ACTIVE, 'GAME_NOT_ACTIVE');
            let is_p1 = self.identify_player(@game, caller);

            let now: u64 = get_block_timestamp();

            // The forfeiter loses; opponent wins
            let result = if is_p1 { RESULT_P2_WON } else { RESULT_P1_WON };

            game.status = STATUS_FINISHED;
            game.result = result;
            game.result_reason = 'forfeit';
            world.write_model(@game);

            // Store GameResult for the forfeiter
            let forfeit_result = GameResult {
                player: caller,
                game_id,
                difficulty: game.difficulty,
                player_score: if is_p1 { game.score_one } else { game.score_two },
                opponent_score: if is_p1 { game.score_two } else { game.score_one },
                won: false,
                words_completed: if is_p1 { game.words_one } else { game.words_two },
                tiles_placed: if is_p1 { game.tiles_one } else { game.tiles_two },
                turns_taken: game.turns_taken,
                mode: game.mode,
                forfeited: true,
                timestamp: now,
            };
            world.write_model(@forfeit_result);

            // Update forfeiter's player stats
            let mut player: Player = world.read_model(caller);
            player.games_played += 1;
            player.games_forfeited += 1;
            let my_tiles = if is_p1 { game.tiles_one } else { game.tiles_two };
            let my_words = if is_p1 { game.words_one } else { game.words_two };
            let my_score = if is_p1 { game.score_one } else { game.score_two };
            player.tiles_placed += my_tiles;
            player.turns_played += game.turns_taken;
            player.tiles_swapped += game.tiles_swapped;
            player.words_completed += my_words;
            player.total_score += my_score;
            world.write_model(@player);

            // If there's a non-zero opponent, finalize their stats as winner
            let opponent = if is_p1 { game.player_two } else { game.player_one };
            if !opponent.is_zero() {
                let opp_score = if is_p1 { game.score_two } else { game.score_one };
                let opp_words = if is_p1 { game.words_two } else { game.words_one };
                let opp_tiles = if is_p1 { game.tiles_two } else { game.tiles_one };
                self
                    .finalize_player_stats(
                        ref world,
                        opponent,
                        @game,
                        true, // opponent wins
                        opp_score,
                        my_score,
                        opp_words,
                        opp_tiles,
                        now,
                    );
            }

            // Clear PlayerGame for both
            let pg1 = PlayerGame { player: game.player_one, game_id: 0 };
            world.write_model(@pg1);
            if !game.player_two.is_zero() {
                let pg2 = PlayerGame { player: game.player_two, game_id: 0 };
                world.write_model(@pg2);
            }

            // Check FIRST_CLASH and VETERAN for forfeiter (forfeits count as games)
            if player.games_played >= 1 {
                self.try_grant(ref world, caller, ACH_FIRST_CLASH);
            }
            if player.games_played >= 10 {
                self.try_grant(ref world, caller, ACH_VETERAN);
            }

            world
                .emit_event(
                    @GameCompleted {
                        player: caller,
                        game_id,
                        result,
                        result_reason: 'forfeit',
                    },
                );
        }

        fn claim_daily_reward(ref self: ContractState) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let player: Player = world.read_model(caller);
            assert(player.username != 0, 'NOT_REGISTERED');

            let now: u64 = get_block_timestamp();
            let mut streak: DailyStreak = world.read_model(caller);

            if streak.last_claim_time > 0 {
                let elapsed = now - streak.last_claim_time;
                assert(elapsed >= 72000, 'TOO_EARLY_TO_CLAIM');

                if elapsed > 172800 {
                    streak.streak_count = 0;
                }
            }

            streak.streak_count += 1;
            streak.last_claim_time = now;
            streak.total_claims += 1;

            let capped_streak: u32 = if streak.streak_count > 10 {
                10
            } else {
                streak.streak_count
            };
            let bonus: u32 = 10 * capped_streak;

            streak.total_bonus += bonus;
            world.write_model(@streak);

            if streak.streak_count >= 7 {
                self.try_grant(ref world, caller, ACH_STREAK_KEEPER);
            }

            world
                .emit_event(
                    @DailyRewardClaimed {
                        player: caller, streak_count: streak.streak_count, bonus,
                    },
                );
        }
    }

    // ─── View Functions ───────────────────────────────────────────────────

    #[abi(embed_v0)]
    impl ActionsViewImpl of IActionsView<ContractState> {
        fn get_player(
            self: @ContractState, addr: ContractAddress,
        ) -> (felt252, felt252, u32, u32, u32, u32, u32, u32, u32, u32, u32, u8) {
            let world = self.world_default();
            let p: Player = world.read_model(addr);
            (
                p.username,
                p.referral_code,
                p.total_score,
                p.games_played,
                p.games_won,
                p.highest_score,
                p.words_completed,
                p.tiles_placed,
                p.turns_played,
                p.referral_count,
                p.online_wins,
                p.current_level,
            )
        }

        fn get_player_count(self: @ContractState) -> u32 {
            self.player_count.read()
        }

        fn get_player_address(self: @ContractState, index: u32) -> ContractAddress {
            self.players.entry(index).read()
        }

        fn get_achievement(self: @ContractState, addr: ContractAddress, id: u8) -> bool {
            let world = self.world_default();
            let ach: Achievement = world.read_model((addr, id));
            ach.unlocked
        }

        fn get_daily_streak(
            self: @ContractState, addr: ContractAddress,
        ) -> (u64, u32, u32, u32) {
            let world = self.world_default();
            let streak: DailyStreak = world.read_model(addr);
            (streak.last_claim_time, streak.streak_count, streak.total_claims, streak.total_bonus)
        }

        fn get_game_result(
            self: @ContractState, addr: ContractAddress, game_id: u64,
        ) -> (u8, u32, u32, bool, u32, u32, u32, u8, bool, u64) {
            let world = self.world_default();
            let r: GameResult = world.read_model((addr, game_id));
            (
                r.difficulty,
                r.player_score,
                r.opponent_score,
                r.won,
                r.words_completed,
                r.tiles_placed,
                r.turns_taken,
                r.mode,
                r.forfeited,
                r.timestamp,
            )
        }

        fn get_game(
            self: @ContractState, game_id: u64,
        ) -> (ContractAddress, ContractAddress, u8, u8, u8, u8, u8, u32, u32, u32, u32, u32, u32, u32, u32, u32) {
            let world = self.world_default();
            let g: Game = world.read_model(game_id);
            (
                g.player_one,
                g.player_two,
                g.current_turn,
                g.status,
                g.result,
                g.difficulty,
                g.mode,
                g.score_one,
                g.score_two,
                g.words_one,
                g.words_two,
                g.tiles_one,
                g.tiles_two,
                g.turns_taken,
                g.tiles_swapped,
                g.move_count,
            )
        }

        fn get_player_game(self: @ContractState, addr: ContractAddress) -> u64 {
            let world = self.world_default();
            let pg: PlayerGame = world.read_model(addr);
            pg.game_id
        }

        fn get_game_count(self: @ContractState) -> u64 {
            self.game_count.read()
        }
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"crossword")
        }

        /// Identify whether the caller is player_one (true) or player_two (false).
        /// Panics if caller is neither.
        fn identify_player(self: @ContractState, game: @Game, caller: ContractAddress) -> bool {
            if *game.player_one == caller {
                return true;
            }
            if *game.player_two == caller {
                return false;
            }
            // For AI games (player_two == 0x0), only player_one can call
            assert(*game.player_two == caller, 'NOT_IN_GAME');
            false
        }

        /// Try to grant an achievement. No-op if already unlocked.
        fn try_grant(
            self: @ContractState,
            ref world: dojo::world::WorldStorage,
            player: ContractAddress,
            achievement_id: u8,
        ) {
            let existing: Achievement = world.read_model((player, achievement_id));
            if existing.unlocked {
                return;
            }

            let achievement = Achievement { player, achievement_id, unlocked: true };
            world.write_model(@achievement);

            world.emit_event(@AchievementUnlocked { player, achievement_id });
        }

        /// Finalize stats for one player after end_game.
        /// Writes GameResult, updates Player aggregate stats, checks achievements.
        fn finalize_player_stats(
            self: @ContractState,
            ref world: dojo::world::WorldStorage,
            player_addr: ContractAddress,
            game: @Game,
            won: bool,
            my_score: u32,
            opp_score: u32,
            my_words: u32,
            my_tiles: u32,
            timestamp: u64,
        ) {
            // Store GameResult
            let result = GameResult {
                player: player_addr,
                game_id: *game.game_id,
                difficulty: *game.difficulty,
                player_score: my_score,
                opponent_score: opp_score,
                won,
                words_completed: my_words,
                tiles_placed: my_tiles,
                turns_taken: *game.turns_taken,
                mode: *game.mode,
                forfeited: false,
                timestamp,
            };
            world.write_model(@result);

            // Update player aggregate stats
            let mut player: Player = world.read_model(player_addr);
            player.games_played += 1;
            player.total_score += my_score;
            player.words_completed += my_words;
            player.tiles_placed += my_tiles;
            player.turns_played += *game.turns_taken;
            player.tiles_swapped += *game.tiles_swapped;

            if won {
                player.games_won += 1;
                if my_score > player.highest_score {
                    player.highest_score = my_score;
                }
                if *game.mode == 2 {
                    player.online_wins += 1;
                }
            }
            world.write_model(@player);

            // Check all game achievements
            self
                .check_game_achievements(
                    ref world,
                    player_addr,
                    @player,
                    game,
                    won,
                    my_score,
                    opp_score,
                    my_words,
                );
        }

        /// Check all game-related achievements after end_game.
        fn check_game_achievements(
            self: @ContractState,
            ref world: dojo::world::WorldStorage,
            caller: ContractAddress,
            player: @Player,
            game: @Game,
            won: bool,
            player_score: u32,
            opponent_score: u32,
            words_completed: u32,
        ) {
            // FIRST_CLASH — games_played >= 1
            if *player.games_played >= 1 {
                self.try_grant(ref world, caller, ACH_FIRST_CLASH);
            }

            // WORD_SMITH — 5+ words in a single game
            if words_completed >= 5 {
                self.try_grant(ref world, caller, ACH_WORD_SMITH);
            }

            // VETERAN — 10 games played
            if *player.games_played >= 10 {
                self.try_grant(ref world, caller, ACH_VETERAN);
            }

            // PERFECT_ROUND — win with opponent scoring 0
            if won && opponent_score == 0 {
                self.try_grant(ref world, caller, ACH_PERFECT_ROUND);
            }

            // DOMINATOR — win by 50+ points
            if won && player_score >= opponent_score + 50 {
                self.try_grant(ref world, caller, ACH_DOMINATOR);
            }

            // WORD_MASTER — 10+ words in a single game
            if words_completed >= 10 {
                self.try_grant(ref world, caller, ACH_WORD_MASTER);
            }

            // HIGH_SCORER — score 500+ in a single game
            if player_score >= 500 {
                self.try_grant(ref world, caller, ACH_HIGH_SCORER);
            }

            // ONLINE_CHAMPION — win 5 online games (mode == 2)
            if won && *game.mode == 2 && *player.online_wins >= 5 {
                self.try_grant(ref world, caller, ACH_ONLINE_CHAMPION);
            }

            // HARD_MODE_HERO — win a hard difficulty game (difficulty == 2)
            if won && *game.difficulty == 2 {
                self.try_grant(ref world, caller, ACH_HARD_MODE_HERO);
            }
        }

        /// Check referral-based achievements for the referrer.
        fn check_referral_achievements(
            self: @ContractState,
            ref world: dojo::world::WorldStorage,
            referrer: ContractAddress,
            referral_count: u32,
        ) {
            if referral_count >= 5 {
                self.try_grant(ref world, referrer, ACH_INFLUENCER);
            }
        }
    }
}
