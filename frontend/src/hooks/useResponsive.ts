import { useState, useEffect } from 'react';
import { BOARD_SIZE } from '../utils/constants';

export type ResponsiveConfig = {
  cellSize: number;
  boardPx: number;
  fontSize: number;
  tileSize: number;
  gap: number;
  compact: boolean; // true on very small screens
};

export function useResponsive(): ResponsiveConfig {
  const [config, setConfig] = useState<ResponsiveConfig>(calculate());

  useEffect(() => {
    function handleResize() {
      setConfig(calculate());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return config;
}

function calculate(): ResponsiveConfig {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Fixed vertical budget for all UI chrome (no scrolling allowed):
  //   Header row (pause + timer + pool):    28px
  //   Score row:                             32px
  //   Turn indicator:                        20px
  //   Tile rack:                             52px
  //   Action bar + bottom pad:               36px
  //   Board frame padding:                   10px
  //   General padding/gaps:                  12px
  // Total chrome:                           190px
  const chromeHeight = 190;

  const availableHeight = vh - chromeHeight;
  const availableWidth = vw - 16; // 8px padding each side

  // Board = 15 cells + 14 gaps. Solve for cellSize.
  // boardPx = cellSize * 15 + gap * 14
  // We pick gap first (1px on small, 2px on big), then solve for cellSize.
  const gapGuess = availableWidth < 400 ? 1 : 2;
  const gapTotal = gapGuess * (BOARD_SIZE - 1);

  const maxFromHeight = Math.floor((availableHeight - gapTotal) / BOARD_SIZE);
  const maxFromWidth = Math.floor((availableWidth - gapTotal) / BOARD_SIZE);
  let cellSize = Math.min(maxFromHeight, maxFromWidth);

  // Hard clamp — never bigger than 38, never smaller than 18
  cellSize = Math.max(18, Math.min(38, cellSize));

  const gap = cellSize <= 22 ? 1 : 2;
  const boardPx = cellSize * BOARD_SIZE + gap * (BOARD_SIZE - 1);

  const fontSize = Math.max(7, Math.floor(cellSize * 0.38));
  const compact = cellSize <= 24;

  // Tile size scales with cell size so rack doesn't overflow
  const tileSize = Math.max(32, Math.min(46, Math.floor(cellSize * 1.4)));

  return { cellSize, boardPx, fontSize, tileSize, gap, compact };
}
