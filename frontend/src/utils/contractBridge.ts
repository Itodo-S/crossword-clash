import MANIFEST from '../dojo/manifest.json';

const CONTRACT_ADDRESS = MANIFEST.contracts[0].address;

let _client: any = null;

export function setContractClient(client: any) {
  _client = client;
}

/** Fire-and-forget contract call — game engine doesn't block on chain. */
export function contractCall(method: string, ...args: any[]) {
  const account = window.Wallet?.Account;
  if (!account || !_client) return;
  (_client.actions as any)[method](account, ...args).catch((err: any) =>
    console.warn(`[contract] ${method} failed:`, err),
  );
}

/** Async contract call — awaits tx confirmation. Returns tx or null. */
export async function contractCallAsync(method: string, ...args: any[]): Promise<any> {
  const account = window.Wallet?.Account;
  if (!account || !_client) return null;
  try {
    const tx = await (_client.actions as any)[method](account, ...args);
    await account.waitForTransaction(tx.transaction_hash);
    return tx;
  } catch (err: any) {
    console.warn(`[contract] ${method} failed:`, err);
    return null;
  }
}

/**
 * Read the current player's game_id from chain via get_player_game view function.
 * Uses the account's underlying RPC provider to call the contract directly.
 */
export async function readPlayerGameId(): Promise<number | null> {
  const account = window.Wallet?.Account;
  if (!account) return null;
  try {
    const provider = (account as any).provider ?? account;
    if (typeof provider.callContract !== 'function') return null;

    const result = await provider.callContract({
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: 'get_player_game',
      calldata: [account.address],
    });
    const raw = Array.isArray(result) ? result : result?.result ?? [];
    const gameId = Number(BigInt(raw[0] ?? '0'));
    return gameId > 0 ? gameId : null;
  } catch (err: any) {
    console.warn('[contract] readPlayerGameId failed:', err);
    return null;
  }
}
