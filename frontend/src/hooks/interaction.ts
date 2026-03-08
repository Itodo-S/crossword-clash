import { useDojoSDK } from "@dojoengine/sdk/react";
import { toast } from "react-toastify";

// Map raw contract errors to friendly messages
const ERROR_MAP: Record<string, string> = {
  ALREADY_REGISTERED: "Player already registered",
  NOT_REGISTERED: "Please connect your wallet first",
  CODE_ALREADY_EXISTS: "That referral code already exists",
  ALREADY_REFERRED: "You already applied a referral",
  CANNOT_SELF_REFER: "Cannot use your own code",
  INVALID_REFERRAL_CODE: "Referral code not found",
  GAME_ALREADY_ACTIVE: "A game is already in progress",
  INVALID_DIFFICULTY: "Invalid difficulty setting",
  INVALID_MODE: "Invalid game mode",
  NO_ACTIVE_SESSION: "No active game session",
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

const useInteraction = () => {
  const { client } = useDojoSDK();

  /**
   * Call a contract method — shows toast on error.
   * Use for user-initiated actions (claim reward, apply referral, end game).
   */
  async function call(method: string, ...args: any) {
    try {
      const account = window.Wallet?.Account;
      if (!account) return false;
      const tx = await (client.actions as any)[method](account, ...args);
      const receipt = await account.waitForTransaction(tx.transaction_hash);
      console.log(receipt);
      return true;
    } catch (error: any) {
      toast.error(friendlyError(error));
      return false;
    }
  }

  /**
   * Call a contract method silently — no toast, just returns true/false.
   * Use for background/gameplay actions (place tile, complete word, end turn, start game).
   */
  async function callSilent(method: string, ...args: any): Promise<{ success: boolean; error?: string }> {
    try {
      const account = window.Wallet?.Account;
      if (!account) return { success: false, error: "No wallet" };
      const tx = await (client.actions as any)[method](account, ...args);
      const receipt = await account.waitForTransaction(tx.transaction_hash);
      console.log(receipt);
      return { success: true };
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.warn(`[callSilent] ${method} failed:`, msg);
      return { success: false, error: msg };
    }
  }

  return { call, callSilent };
};

export default useInteraction;
