import { Button } from '../components/Button';
import { soundManager } from '../engine/SoundManager';

interface PauseScreenProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseScreen({ onResume, onRestart, onQuit }: PauseScreenProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg/95 px-6 gap-6">
      <h2 className="text-2xl font-game font-extrabold text-white mb-2">Paused</h2>

      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        <Button size="lg" onClick={() => { soundManager.play('menu-select'); onResume(); }}>
          Resume
        </Button>
        <Button size="md" variant="secondary" onClick={() => { soundManager.play('menu-select'); onRestart(); }}>
          Restart
        </Button>
        <Button size="md" variant="danger" onClick={() => { soundManager.play('menu-select'); onQuit(); }}>
          Quit
        </Button>
      </div>
    </div>
  );
}
