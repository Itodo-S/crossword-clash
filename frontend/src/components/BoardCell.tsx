import type { CellState } from '../types/game';

interface BoardCellProps {
  cell: CellState;
  cellSize: number;
  fontSize: number;
  onClick: () => void;
  isWordFlashing: boolean;
  hasSelectedTile: boolean;
  compact: boolean;
}

export function BoardCell({
  cell,
  cellSize,
  fontSize,
  onClick,
  isWordFlashing,
  hasSelectedTile,
  compact,
}: BoardCellProps) {
  const numberSize = Math.max(5, Math.floor(cellSize * 0.2));

  // Black cell
  if (cell.solution === null) {
    return (
      <div
        className="rounded-[2px]"
        style={{
          width: cellSize,
          height: cellSize,
          background: 'linear-gradient(135deg, #060b14 0%, #040812 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
        }}
      />
    );
  }

  const isEmpty = !cell.isLocked && cell.current === null;
  const isInteraction = isEmpty && hasSelectedTile;

  // Visual state
  let bgStyle: React.CSSProperties;
  let textColor: string;
  let borderColor: string;
  let extraClasses = '';

  if (cell.isPreFilled) {
    bgStyle = { background: 'linear-gradient(180deg, #1e2d40 0%, #162536 100%)' };
    textColor = 'rgba(148, 163, 184, 0.9)';
    borderColor = 'rgba(71, 85, 105, 0.4)';
  } else if (cell.isLocked && cell.placedBy === 'human') {
    bgStyle = { background: 'linear-gradient(180deg, #0c3a4a 0%, #0a2e3d 100%)' };
    textColor = '#22d3ee';
    borderColor = 'rgba(6, 182, 212, 0.4)';
    extraClasses = 'animate-place-correct';
  } else if (cell.isLocked && cell.placedBy === 'ai') {
    bgStyle = { background: 'linear-gradient(180deg, #4a3520 0%, #3d2a18 100%)' };
    textColor = '#fbbf24';
    borderColor = 'rgba(245, 158, 11, 0.4)';
    extraClasses = 'animate-place-correct';
  } else {
    bgStyle = { background: 'linear-gradient(180deg, #131e2d 0%, #0e1824 100%)' };
    textColor = 'rgba(255,255,255,0.15)';
    borderColor = isInteraction
      ? 'rgba(167, 139, 250, 0.3)'
      : 'rgba(51, 65, 85, 0.3)';
  }

  if (isWordFlashing) {
    extraClasses = 'animate-word-flash';
  }

  // Word-start info
  const wordStart = cell.wordStarts.length > 0 ? cell.wordStarts[0] : null;
  // Gather distinct emojis for this cell
  const emojis = cell.wordStarts
    .map((ws) => ws.emoji)
    .filter((e) => e.length > 0);
  const hasEmoji = emojis.length > 0;

  // Emoji size — centered and prominent as the on-board clue
  const emojiSize = compact
    ? Math.max(10, Math.floor(cellSize * 0.55))
    : Math.max(12, Math.floor(cellSize * 0.55));

  return (
    <button
      onClick={onClick}
      disabled={!isEmpty}
      className={`
        relative flex items-center justify-center rounded-[2px]
        transition-all duration-150
        ${extraClasses}
        ${isEmpty ? 'cursor-pointer' : 'cursor-default'}
        ${isInteraction ? 'hover:brightness-130' : ''}
      `}
      style={{
        width: cellSize,
        height: cellSize,
        fontSize,
        ...bgStyle,
        border: `1px solid ${borderColor}`,
        boxShadow: cell.isLocked
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.3)'
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Crossword number — top-left corner */}
      {wordStart && (
        <span
          className="absolute leading-none font-bold pointer-events-none"
          style={{
            top: 1,
            left: compact ? 1 : 2,
            fontSize: numberSize,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'monospace',
          }}
        >
          {wordStart.number}
        </span>
      )}

      {/* Emoji clue — centered in empty word-start cells as the on-board hint */}
      {isEmpty && hasEmoji && (
        <span
          className="pointer-events-none select-none"
          style={{
            fontSize: emojiSize,
            lineHeight: 1,
            opacity: 0.8,
          }}
        >
          {emojis[0]}
        </span>
      )}

      {/* Letter */}
      {cell.current && (
        <span
          className="font-game font-extrabold relative z-10"
          style={{
            color: textColor,
            textShadow: cell.isLocked ? `0 0 6px ${textColor}40` : 'none',
            fontSize: Math.max(9, Math.floor(cellSize * 0.48)),
          }}
        >
          {cell.current}
        </span>
      )}
    </button>
  );
}
