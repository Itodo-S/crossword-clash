import type { GameMode } from '../types/game';
import { Button } from '../components/Button';
import { soundManager } from '../engine/SoundManager';

interface GameModeScreenProps {
  onSelect: (mode: GameMode) => void;
  onBack: () => void;
}

const MODES: { mode: GameMode; label: string; desc: string; color: string; borderColor: string }[] = [
  { mode: 'vs-ai', label: 'VS Computer', desc: 'Challenge the AI opponent', color: 'text-game-blue', borderColor: '#38bdf8' },
  { mode: 'vs-online', label: 'Online', desc: 'Play against a friend online', color: 'text-game-green', borderColor: '#10b981' },
];

export function GameModeScreen({ onSelect, onBack }: GameModeScreenProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6">
      <h2 className="text-xl font-game font-bold text-white mb-8">Select Mode</h2>

      <div className="flex flex-col gap-3 w-full max-w-[300px]">
        {MODES.map(({ mode, label, desc, color, borderColor }) => (
          <button
            key={mode}
            onClick={() => {
              soundManager.play('menu-select');
              onSelect(mode);
            }}
            className="bg-game-surface/80 hover:bg-game-surface rounded-2xl p-4 pl-5
                       transition-all active:scale-[0.97] text-left border border-white/5
                       flex items-center gap-4"
            style={{ borderLeft: `3px solid ${borderColor}` }}
          >
            <div className="flex-1">
              <div className={`text-base font-game font-bold ${color} mb-0.5`}>{label}</div>
              <div className="text-xs font-game text-white/40">{desc}</div>
            </div>
            <div className="text-white/20 text-lg">&rsaquo;</div>
          </button>
        ))}
      </div>

      <Button size="sm" variant="secondary" onClick={onBack} className="mt-8">
        Back
      </Button>
    </div>
  );
}
