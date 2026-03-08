import type { Tile as TileType } from '../types/game';

interface TileProps {
  tile: TileType;
  isSelected: boolean;
  onClick: () => void;
  size?: number;
  disabled?: boolean;
}

export function Tile({ tile, isSelected, onClick, size = 40, disabled = false }: TileProps) {
  const letterSize = Math.max(13, Math.floor(size * 0.45));

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center rounded-xl font-game
        transition-all duration-150 cursor-pointer select-none
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'}
      `}
      style={{
        width: size,
        height: size,
        background: isSelected
          ? 'linear-gradient(180deg, #22d3ee 0%, #06b6d4 60%, #0891b2 100%)'
          : 'linear-gradient(180deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%)',
        border: isSelected
          ? '2px solid rgba(255,255,255,0.6)'
          : '2px solid rgba(255,255,255,0.15)',
        boxShadow: isSelected
          ? '0 4px 16px rgba(6,182,212,0.5), 0 0 0 2px rgba(34,211,238,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
        transform: isSelected
          ? 'translateY(-4px) scale(1.08)'
          : undefined,
      }}
    >
      {/* Letter */}
      <span
        className="font-extrabold relative z-10"
        style={{
          color: 'white',
          fontSize: letterSize,
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        {tile.letter}
      </span>

      {/* Shine overlay */}
      <div
        className="absolute inset-0 rounded-md pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
        }}
      />
    </button>
  );
}
