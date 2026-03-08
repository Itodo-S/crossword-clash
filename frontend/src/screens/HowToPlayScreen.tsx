import { Button } from '../components/Button';

interface HowToPlayScreenProps {
  onBack: () => void;
}

const RULES = [
  { title: 'Place Tiles', desc: 'Tap a tile from your rack, then tap an empty cell on the board to place it.' },
  { title: 'Match Letters', desc: 'Each cell has a hidden solution. Correct placements stick (+10 pts), wrong ones bounce back (-5 pts).' },
  { title: 'Complete Words', desc: 'Fill all cells of a word for a +50 bonus. Long words (7+ letters) get x1.5!' },
  { title: 'Take Turns', desc: 'Place as many tiles as you can, then end your turn. Your opponent goes next.' },
  { title: 'Swap or Skip', desc: "Don't like your tiles? Swap them (skip your turn) or just skip." },
  { title: 'Win the Game', desc: 'Game ends when the board is full, tiles run out, or too many skips. Highest score wins!' },
];

export function HowToPlayScreen({ onBack }: HowToPlayScreenProps) {
  return (
    <div className="w-full h-full flex flex-col items-center bg-game-bg overflow-auto py-8 px-6">
      <h2 className="text-xl font-game font-bold text-white mb-6">How to Play</h2>

      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        {RULES.map((rule, i) => (
          <div
            key={i}
            className="bg-game-surface/60 rounded-2xl p-4 border border-white/5"
            style={{ borderLeft: '3px solid rgba(6,182,212,0.4)' }}
          >
            <div className="text-sm font-game font-bold text-game-accent mb-1">
              {i + 1}. {rule.title}
            </div>
            <div className="text-xs font-game text-white/50 leading-relaxed">
              {rule.desc}
            </div>
          </div>
        ))}
      </div>

      <Button size="sm" variant="secondary" onClick={onBack} className="mt-6">
        Back
      </Button>
    </div>
  );
}
