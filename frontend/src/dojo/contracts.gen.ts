import { DojoProvider, type DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, type BigNumberish } from "starknet";

export function setupWorld(provider: DojoProvider) {
  // register_player(username: felt252)
  const build_actions_registerPlayer_calldata = (
    username: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "register_player",
      calldata: [username],
    };
  };

  const actions_registerPlayer = async (
    snAccount: Account | AccountInterface,
    username: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_registerPlayer_calldata(username),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // apply_referral(code: felt252)
  const build_actions_applyReferral_calldata = (
    code: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "apply_referral",
      calldata: [code],
    };
  };

  const actions_applyReferral = async (
    snAccount: Account | AccountInterface,
    code: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_applyReferral_calldata(code),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // start_game(difficulty: u8, mode: u8)
  const build_actions_startGame_calldata = (
    difficulty: BigNumberish,
    mode: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "start_game",
      calldata: [difficulty, mode],
    };
  };

  const actions_startGame = async (
    snAccount: Account | AccountInterface,
    difficulty: BigNumberish,
    mode: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_startGame_calldata(difficulty, mode),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // join_game(game_id: u64)
  const build_actions_joinGame_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "join_game",
      calldata: [gameId],
    };
  };

  const actions_joinGame = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_joinGame_calldata(gameId),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // score_points(game_id: u64, points: u32, for_opponent: bool)
  const build_actions_scorePoints_calldata = (
    gameId: BigNumberish,
    points: BigNumberish,
    forOpponent: boolean
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "score_points",
      calldata: [gameId, points, forOpponent ? 1 : 0],
    };
  };

  const actions_scorePoints = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish,
    points: BigNumberish,
    forOpponent: boolean
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_scorePoints_calldata(gameId, points, forOpponent),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // place_tile(game_id: u64, for_opponent: bool)
  const build_actions_placeTile_calldata = (
    gameId: BigNumberish,
    forOpponent: boolean
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "place_tile",
      calldata: [gameId, forOpponent ? 1 : 0],
    };
  };

  const actions_placeTile = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish,
    forOpponent: boolean
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_placeTile_calldata(gameId, forOpponent),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // complete_word(game_id: u64, for_opponent: bool)
  const build_actions_completeWord_calldata = (
    gameId: BigNumberish,
    forOpponent: boolean
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "complete_word",
      calldata: [gameId, forOpponent ? 1 : 0],
    };
  };

  const actions_completeWord = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish,
    forOpponent: boolean
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_completeWord_calldata(gameId, forOpponent),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // end_turn(game_id: u64)
  const build_actions_endTurn_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "end_turn",
      calldata: [gameId],
    };
  };

  const actions_endTurn = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_endTurn_calldata(gameId),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // skip_turn(game_id: u64)
  const build_actions_skipTurn_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "skip_turn",
      calldata: [gameId],
    };
  };

  const actions_skipTurn = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_skipTurn_calldata(gameId),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // swap_tiles(game_id: u64)
  const build_actions_swapTiles_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "swap_tiles",
      calldata: [gameId],
    };
  };

  const actions_swapTiles = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_swapTiles_calldata(gameId),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // end_game(game_id: u64, result_reason: felt252)
  const build_actions_endGame_calldata = (
    gameId: BigNumberish,
    resultReason: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "end_game",
      calldata: [gameId, resultReason],
    };
  };

  const actions_endGame = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish,
    resultReason: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_endGame_calldata(gameId, resultReason),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // forfeit_game(game_id: u64)
  const build_actions_forfeitGame_calldata = (
    gameId: BigNumberish
  ): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "forfeit_game",
      calldata: [gameId],
    };
  };

  const actions_forfeitGame = async (
    snAccount: Account | AccountInterface,
    gameId: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_forfeitGame_calldata(gameId),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // claim_daily_reward()
  const build_actions_claimDailyReward_calldata = (): DojoCall => {
    return {
      contractName: "actions",
      entrypoint: "claim_daily_reward",
      calldata: [],
    };
  };

  const actions_claimDailyReward = async (
    snAccount: Account | AccountInterface
  ) => {
    try {
      return await provider.execute(
        snAccount as any,
        build_actions_claimDailyReward_calldata(),
        "crossword"
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return {
    actions: {
      registerPlayer: actions_registerPlayer,
      buildRegisterPlayerCalldata: build_actions_registerPlayer_calldata,
      applyReferral: actions_applyReferral,
      buildApplyReferralCalldata: build_actions_applyReferral_calldata,
      startGame: actions_startGame,
      buildStartGameCalldata: build_actions_startGame_calldata,
      joinGame: actions_joinGame,
      buildJoinGameCalldata: build_actions_joinGame_calldata,
      scorePoints: actions_scorePoints,
      buildScorePointsCalldata: build_actions_scorePoints_calldata,
      placeTile: actions_placeTile,
      buildPlaceTileCalldata: build_actions_placeTile_calldata,
      completeWord: actions_completeWord,
      buildCompleteWordCalldata: build_actions_completeWord_calldata,
      endTurn: actions_endTurn,
      buildEndTurnCalldata: build_actions_endTurn_calldata,
      skipTurn: actions_skipTurn,
      buildSkipTurnCalldata: build_actions_skipTurn_calldata,
      swapTiles: actions_swapTiles,
      buildSwapTilesCalldata: build_actions_swapTiles_calldata,
      endGame: actions_endGame,
      buildEndGameCalldata: build_actions_endGame_calldata,
      forfeitGame: actions_forfeitGame,
      buildForfeitGameCalldata: build_actions_forfeitGame_calldata,
      claimDailyReward: actions_claimDailyReward,
      buildClaimDailyRewardCalldata: build_actions_claimDailyReward_calldata,
    },
  };
}
