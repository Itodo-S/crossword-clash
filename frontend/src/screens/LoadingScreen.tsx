import { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise((r) => setTimeout(r, 1500));
    const fontReady = document.fonts.ready;

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 150);

    Promise.all([minDelay, fontReady]).then(() => {
      if (cancelled) return;
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => onCompleteRef.current(), 300);
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg">
      {/* Crossword tile decoration */}
      <div className="flex gap-1 mb-6">
        {'CLASH'.split('').map((letter, i) => (
          <div
            key={i}
            className="w-9 h-9 rounded-lg flex items-center justify-center font-game font-extrabold text-base text-white"
            style={{
              background: 'linear-gradient(180deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
              animationDelay: `${i * 0.1}s`,
            }}
          >
            {letter}
          </div>
        ))}
      </div>

      <h1 className="text-3xl font-game font-extrabold text-white tracking-tight mb-1">
        Crossword
      </h1>
      <p className="text-sm font-game font-semibold text-game-accent/70 tracking-widest uppercase mb-10">
        Multiplayer
      </p>

      {/* Progress ring */}
      <div className="relative w-16 h-16 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r="28" fill="none"
            stroke="url(#progressGrad)" strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 1.76} 176`}
            className="transition-all duration-200"
          />
          <defs>
            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-game font-bold text-white/50">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
