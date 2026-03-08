import { useGameStore } from '../store/gameStore';

export function Timer() {
  const timeLeft = useGameStore((s) => s.turnTimeLeft);
  const isCritical = timeLeft <= 5;
  const isWarning = timeLeft <= 10;

  return (
    <span
      className={`
        font-game text-sm font-bold transition-all
        ${isCritical ? 'text-game-wrong animate-pulse-glow' :
          isWarning ? 'text-game-gold' :
          'text-white/50'}
      `}
    >
      {timeLeft}s
    </span>
  );
}
