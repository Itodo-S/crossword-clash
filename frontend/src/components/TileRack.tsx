import { useGameStore } from '../store/gameStore';
import { useResponsive } from '../hooks/useResponsive';
import { Tile } from './Tile';

export function TileRack() {
  const humanTiles = useGameStore((s) => s.humanTiles);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const selectTile = useGameStore((s) => s.selectTile);
  const { tileSize } = useResponsive();

  const tiles = humanTiles;
  const isMyTurn = currentTurn === 'human';

  return (
    <div
      className="mx-2 rounded-2xl px-3 py-1.5"
      style={{
        background: 'linear-gradient(180deg, rgba(22,32,50,0.8) 0%, rgba(12,18,32,0.9) 100%)',
        border: '1px solid rgba(71,85,105,0.3)',
      }}
    >
      <div className="flex items-center justify-center gap-2">
        {tiles.map((tile) => (
          <Tile
            key={tile.id}
            tile={tile}
            isSelected={selectedTileId === tile.id}
            onClick={() => {
              if (!isMyTurn) return;
              selectTile(selectedTileId === tile.id ? null : tile.id);
            }}
            disabled={!isMyTurn}
            size={tileSize}
          />
        ))}
        {tiles.length === 0 && (
          <div className="text-xs font-game text-white/25 py-2">
            No tiles
          </div>
        )}
      </div>
    </div>
  );
}
