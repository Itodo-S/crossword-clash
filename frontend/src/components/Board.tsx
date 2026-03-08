import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { useResponsive } from '../hooks/useResponsive';
import { BoardCell } from './BoardCell';
import { BOARD_SIZE } from '../utils/constants';

export function Board() {
  const board = useGameStore((s) => s.board);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const completedWords = useGameStore((s) => s.completedWords);
  const placeTile = useGameStore((s) => s.placeTile);
  const { cellSize, fontSize, gap, compact } = useResponsive();

  // Recently completed word cells for flash animation
  const flashingCells = useMemo(() => {
    const set = new Set<string>();
    const recent = completedWords.slice(-2);
    for (const word of recent) {
      for (const { row, col } of word.cells) {
        set.add(`${row},${col}`);
      }
    }
    return set;
  }, [completedWords]);

  if (!board) return null;

  const handleCellClick = (row: number, col: number) => {
    if (currentTurn !== 'human' || !selectedTileId) return;
    placeTile(row, col);
  };

  const frameP = compact ? 2 : 3;

  return (
    <div className="flex justify-center">
      {/* Board frame */}
      <div
        className="rounded-lg"
        style={{
          padding: frameP,
          background: 'linear-gradient(135deg, #1e3040 0%, #152535 50%, #0a1520 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="rounded-md overflow-hidden"
          style={{
            background: '#080e1a',
            padding: compact ? 1 : 2,
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, ${cellSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {board.cells.flat().map((cell) => {
              const key = `${cell.row},${cell.col}`;
              return (
                <BoardCell
                  key={key}
                  cell={cell}
                  cellSize={cellSize}
                  fontSize={fontSize}
                  onClick={() => handleCellClick(cell.row, cell.col)}
                  isWordFlashing={flashingCells.has(key)}
                  hasSelectedTile={!!selectedTileId}
                  compact={compact}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
