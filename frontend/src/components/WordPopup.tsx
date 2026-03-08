import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function WordPopup() {
  const showWordPopup = useGameStore((s) => s.showWordPopup);
  const dismissWordPopup = useGameStore((s) => s.dismissWordPopup);

  useEffect(() => {
    if (!showWordPopup) return;
    const timer = setTimeout(dismissWordPopup, 2500);
    return () => clearTimeout(timer);
  }, [showWordPopup, dismissWordPopup]);

  if (!showWordPopup) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className="animate-fade-up rounded-2xl px-8 py-4 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.95) 0%, rgba(245,158,11,0.95) 100%)',
          boxShadow: '0 8px 32px rgba(251,191,36,0.3), 0 0 0 2px rgba(255,255,255,0.15)',
        }}
      >
        {showWordPopup.emoji && (
          <div style={{ fontSize: 32 }} className="mb-1">
            {showWordPopup.emoji}
          </div>
        )}
        <div className="text-sm font-game font-extrabold text-game-bg">
          Word Complete!
        </div>
        <div className="text-lg font-game font-extrabold text-game-bg mt-1">
          {showWordPopup.word}
        </div>
        <div className="text-xs font-game text-game-bg/50 mt-1">
          +50 bonus
        </div>
      </div>
    </div>
  );
}
