import { useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { getPlayer } from '../utils/contractReader';

/**
 * Syncs on-chain player state when the wallet is connected.
 *
 * Uses contract view functions directly via RPC — no Torii needed.
 */
export function useOnChainSync() {
  const { account } = useAccount();

  useEffect(() => {
    if (!account?.address) return;

    const addr = account.address;
    let cancelled = false;

    async function sync() {
      try {
        const player = await getPlayer(addr);
        if (cancelled) return;
        console.log('[OnChainSync] Player data:', player);
      } catch (err) {
        console.warn('[OnChainSync] Failed to sync from chain:', err);
      }
    }

    sync();

    return () => {
      cancelled = true;
    };
  }, [account?.address]);
}
