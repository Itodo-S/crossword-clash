import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { Board } from '../components/Board';
import { TileRack } from '../components/TileRack';
import { ScoreBoard } from '../components/ScoreBoard';
import { Timer } from '../components/Timer';
import { TurnIndicator } from '../components/TurnIndicator';
import { ActionBar } from '../components/ActionBar';
import { WordPopup } from '../components/WordPopup';
import { ParticleOverlay } from '../components/ParticleOverlay';
import { soundManager } from '../engine/SoundManager';

interface GameplayScreenProps {
  onPause: () => void;
  onGameOver: () => void;
}

export function GameplayScreen({ onPause, onGameOver }: GameplayScreenProps) {
  const phase = useGameStore((s) => s.phase);
  const board = useGameStore((s) => s.board);
  const tilePool = useGameStore((s) => s.tilePool);
  const gameMode = useGameStore((s) => s.gameMode);
  const poolRemainingStore = useGameStore((s) => s.poolRemaining);

  useGameLoop();

  useEffect(() => {
    soundManager.playMusic();
    return () => { soundManager.stopMusic(); };
  }, []);

  useEffect(() => {
    if (phase === 'game-over') onGameOver();
  }, [phase, onGameOver]);

  if (!board) return null;

  return (
    <div className="w-full h-full flex flex-col bg-game-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-8 shrink-0">
        <button
          onClick={onPause}
          className="text-sm font-game font-bold text-white/40 hover:text-white transition-colors w-8"
        >
          II
        </button>
        <div className="flex items-center gap-3">
          <TurnIndicator />
          <Timer />
        </div>
        <div className="text-[11px] font-game font-semibold text-white/25 w-8 text-right">
          {tilePool ? tilePool.remaining : poolRemainingStore}
        </div>
      </div>

      <div className="shrink-0">
        <ScoreBoard />
      </div>

      <div className="flex-1 flex items-center justify-center shrink-0">
        <Board />
      </div>

      <div className="shrink-0 px-1">
        <TileRack />
      </div>

      <div className="shrink-0 pb-1">
        <ActionBar />
      </div>

      <WordPopup />
      <ParticleOverlay />
    </div>
  );
}
