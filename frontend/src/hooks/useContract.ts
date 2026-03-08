import { useDojoSDK } from "@dojoengine/sdk/react";
import { toast } from "react-toastify";

/** Map raw contract errors to friendly messages */
const ERROR_MAP: Record<string, string> = {
  ALREADY_REGISTERED: "Player already registered",
  NOT_REGISTERED: "Please connect your wallet first",
  CODE_ALREADY_EXISTS: "That referral code already exists",
  ALREADY_REFERRED: "You already applied a referral",
  CANNOT_SELF_REFER: "Cannot use your own code",
  INVALID_REFERRAL_CODE: "Referral code not found",
  INVALID_DIFFICULTY: "Invalid difficulty setting",
  INVALID_MODE: "Invalid game mode",
  GAME_NOT_ACTIVE: "No active game session",
  GAME_NOT_JOINABLE: "Game is not available to join",
  NOT_ONLINE_GAME: "Not an online game",
  CANNOT_JOIN_OWN_GAME: "Cannot join your own game",
  NOT_IN_GAME: "You are not a player in this game",
  OPPONENT_SCORE_AI_ONLY: "Cannot score for opponent in online mode",
  ONLY_P1_FOR_OPPONENT: "Only host can report AI scores",
  TOO_EARLY_TO_CLAIM: "Daily reward: try again later",
};

function friendlyError(error: any): string {
  const msg = error?.message || String(error);
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return friendly;
  }
  if (msg.includes("Failed to fetch") || msg.includes("network")) {
    return "Network error, check your connection";
  }
  if (msg.includes("rejected") || msg.includes("User abort")) {
    return "Transaction rejected";
  }
  return "Something went wrong";
}

type CallResult = { success: boolean; error?: string };

/**
 * Typed contract interaction hook for all crossword smart contract methods.
 *
 * - `call*` methods show a toast on error (user-facing actions).
 * - `silent*` methods return success/error silently (background gameplay actions).
 */
const useContract = () => {
  const { client } = useDojoSDK();

  /** Call with toast on error — for user-initiated actions */
  async function call(method: string, ...args: any[]): Promise<boolean> {
    try {
      const account = window.Wallet?.Account;
      if (!account) return false;
      const tx = await (client.actions as any)[method](account, ...args);
      await account.waitForTransaction(tx.transaction_hash);
      return true;
    } catch (error: any) {
      toast.error(friendlyError(error));
      return false;
    }
  }

  /** Call silently — for background/gameplay actions */
  async function callSilent(method: string, ...args: any[]): Promise<CallResult> {
    try {
      const account = window.Wallet?.Account;
      if (!account) return { success: false, error: "No wallet" };
      const tx = await (client.actions as any)[method](account, ...args);
      await account.waitForTransaction(tx.transaction_hash);
      return { success: true };
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.warn(`[contract] ${method} failed:`, msg);
      return { success: false, error: msg };
    }
  }

  // ── User-facing actions (toast on error) ──────────────────────────

  /** Register a new player with a username */
  const registerPlayer = (username: string) =>
    call("registerPlayer", username);

  /** Apply a referral code from another player */
  const applyReferral = (code: string) =>
    call("applyReferral", code);

  /** Claim the daily login reward */
  const claimDailyReward = () =>
    call("claimDailyReward");

  /** Forfeit the current game (user-initiated quit) */
  const forfeitGame = (gameId: number) =>
    call("forfeitGame", gameId);

  /** Join an online game */
  const joinGame = (gameId: number) =>
    call("joinGame", gameId);

  // ── Gameplay actions (silent, non-blocking feedback) ───────────────

  /** Start a new game session */
  const startGame = (difficulty: number, mode: number) =>
    callSilent("startGame", difficulty, mode);

  /**
   * Real-time scoring — called every time any player earns points.
   * Updates game score on-chain and checks achievements on every score event.
   */
  const scorePoints = (gameId: number, points: number, forOpponent: boolean) =>
    callSilent("scorePoints", gameId, points, forOpponent);

  /** Record a tile placement */
  const placeTile = (gameId: number, forOpponent: boolean) =>
    callSilent("placeTile", gameId, forOpponent);

  /** Record a word completion */
  const completeWord = (gameId: number, forOpponent: boolean) =>
    callSilent("completeWord", gameId, forOpponent);

  /** End the current turn */
  const endTurn = (gameId: number) =>
    callSilent("endTurn", gameId);

  /** Skip the current turn */
  const skipTurn = (gameId: number) =>
    callSilent("skipTurn", gameId);

  /** Swap all tiles in hand */
  const swapTiles = (gameId: number) =>
    callSilent("swapTiles", gameId);

  /** End the game and record final results */
  const endGame = (gameId: number, resultReason: string) =>
    callSilent("endGame", gameId, resultReason);

  return {
    // User-facing
    registerPlayer,
    applyReferral,
    claimDailyReward,
    forfeitGame,
    joinGame,

    // Gameplay
    startGame,
    scorePoints,
    placeTile,
    completeWord,
    endTurn,
    skipTurn,
    swapTiles,
    endGame,

    // Generic (escape hatch)
    call,
    callSilent,
  };
};

export default useContract;
