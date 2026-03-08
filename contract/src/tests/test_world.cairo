use dojo::model::ModelStorage;
use dojo::world::{WorldStorageTrait, world};
use dojo_cairo_test::{
    ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait,
    spawn_test_world,
};
use crossword::models::{
    Player, ReferralCode, GameResult, Achievement, DailyStreak, Game, PlayerGame, m_Player,
    m_ReferralCode, m_GameResult, m_Achievement, m_DailyStreak, m_Game, m_PlayerGame,
};
use crossword::systems::actions::{
    IActionsDispatcher, IActionsDispatcherTrait, IActionsViewDispatcher,
    IActionsViewDispatcherTrait, actions,
};
use starknet::ContractAddress;
use starknet::testing::{set_contract_address, set_block_timestamp};

fn namespace_def() -> NamespaceDef {
    let ndef = NamespaceDef {
        namespace: "crossword",
        resources: [
            TestResource::Model(m_Player::TEST_CLASS_HASH),
            TestResource::Model(m_ReferralCode::TEST_CLASS_HASH),
            TestResource::Model(m_GameResult::TEST_CLASS_HASH),
            TestResource::Model(m_Achievement::TEST_CLASS_HASH),
            TestResource::Model(m_DailyStreak::TEST_CLASS_HASH),
            TestResource::Model(m_Game::TEST_CLASS_HASH),
            TestResource::Model(m_PlayerGame::TEST_CLASS_HASH),
            TestResource::Event(actions::e_PlayerRegistered::TEST_CLASS_HASH),
            TestResource::Event(actions::e_ReferralApplied::TEST_CLASS_HASH),
            TestResource::Event(actions::e_GameStarted::TEST_CLASS_HASH),
            TestResource::Event(actions::e_GameJoined::TEST_CLASS_HASH),
            TestResource::Event(actions::e_PointsScored::TEST_CLASS_HASH),
            TestResource::Event(actions::e_TilePlaced::TEST_CLASS_HASH),
            TestResource::Event(actions::e_WordCompleted::TEST_CLASS_HASH),
            TestResource::Event(actions::e_TurnEnded::TEST_CLASS_HASH),
            TestResource::Event(actions::e_GameCompleted::TEST_CLASS_HASH),
            TestResource::Event(actions::e_AchievementUnlocked::TEST_CLASS_HASH),
            TestResource::Event(actions::e_DailyRewardClaimed::TEST_CLASS_HASH),
            TestResource::Contract(actions::TEST_CLASS_HASH),
        ]
            .span(),
    };
    ndef
}

fn contract_defs() -> Span<ContractDef> {
    [
        ContractDefTrait::new(@"crossword", @"actions")
            .with_writer_of([dojo::utils::bytearray_hash(@"crossword")].span()),
    ]
        .span()
}

fn setup_world() -> (dojo::world::WorldStorage, IActionsDispatcher) {
    let ndef = namespace_def();
    let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
    world.sync_perms_and_inits(contract_defs());

    let (contract_address, _) = world.dns(@"actions").unwrap();
    let actions = IActionsDispatcher { contract_address };

    (world, actions)
}

fn PLAYER1() -> ContractAddress {
    0x1.try_into().unwrap()
}

fn PLAYER2() -> ContractAddress {
    0x2.try_into().unwrap()
}

/// Helper: get the current game_id for a player from PlayerGame model.
fn get_game_id(world: @dojo::world::WorldStorage, player: ContractAddress) -> u64 {
    let pg: PlayerGame = world.read_model(player);
    pg.game_id
}

/// Helper: play a full game from start to end with real-time scoring.
/// Scores `player_pts` for the player and `opp_pts` for the opponent via score_points,
/// places `tiles` tiles for the player, completes `words` words for the player,
/// plays `turns` end_turns, swaps `swaps` tiles, then calls end_game.
fn play_full_game(
    world: @dojo::world::WorldStorage,
    actions: @IActionsDispatcher,
    player: ContractAddress,
    difficulty: u8,
    mode: u8,
    tiles: u32,
    words: u32,
    turns: u32,
    swaps: u32,
    player_pts: u32,
    opp_pts: u32,
) {
    (*actions).start_game(difficulty, mode);

    // Read the game_id from PlayerGame
    let game_id = get_game_id(world, player);

    // Score points for the player
    if player_pts > 0 {
        (*actions).score_points(game_id, player_pts, false);
    }

    // Score points for the opponent (AI)
    if opp_pts > 0 {
        (*actions).score_points(game_id, opp_pts, true);
    }

    let mut i: u32 = 0;
    while i < tiles {
        (*actions).place_tile(game_id, false);
        i += 1;
    };

    let mut i: u32 = 0;
    while i < words {
        (*actions).complete_word(game_id, false);
        i += 1;
    };

    let mut i: u32 = 0;
    while i < turns {
        (*actions).end_turn(game_id);
        i += 1;
    };

    let mut i: u32 = 0;
    while i < swaps {
        (*actions).swap_tiles(game_id);
        i += 1;
    };

    (*actions).end_game(game_id, 'board_full');
}

// ==================== Registration Tests ====================

#[test]
fn test_register_player() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    let player: Player = world.read_model(PLAYER1());
    assert(player.username == 'user1', 'Wrong username');
    let expected_code: felt252 = PLAYER1().into();
    assert(player.referral_code == expected_code, 'Wrong referral code');
    assert(player.referral_count == 0, 'Should have 0 referrals');
    assert(player.total_score == 0, 'Should have 0 score');
    assert(player.games_played == 0, 'Should have 0 games');
    assert(player.games_won == 0, 'Should have 0 wins');
    assert(player.highest_score == 0, 'Should have 0 highest');
    assert(player.words_completed == 0, 'Should have 0 words');
    assert(player.tiles_placed == 0, 'Should have 0 tiles');
    assert(player.turns_played == 0, 'Should have 0 turns');
    assert(player.tiles_swapped == 0, 'Should have 0 swaps');
    assert(player.games_forfeited == 0, 'Should have 0 forfeits');
    assert(player.online_wins == 0, 'Should have 0 online wins');
    assert(player.current_level == 0, 'Should have level 0');

    let code: ReferralCode = world.read_model(expected_code);
    assert(code.owner == PLAYER1(), 'Wrong code owner');

    let view = IActionsViewDispatcher { contract_address: actions.contract_address };
    assert(view.get_player_count() == 1, 'Count should be 1');
}

#[test]
#[should_panic]
fn test_cannot_register_twice() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.register_player('user2');
}

#[test]
fn test_register_multiple_players() {
    let (_world, actions) = setup_world();
    let view = IActionsViewDispatcher { contract_address: actions.contract_address };

    set_contract_address(PLAYER1());
    actions.register_player('alice');

    set_contract_address(PLAYER2());
    actions.register_player('bob');

    assert(view.get_player_count() == 2, 'Count should be 2');
    assert(view.get_player_address(0) == PLAYER1(), 'addr 0 should be P1');
    assert(view.get_player_address(1) == PLAYER2(), 'addr 1 should be P2');
}

// ==================== Referral Tests ====================

#[test]
fn test_apply_referral() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    let p1_code: felt252 = PLAYER1().into();

    set_contract_address(PLAYER2());
    actions.register_player('user2');

    actions.apply_referral(p1_code);

    let referrer: Player = world.read_model(PLAYER1());
    assert(referrer.referral_count == 1, 'Should have 1 referral');

    let referred: Player = world.read_model(PLAYER2());
    assert(referred.referred_by == PLAYER1(), 'Wrong referred_by');

    let ach: Achievement = world.read_model((PLAYER2(), 8_u8));
    assert(ach.unlocked, 'SOCIAL_PLAYER should unlock');
}

#[test]
#[should_panic]
fn test_cannot_self_refer() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    let p1_code: felt252 = PLAYER1().into();
    actions.apply_referral(p1_code);
}

#[test]
#[should_panic]
fn test_cannot_be_referred_twice() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    let p1_code: felt252 = PLAYER1().into();

    set_contract_address(PLAYER2());
    actions.register_player('user2');

    let player3: ContractAddress = 0x3.try_into().unwrap();
    set_contract_address(player3);
    actions.register_player('user3');

    actions.apply_referral(p1_code);
    let p2_code: felt252 = PLAYER2().into();
    actions.apply_referral(p2_code);
}

#[test]
fn test_influencer_achievement() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('referrer');
    let p1_code: felt252 = PLAYER1().into();

    let addr2: ContractAddress = 0x2.try_into().unwrap();
    set_contract_address(addr2);
    actions.register_player('u2');
    actions.apply_referral(p1_code);

    let addr3: ContractAddress = 0x3.try_into().unwrap();
    set_contract_address(addr3);
    actions.register_player('u3');
    actions.apply_referral(p1_code);

    let addr4: ContractAddress = 0x4.try_into().unwrap();
    set_contract_address(addr4);
    actions.register_player('u4');
    actions.apply_referral(p1_code);

    let addr5: ContractAddress = 0x5.try_into().unwrap();
    set_contract_address(addr5);
    actions.register_player('u5');
    actions.apply_referral(p1_code);

    let addr6: ContractAddress = 0x6.try_into().unwrap();
    set_contract_address(addr6);
    actions.register_player('u6');
    actions.apply_referral(p1_code);

    let referrer: Player = world.read_model(PLAYER1());
    assert(referrer.referral_count == 5, 'Should have 5 referrals');

    let ach: Achievement = world.read_model((PLAYER1(), 9_u8));
    assert(ach.unlocked, 'INFLUENCER should unlock');
}

// ==================== Game Session Tests ====================

#[test]
fn test_start_game() {
    let (world, actions) = setup_world();
    let view = IActionsViewDispatcher { contract_address: actions.contract_address };

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(1, 0); // medium difficulty, vs-ai

    let game_id = get_game_id(@world, PLAYER1());
    assert(game_id == 1, 'game_id should be 1');

    let game: Game = world.read_model(game_id);
    assert(game.player_one == PLAYER1(), 'Wrong player_one');
    assert(game.difficulty == 1, 'difficulty should be 1');
    assert(game.mode == 0, 'mode should be 0');
    assert(game.score_one == 0, 'score_one should be 0');
    assert(game.score_two == 0, 'score_two should be 0');
    assert(game.words_one == 0, 'words_one should be 0');
    assert(game.tiles_one == 0, 'tiles_one should be 0');
    assert(game.turns_taken == 0, 'turns should be 0');
    assert(game.tiles_swapped == 0, 'swaps should be 0');
    assert(game.status == 1, 'Should be active');
    assert(game.current_turn == 0, 'current_turn should be 0');

    // Verify global game counter
    assert(view.get_game_count() == 1, 'game_count should be 1');
}

#[test]
#[should_panic]
fn test_start_game_invalid_difficulty() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(3, 0);
}

#[test]
#[should_panic]
fn test_start_game_invalid_mode() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 3);
}

#[test]
fn test_start_game_auto_closes_stale_session() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let old_game_id = get_game_id(@world, PLAYER1());

    // Starting a new game should auto-close the old one
    actions.start_game(1, 1);

    let new_game_id = get_game_id(@world, PLAYER1());
    assert(new_game_id != old_game_id, 'Should be different game');

    let new_game: Game = world.read_model(new_game_id);
    assert(new_game.status == 1, 'New game should be active');
    assert(new_game.difficulty == 1, 'Should be new difficulty');
    assert(new_game.mode == 1, 'Should be new mode');

    // Old game should be finished
    let old_game: Game = world.read_model(old_game_id);
    assert(old_game.status == 2, 'Old game should be finished');
}

// ==================== Real-Time Scoring Tests ====================

#[test]
fn test_score_points_player() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());
    actions.score_points(game_id, 100, false);

    let game: Game = world.read_model(game_id);
    assert(game.score_one == 100, 'score_one should be 100');
    assert(game.score_two == 0, 'score_two should be 0');
}

#[test]
fn test_score_points_opponent() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());
    actions.score_points(game_id, 75, true);

    let game: Game = world.read_model(game_id);
    assert(game.score_one == 0, 'score_one should be 0');
    assert(game.score_two == 75, 'score_two should be 75');
}

#[test]
fn test_score_points_accumulates() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.score_points(game_id, 10, false);
    actions.score_points(game_id, 15, false);
    actions.score_points(game_id, 50, false);
    actions.score_points(game_id, 10, true);
    actions.score_points(game_id, 50, true);

    let game: Game = world.read_model(game_id);
    assert(game.score_one == 75, 'score_one should be 75');
    assert(game.score_two == 60, 'score_two should be 60');
}

#[test]
fn test_score_points_high_scorer_achievement() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.score_points(game_id, 200, false);
    let ach: Achievement = world.read_model((PLAYER1(), 7_u8));
    assert(!ach.unlocked, 'HIGH_SCORER not yet');

    actions.score_points(game_id, 300, false);
    let ach: Achievement = world.read_model((PLAYER1(), 7_u8));
    assert(ach.unlocked, 'HIGH_SCORER should unlock');
}

#[test]
fn test_score_points_opponent_no_achievement() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    // Opponent scores 600 — should NOT trigger HIGH_SCORER for player_one
    actions.score_points(game_id, 600, true);
    let ach: Achievement = world.read_model((PLAYER1(), 7_u8));
    assert(!ach.unlocked, 'HIGH_SCORER no opp unlock');
}

#[test]
#[should_panic]
fn test_score_points_no_session() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    // No game started — game_id 999 doesn't exist, status != ACTIVE
    actions.score_points(999, 10, false);
}

// ==================== Tile & Word Tracking Tests ====================

#[test]
fn test_place_tile_player() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.place_tile(game_id, false);
    actions.place_tile(game_id, false);
    actions.place_tile(game_id, false);

    let game: Game = world.read_model(game_id);
    assert(game.tiles_one == 3, 'Should have 3 tiles');
}

#[test]
fn test_place_tile_opponent_tracked_separately() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.place_tile(game_id, false); // player tile
    actions.place_tile(game_id, true);  // opponent tile (AI)
    actions.place_tile(game_id, false); // player tile

    let game: Game = world.read_model(game_id);
    assert(game.tiles_one == 2, 'Should have 2 player tiles');
    assert(game.tiles_two == 1, 'Should have 1 AI tile');
}

#[test]
fn test_complete_word_player() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.complete_word(game_id, false);
    actions.complete_word(game_id, false);

    let game: Game = world.read_model(game_id);
    assert(game.words_one == 2, 'Should have 2 words');
}

#[test]
fn test_complete_word_opponent_tracked_separately() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.complete_word(game_id, false); // player word
    actions.complete_word(game_id, true);  // opponent word
    actions.complete_word(game_id, false); // player word

    let game: Game = world.read_model(game_id);
    assert(game.words_one == 2, 'Should have 2 player words');
    assert(game.words_two == 1, 'Should have 1 AI word');
}

#[test]
fn test_word_smith_realtime() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.complete_word(game_id, false);
    actions.complete_word(game_id, false);
    actions.complete_word(game_id, false);
    actions.complete_word(game_id, false);

    let ach: Achievement = world.read_model((PLAYER1(), 2_u8));
    assert(!ach.unlocked, 'WORD_SMITH not yet at 4');

    actions.complete_word(game_id, false);

    let ach: Achievement = world.read_model((PLAYER1(), 2_u8));
    assert(ach.unlocked, 'WORD_SMITH should unlock at 5');
}

#[test]
fn test_word_master_realtime() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    let mut i: u32 = 0;
    while i < 10 {
        actions.complete_word(game_id, false);
        i += 1;
    };

    let ach: Achievement = world.read_model((PLAYER1(), 6_u8));
    assert(ach.unlocked, 'WORD_MASTER should unlock at 10');
}

#[test]
fn test_opponent_words_no_achievement() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    // Opponent (AI) completes 5 words — should NOT trigger WORD_SMITH for player
    let mut i: u32 = 0;
    while i < 5 {
        actions.complete_word(game_id, true);
        i += 1;
    };

    let ach: Achievement = world.read_model((PLAYER1(), 2_u8));
    assert(!ach.unlocked, 'WORD_SMITH no opp unlock');
}

#[test]
#[should_panic]
fn test_no_session_place_tile_panics() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.place_tile(999, false);
}

// ==================== Turn Management Tests ====================

#[test]
fn test_end_turn() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.end_turn(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.turns_taken == 1, 'Should have 1 turn');
    assert(game.current_turn == 1, 'Should toggle to 1');

    actions.end_turn(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.turns_taken == 2, 'Should have 2 turns');
    assert(game.current_turn == 0, 'Should toggle back to 0');
}

#[test]
fn test_end_turn_score_unchanged() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.score_points(game_id, 150, false);
    actions.end_turn(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.score_one == 150, 'Score should persist');
    assert(game.turns_taken == 1, 'Should have 1 turn');
}

#[test]
fn test_skip_turn() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.score_points(game_id, 50, false);
    actions.skip_turn(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.turns_taken == 1, 'Should have 1 turn');
    assert(game.score_one == 50, 'Score should stay 50');
}

#[test]
fn test_swap_tiles() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.swap_tiles(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.tiles_swapped == 1, 'Should have 1 swap');
    assert(game.turns_taken == 1, 'Should have 1 turn');
}

// ==================== Full Scoring Flow Test ====================

#[test]
fn test_full_scoring_flow() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(1, 0); // medium, vs-ai

    let game_id = get_game_id(@world, PLAYER1());

    // Turn 1: Player places 2 tiles, completes 1 word
    actions.score_points(game_id, 10, false);
    actions.place_tile(game_id, false);
    actions.score_points(game_id, 15, false);
    actions.place_tile(game_id, false);
    actions.score_points(game_id, 50, false);
    actions.complete_word(game_id, false);
    actions.end_turn(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.score_one == 75, 'Player score should be 75');
    assert(game.tiles_one == 2, 'Should have 2 player tiles');
    assert(game.words_one == 1, 'Should have 1 word');
    assert(game.turns_taken == 1, 'Should have 1 turn');

    // Turn 2: AI places 1 tile, scores 10
    actions.score_points(game_id, 10, true);
    actions.place_tile(game_id, true);
    actions.end_turn(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.score_two == 10, 'AI score should be 10');
    assert(game.tiles_one == 2, 'Player tiles still 2');
    assert(game.turns_taken == 2, 'Should have 2 turns');

    // Turn 3: Player places 1 tile
    actions.score_points(game_id, 10, false);
    actions.place_tile(game_id, false);
    actions.end_turn(game_id);

    let game: Game = world.read_model(game_id);
    assert(game.score_one == 85, 'Player score should be 85');
    assert(game.tiles_one == 3, 'Should have 3 player tiles');

    // End game
    actions.end_game(game_id, 'board_full');

    // Verify final state
    let player: Player = world.read_model(PLAYER1());
    assert(player.games_played == 1, 'Should have 1 game');
    assert(player.games_won == 1, 'Should have 1 win');
    assert(player.total_score == 85, 'Total score should be 85');
    assert(player.highest_score == 85, 'Highest should be 85');
    assert(player.tiles_placed == 3, 'Player tiles total 3');
    assert(player.words_completed == 1, 'Words total 1');
    assert(player.turns_played == 3, 'Turns total 3');

    let result: GameResult = world.read_model((PLAYER1(), game_id));
    assert(result.player_score == 85, 'Result player_score');
    assert(result.opponent_score == 10, 'Result opp_score');
    assert(result.won, 'Should have won');

    // Game should be finished
    let game: Game = world.read_model(game_id);
    assert(game.status == 2, 'Game should be finished');

    // PlayerGame should be cleared
    let pg: PlayerGame = world.read_model(PLAYER1());
    assert(pg.game_id == 0, 'PlayerGame should be cleared');

    // FIRST_CLASH should be unlocked
    let ach: Achievement = world.read_model((PLAYER1(), 1_u8));
    assert(ach.unlocked, 'FIRST_CLASH should unlock');
}

// ==================== End Game Tests ====================

#[test]
fn test_end_game_win() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 3, 2, 2, 1, 200, 100);

    let view = IActionsViewDispatcher { contract_address: actions.contract_address };
    let game_count = view.get_game_count();

    // Verify GameResult
    let result: GameResult = world.read_model((PLAYER1(), game_count));
    assert(result.difficulty == 0, 'Wrong difficulty');
    assert(result.player_score == 200, 'Wrong player_score');
    assert(result.opponent_score == 100, 'Wrong opp_score');
    assert(result.won, 'Should have won');
    assert(!result.forfeited, 'Should not be forfeited');
    assert(result.mode == 0, 'Wrong mode');

    // Verify player stats
    let player: Player = world.read_model(PLAYER1());
    assert(player.games_played == 1, 'Should have 1 game');
    assert(player.games_won == 1, 'Should have 1 win');
    assert(player.total_score == 200, 'Wrong total score');
    assert(player.highest_score == 200, 'Wrong highest score');
    assert(player.tiles_placed == 3, 'Wrong tiles_placed');
    assert(player.words_completed == 2, 'Wrong words_completed');
    // turns = 2 end_turns + 1 swap = 3
    assert(player.turns_played == 3, 'Wrong turns_played');
    assert(player.tiles_swapped == 1, 'Wrong tiles_swapped');

    // Verify game is finished
    let game: Game = world.read_model(game_count);
    assert(game.status == 2, 'Game should be finished');
}

#[test]
fn test_end_game_loss() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 1, 1, 1, 0, 50, 200);

    let player: Player = world.read_model(PLAYER1());
    assert(player.games_played == 1, 'Should have 1 game');
    assert(player.games_won == 0, 'Should have 0 wins');
    assert(player.total_score == 50, 'Wrong total score');
}

#[test]
#[should_panic]
fn test_end_game_no_session() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.end_game(999, 'board_full');
}

#[test]
fn test_multiple_games() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    // Game 1: win with score 300
    play_full_game(@world, @actions, PLAYER1(), 0, 0, 5, 3, 3, 0, 300, 100);

    // Game 2: lose with score 150
    play_full_game(@world, @actions, PLAYER1(), 1, 0, 2, 1, 2, 1, 150, 400);

    let player: Player = world.read_model(PLAYER1());
    assert(player.games_played == 2, 'Should have 2 games');
    assert(player.games_won == 1, 'Should have 1 win');
    assert(player.total_score == 450, 'Wrong total (300+150)');
    assert(player.highest_score == 300, 'Highest should be 300');
    assert(player.tiles_placed == 7, 'Wrong tiles (5+2)');
    assert(player.words_completed == 4, 'Wrong words (3+1)');

    // Verify both GameResults exist
    let r1: GameResult = world.read_model((PLAYER1(), 1_u64));
    assert(r1.won, 'Game 1 should be won');
    let r2: GameResult = world.read_model((PLAYER1(), 2_u64));
    assert(!r2.won, 'Game 2 should be lost');
}

// ==================== Forfeit Tests ====================

#[test]
fn test_forfeit_game() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());

    actions.place_tile(game_id, false);
    actions.place_tile(game_id, false);
    actions.complete_word(game_id, false);
    actions.score_points(game_id, 80, false);
    actions.end_turn(game_id);

    actions.forfeit_game(game_id);

    // Verify GameResult
    let result: GameResult = world.read_model((PLAYER1(), game_id));
    assert(result.forfeited, 'Should be forfeited');
    assert(!result.won, 'Should not be won');
    assert(result.player_score == 80, 'Score should be 80');

    // Verify player stats
    let player: Player = world.read_model(PLAYER1());
    assert(player.games_played == 1, 'Should have 1 game');
    assert(player.games_forfeited == 1, 'Should have 1 forfeit');
    assert(player.games_won == 0, 'Should have 0 wins');
    assert(player.tiles_placed == 2, 'Wrong tiles_placed');
    assert(player.words_completed == 1, 'Wrong words_completed');
    assert(player.total_score == 80, 'Wrong total_score');

    // Game should be finished
    let game: Game = world.read_model(game_id);
    assert(game.status == 2, 'Game should be finished');

    // PlayerGame should be cleared
    let pg: PlayerGame = world.read_model(PLAYER1());
    assert(pg.game_id == 0, 'PlayerGame should be cleared');

    // FIRST_CLASH achievement
    let ach: Achievement = world.read_model((PLAYER1(), 1_u8));
    assert(ach.unlocked, 'FIRST_CLASH should unlock');
}

#[test]
#[should_panic]
fn test_forfeit_no_session() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.forfeit_game(999);
}

// ==================== Achievement Tests ====================

#[test]
fn test_first_clash() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 1, 1, 1, 0, 100, 50);

    let ach: Achievement = world.read_model((PLAYER1(), 1_u8));
    assert(ach.unlocked, 'FIRST_CLASH should unlock');
}

#[test]
fn test_word_smith_at_end_game() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 5, 5, 3, 0, 200, 100);

    let ach: Achievement = world.read_model((PLAYER1(), 2_u8));
    assert(ach.unlocked, 'WORD_SMITH should unlock');
}

#[test]
fn test_perfect_round() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 3, 2, 2, 0, 300, 0);

    let ach: Achievement = world.read_model((PLAYER1(), 4_u8));
    assert(ach.unlocked, 'PERFECT_ROUND should unlock');
}

#[test]
fn test_dominator() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 3, 2, 2, 0, 150, 100);

    let ach: Achievement = world.read_model((PLAYER1(), 5_u8));
    assert(ach.unlocked, 'DOMINATOR should unlock');
}

#[test]
fn test_high_scorer_at_end_game() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 10, 8, 5, 0, 500, 200);

    let ach: Achievement = world.read_model((PLAYER1(), 7_u8));
    assert(ach.unlocked, 'HIGH_SCORER should unlock');
}

#[test]
fn test_hard_mode_hero() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 2, 0, 3, 2, 2, 0, 200, 100);

    let ach: Achievement = world.read_model((PLAYER1(), 12_u8));
    assert(ach.unlocked, 'HARD_MODE_HERO should unlock');
}

#[test]
fn test_veteran_after_10_games() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    let mut i: u32 = 0;
    while i < 9 {
        play_full_game(@world, @actions, PLAYER1(), 0, 0, 1, 0, 1, 0, 10, 5);
        i += 1;
    };

    let ach: Achievement = world.read_model((PLAYER1(), 3_u8));
    assert(!ach.unlocked, 'VETERAN should not unlock at 9');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 1, 0, 1, 0, 10, 5);

    let ach: Achievement = world.read_model((PLAYER1(), 3_u8));
    assert(ach.unlocked, 'VETERAN should unlock at 10');
}

#[test]
fn test_online_champion() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    set_contract_address(PLAYER2());
    actions.register_player('user2');

    // Win 5 online games (mode=2)
    // For online games, P2 must join. Then P1 ends the game.
    let mut i: u32 = 0;
    while i < 5 {
        set_contract_address(PLAYER1());
        actions.start_game(0, 2); // online mode
        let game_id = get_game_id(@world, PLAYER1());

        set_contract_address(PLAYER2());
        actions.join_game(game_id);

        // P1 scores more to win
        set_contract_address(PLAYER1());
        actions.score_points(game_id, 100, false);

        set_contract_address(PLAYER2());
        actions.score_points(game_id, 50, false);

        set_contract_address(PLAYER1());
        actions.end_game(game_id, 'board_full');

        i += 1;
    };

    let ach: Achievement = world.read_model((PLAYER1(), 11_u8));
    assert(ach.unlocked, 'ONLINE_CHAMPION should unlock');
}

#[test]
fn test_achievement_idempotent() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    play_full_game(@world, @actions, PLAYER1(), 0, 0, 1, 1, 1, 0, 100, 50);
    play_full_game(@world, @actions, PLAYER1(), 0, 0, 1, 1, 1, 0, 100, 50);

    let ach: Achievement = world.read_model((PLAYER1(), 1_u8));
    assert(ach.unlocked, 'Should still be unlocked');
}

// ==================== Daily Streak Tests ====================

#[test]
fn test_claim_daily_reward() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    set_block_timestamp(100000);
    actions.claim_daily_reward();

    let streak: DailyStreak = world.read_model(PLAYER1());
    assert(streak.streak_count == 1, 'Should have streak 1');
    assert(streak.total_claims == 1, 'Should have 1 claim');
    assert(streak.total_bonus == 10, 'Wrong total bonus');

    set_block_timestamp(100000 + 72001);
    actions.claim_daily_reward();

    let streak: DailyStreak = world.read_model(PLAYER1());
    assert(streak.streak_count == 2, 'Should have streak 2');
    assert(streak.total_claims == 2, 'Should have 2 claims');
    assert(streak.total_bonus == 30, 'Wrong total bonus 2');
}

#[test]
#[should_panic]
fn test_claim_too_early() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    set_block_timestamp(100000);
    actions.claim_daily_reward();

    set_block_timestamp(100000 + 71999);
    actions.claim_daily_reward();
}

#[test]
fn test_streak_reset() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    set_block_timestamp(100000);
    actions.claim_daily_reward();

    set_block_timestamp(100000 + 172801);
    actions.claim_daily_reward();

    let streak: DailyStreak = world.read_model(PLAYER1());
    assert(streak.streak_count == 1, 'Streak should reset to 1');
    assert(streak.total_claims == 2, 'Should have 2 claims');
}

#[test]
fn test_streak_keeper_achievement() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    let mut t: u64 = 100000;
    let mut i: u32 = 0;
    while i < 7 {
        set_block_timestamp(t);
        actions.claim_daily_reward();
        t += 72001;
        i += 1;
    };

    let ach: Achievement = world.read_model((PLAYER1(), 10_u8));
    assert(ach.unlocked, 'STREAK_KEEPER should unlock');
}

// ==================== View Function Tests ====================

#[test]
fn test_view_functions() {
    let (_world, actions) = setup_world();
    let view = IActionsViewDispatcher { contract_address: actions.contract_address };

    assert(view.get_player_count() == 0, 'count should be 0');

    set_contract_address(PLAYER1());
    actions.register_player('alice');

    assert(view.get_player_count() == 1, 'count should be 1');
    assert(view.get_player_address(0) == PLAYER1(), 'addr 0 should be P1');

    let (
        username,
        referral_code,
        total_score,
        games_played,
        games_won,
        highest_score,
        words_completed,
        tiles_placed,
        turns_played,
        referral_count,
        online_wins,
        current_level,
    ) =
        view
        .get_player(PLAYER1());
    assert(username == 'alice', 'username mismatch');
    let expected_code: felt252 = PLAYER1().into();
    assert(referral_code == expected_code, 'code mismatch');
    assert(total_score == 0, 'score should be 0');
    assert(games_played == 0, 'games should be 0');
    assert(games_won == 0, 'wins should be 0');
    assert(highest_score == 0, 'highest should be 0');
    assert(words_completed == 0, 'words should be 0');
    assert(tiles_placed == 0, 'tiles should be 0');
    assert(turns_played == 0, 'turns should be 0');
    assert(referral_count == 0, 'refs should be 0');
    assert(online_wins == 0, 'online_wins should be 0');
    assert(current_level == 0, 'level should be 0');

    assert(!view.get_achievement(PLAYER1(), 1_u8), 'ach1 should not unlock');

    set_contract_address(PLAYER2());
    actions.register_player('bob');

    assert(view.get_player_count() == 2, 'count should be 2');
    assert(view.get_player_address(1) == PLAYER2(), 'addr 1 should be P2');
}

#[test]
fn test_view_game_and_player_game() {
    let (world, actions) = setup_world();
    let view = IActionsViewDispatcher { contract_address: actions.contract_address };

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    // Before starting a game, player_game should be 0
    assert(view.get_player_game(PLAYER1()) == 0, 'Should have no game');

    // Start and play a game
    actions.start_game(1, 0); // medium, vs-ai

    let game_id = view.get_player_game(PLAYER1());
    assert(game_id == 1, 'game_id should be 1');

    // Verify get_game
    let (
        p1, _p2, current_turn, status, _result, difficulty, mode,
        score_one, score_two, _w1, _w2, _t1, _t2, _tt, _ts, _mc,
    ) = view.get_game(game_id);
    assert(p1 == PLAYER1(), 'Wrong player_one');
    assert(status == 1, 'Should be active');
    assert(difficulty == 1, 'difficulty should be 1');
    assert(mode == 0, 'mode should be 0');
    assert(current_turn == 0, 'current_turn should be 0');
    assert(score_one == 0, 'score_one should be 0');
    assert(score_two == 0, 'score_two should be 0');

    // Score some points
    actions.score_points(game_id, 150, false);
    actions.score_points(game_id, 80, true);

    let (
        _p1, _p2, _ct, _s, _r, _d, _m,
        s1, s2, _w1, _w2, _t1, _t2, _tt, _ts, _mc,
    ) = view.get_game(game_id);
    assert(s1 == 150, 'score_one should be 150');
    assert(s2 == 80, 'score_two should be 80');

    // End the game
    actions.end_game(game_id, 'board_full');

    // Verify game result via view
    let (
        difficulty,
        player_score,
        opponent_score,
        won,
        words_completed,
        _tp,
        _tt,
        mode,
        forfeited,
        _ts,
    ) =
        view
        .get_game_result(PLAYER1(), game_id);
    assert(difficulty == 1, 'Wrong difficulty');
    assert(player_score == 150, 'Wrong player_score');
    assert(opponent_score == 80, 'Wrong opp_score');
    assert(won, 'Should have won');
    assert(words_completed == 0, 'Wrong words_completed');
    assert(mode == 0, 'Wrong mode');
    assert(!forfeited, 'Should not be forfeited');

    // Verify daily streak view (should be zeroes)
    let (last_claim_time, streak_count, total_claims, total_bonus) = view
        .get_daily_streak(PLAYER1());
    assert(last_claim_time == 0, 'claim_time should be 0');
    assert(streak_count == 0, 'streak should be 0');
    assert(total_claims == 0, 'claims should be 0');
    assert(total_bonus == 0, 'bonus should be 0');

    // PlayerGame should be cleared after end_game
    assert(view.get_player_game(PLAYER1()) == 0, 'PlayerGame should clear');
}

// ==================== New Two-Player Tests ====================

#[test]
fn test_join_game() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('alice');
    actions.start_game(1, 2); // online mode

    let game_id = get_game_id(@world, PLAYER1());

    // Game should be waiting
    let game: Game = world.read_model(game_id);
    assert(game.status == 0, 'Should be waiting');

    set_contract_address(PLAYER2());
    actions.register_player('bob');
    actions.join_game(game_id);

    // Game should now be active with player_two set
    let game: Game = world.read_model(game_id);
    assert(game.status == 1, 'Should be active after join');
    assert(game.player_two == PLAYER2(), 'player_two should be P2');

    // PlayerGame for P2 should be set
    let pg: PlayerGame = world.read_model(PLAYER2());
    assert(pg.game_id == game_id, 'P2 PlayerGame wrong');
}

#[test]
#[should_panic]
fn test_cannot_join_own_game() {
    let (_world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('alice');
    actions.start_game(1, 2);

    // P1 tries to join their own game
    let view = IActionsViewDispatcher { contract_address: actions.contract_address };
    let game_id = view.get_player_game(PLAYER1());
    actions.join_game(game_id);
}

#[test]
fn test_both_players_score() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('alice');
    actions.start_game(0, 2); // online

    let game_id = get_game_id(@world, PLAYER1());

    set_contract_address(PLAYER2());
    actions.register_player('bob');
    actions.join_game(game_id);

    // P1 scores
    set_contract_address(PLAYER1());
    actions.score_points(game_id, 100, false);

    // P2 scores
    set_contract_address(PLAYER2());
    actions.score_points(game_id, 75, false);

    let game: Game = world.read_model(game_id);
    assert(game.score_one == 100, 'P1 score should be 100');
    assert(game.score_two == 75, 'P2 score should be 75');
}

#[test]
fn test_both_players_achievements() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('alice');
    actions.start_game(0, 2); // online

    let game_id = get_game_id(@world, PLAYER1());

    set_contract_address(PLAYER2());
    actions.register_player('bob');
    actions.join_game(game_id);

    // Both players score and complete words
    set_contract_address(PLAYER1());
    actions.score_points(game_id, 200, false);

    set_contract_address(PLAYER2());
    actions.score_points(game_id, 100, false);

    set_contract_address(PLAYER1());
    actions.end_game(game_id, 'board_full');

    // P1 won — should get FIRST_CLASH
    let ach_p1: Achievement = world.read_model((PLAYER1(), 1_u8));
    assert(ach_p1.unlocked, 'P1 FIRST_CLASH should unlock');

    // P2 also played — should get FIRST_CLASH
    let ach_p2: Achievement = world.read_model((PLAYER2(), 1_u8));
    assert(ach_p2.unlocked, 'P2 FIRST_CLASH should unlock');
}

#[test]
fn test_game_result_for_both() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('alice');
    actions.start_game(0, 2); // online

    let game_id = get_game_id(@world, PLAYER1());

    set_contract_address(PLAYER2());
    actions.register_player('bob');
    actions.join_game(game_id);

    set_contract_address(PLAYER1());
    actions.score_points(game_id, 300, false);

    set_contract_address(PLAYER2());
    actions.score_points(game_id, 150, false);

    set_contract_address(PLAYER1());
    actions.end_game(game_id, 'board_full');

    // Verify GameResult for P1
    let r1: GameResult = world.read_model((PLAYER1(), game_id));
    assert(r1.won, 'P1 should have won');
    assert(r1.player_score == 300, 'P1 score wrong');
    assert(r1.opponent_score == 150, 'P1 opp score wrong');

    // Verify GameResult for P2
    let r2: GameResult = world.read_model((PLAYER2(), game_id));
    assert(!r2.won, 'P2 should have lost');
    assert(r2.player_score == 150, 'P2 score wrong');
    assert(r2.opponent_score == 300, 'P2 opp score wrong');
}

#[test]
fn test_global_game_counter() {
    let (world, actions) = setup_world();
    let view = IActionsViewDispatcher { contract_address: actions.contract_address };

    set_contract_address(PLAYER1());
    actions.register_player('user1');

    assert(view.get_game_count() == 0, 'Should start at 0');

    actions.start_game(0, 0);
    assert(view.get_game_count() == 1, 'Should be 1');

    let game_id1 = get_game_id(@world, PLAYER1());
    actions.end_game(game_id1, 'board_full');

    actions.start_game(0, 0);
    assert(view.get_game_count() == 2, 'Should be 2');

    let game_id2 = get_game_id(@world, PLAYER1());
    assert(game_id2 == 2, 'Second game should be id 2');
}

#[test]
fn test_player_game_cleared() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('user1');
    actions.start_game(0, 0);

    let game_id = get_game_id(@world, PLAYER1());
    assert(game_id != 0, 'Should have game_id');

    actions.end_game(game_id, 'board_full');

    let pg: PlayerGame = world.read_model(PLAYER1());
    assert(pg.game_id == 0, 'Should be cleared after end');
}

#[test]
#[should_panic]
fn test_for_opponent_not_allowed_online() {
    let (world, actions) = setup_world();

    set_contract_address(PLAYER1());
    actions.register_player('alice');
    actions.start_game(0, 2); // online

    let game_id = get_game_id(@world, PLAYER1());

    set_contract_address(PLAYER2());
    actions.register_player('bob');
    actions.join_game(game_id);

    // P1 tries for_opponent in online mode — should panic
    set_contract_address(PLAYER1());
    actions.score_points(game_id, 100, true);
}
