import { useGameStore } from '../store/gameStore';
import { Button } from '../components/Button';
import { soundManager } from '../engine/SoundManager';
import { useEffect } from 'react';

interface GameOverScreenProps {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOverScreen({ onPlayAgain, onMainMenu }: GameOverScreenProps) {
  const humanScore = useGameStore((s) => s.humanScore);
  const aiScore = useGameStore((s) => s.aiScore);
  const gameMode = useGameStore((s) => s.gameMode);
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const board = useGameStore((s) => s.board);
  const completedWords = useGameStore((s) => s.completedWords);

  const p1Won = humanScore > aiScore;
  const isDraw = humanScore === aiScore;

  const p1Label = 'YOU';
  const p2Label = gameMode === 'vs-online' ? 'OPP' : 'AI';

  const winText = p1Won ? 'You Win!' : isDraw ? 'Draw!' : gameMode === 'vs-online' ? 'Opponent Wins!' : 'AI Wins!';

  useEffect(() => {
    if (p1Won) soundManager.play('victory');
    else if (!isDraw) soundManager.play('defeat');
    else soundManager.play('game-over');
  }, [p1Won, isDraw]);

  const reasonText: Record<string, string> = {
    'board-full': 'Board Complete!',
    'pool-empty': 'No Tiles Left!',
    'consecutive-skips': 'Too Many Skips!',
    'opponent-left': 'Opponent Left!',
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6 gap-5">
      <h1 className={`text-2xl font-game font-extrabold ${
        p1Won ? 'text-game-gold' : isDraw ? 'text-white' : 'text-game-wrong'
      }`}>
        {winText}
      </h1>

      <p className="text-xs font-game text-white/40">
        {gameOverReason ? reasonText[gameOverReason] : ''}
      </p>

      <div className="bg-game-surface/80 rounded-2xl p-5 w-full max-w-[280px] border border-white/5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-game font-bold text-game-tile-human">{p1Label}</span>
          <span className="text-xl font-game font-extrabold text-white">{humanScore}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-game font-bold text-game-tile-ai">{p2Label}</span>
          <span className="text-xl font-game font-extrabold text-white">{aiScore}</span>
        </div>
        <div className="border-t border-white/8 pt-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-game text-white/40">
            <span>Words completed</span>
            <span className="text-white/60 font-semibold">{completedWords.length}</span>
          </div>
          <div className="flex justify-between text-xs font-game text-white/40">
            <span>Board filled</span>
            <span className="text-white/60 font-semibold">{board?.getCompletionPercentage() ?? 0}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[240px] mt-2">
        <Button size="md" onClick={() => { soundManager.play('menu-select'); onPlayAgain(); }}>
          Play Again
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { soundManager.play('menu-select'); onMainMenu(); }}>
          Main Menu
        </Button>
      </div>
    </div>
  );
}
