import type { Difficulty } from '../types/game';
import { Button } from '../components/Button';
import { DIFFICULTY_CONFIGS } from '../utils/constants';
import { soundManager } from '../engine/SoundManager';

interface DifficultyScreenProps {
  onSelect: (difficulty: Difficulty) => void;
  onBack: () => void;
}

const DETAILS: Record<Difficulty, { desc: string; color: string; borderColor: string; bars: number }> = {
  easy: { desc: 'More hints, relaxed pace', color: 'text-game-green', borderColor: '#10b981', bars: 1 },
  normal: { desc: 'Balanced challenge', color: 'text-game-blue', borderColor: '#38bdf8', bars: 2 },
  hard: { desc: 'Fewer hints, intense', color: 'text-game-accent', borderColor: '#06b6d4', bars: 3 },
};

export function DifficultyScreen({ onSelect, onBack }: DifficultyScreenProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6">
      <h2 className="text-xl font-game font-bold text-white mb-8">Difficulty</h2>

      <div className="flex flex-col gap-3 w-full max-w-[300px]">
        {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
          const info = DETAILS[d];
          return (
            <button
              key={d}
              onClick={() => {
                soundManager.play('menu-select');
                onSelect(d);
              }}
              className="bg-game-surface/80 hover:bg-game-surface rounded-2xl p-4 pl-5
                         transition-all active:scale-[0.97] text-left border border-white/5
                         flex items-center gap-4"
              style={{ borderLeft: `3px solid ${info.borderColor}` }}
            >
              <div className="flex-1">
                <div className={`text-base font-game font-bold ${info.color} mb-0.5`}>
                  {DIFFICULTY_CONFIGS[d].label}
                </div>
                <div className="text-xs font-game text-white/40">{info.desc}</div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full"
                    style={{
                      height: 8 + i * 4,
                      background: i <= info.bars ? info.borderColor : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <Button size="sm" variant="secondary" onClick={onBack} className="mt-8">
        Back
      </Button>
    </div>
  );
}
