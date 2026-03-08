import { useGameStore } from '../store/gameStore';
import { Button } from './Button';

export function ActionBar() {
  const currentTurn = useGameStore((s) => s.currentTurn);
  const turnPlacementCount = useGameStore((s) => s.turnPlacementCount);
  const tilePool = useGameStore((s) => s.tilePool);
  const gameMode = useGameStore((s) => s.gameMode);
  const endTurn = useGameStore((s) => s.endTurn);
  const swapTiles = useGameStore((s) => s.swapTiles);
  const skipTurn = useGameStore((s) => s.skipTurn);

  const isActive = currentTurn === 'human';
  const canSwap = isActive && (gameMode === 'vs-online' || (tilePool !== null && !tilePool.isEmpty));
  const hasPlaced = turnPlacementCount > 0;

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      {hasPlaced ? (
        <Button size="sm" variant="primary" onClick={endTurn} disabled={!isActive}>
          END TURN
        </Button>
      ) : (
        <>
          <Button size="sm" variant="secondary" onClick={swapTiles} disabled={!canSwap}>
            SWAP
          </Button>
          <Button size="sm" variant="secondary" onClick={skipTurn} disabled={!isActive}>
            SKIP
          </Button>
        </>
      )}
    </div>
  );
}
