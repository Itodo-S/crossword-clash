import { useState, useEffect, useCallback } from 'react';
import { useAccount } from '@starknet-react/core';
import { soundManager } from '../engine/SoundManager';
import { getDailyStreak, type DailyStreakData } from '../utils/contractReader';
import useContract from '../hooks/useContract';

interface MainMenuScreenProps {
  onPlay: () => void;
  onHowToPlay: () => void;
  onSettings: () => void;
  onAchievements: () => void;
}

export function MainMenuScreen({ onPlay, onHowToPlay, onSettings, onAchievements }: MainMenuScreenProps) {
  const { account } = useAccount();
  const { claimDailyReward } = useContract();
  const [streak, setStreak] = useState<DailyStreakData | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleClick = (action: () => void) => {
    soundManager.play('menu-select');
    action();
  };

  // Fetch daily streak on mount / when account changes
  const fetchStreak = useCallback(async () => {
    if (!account?.address) return;
    const data = await getDailyStreak(account.address);
    setStreak(data);
    setCountdown(data.secondsUntilClaim);
  }, [account?.address]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          setStreak((s) => s ? { ...s, canClaim: true, secondsUntilClaim: 0 } : s);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleClaim = async () => {
    setClaiming(true);
    const ok = await claimDailyReward();
    if (ok) {
      soundManager.play('word-complete');
      await fetchStreak();
    }
    setClaiming(false);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6">
      {/* Title area */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-game font-extrabold text-white tracking-tight leading-tight">
          Crossword
        </h1>
        <h2 className="text-xl font-game font-bold text-game-accent mt-1">
          Clash
        </h2>
        <p className="text-xs font-game text-white/30 mt-3">
          Tile-placement word game
        </p>
      </div>

      {/* Daily Reward */}
      {account && streak && (
        <div className="w-full max-w-[280px] mb-5 bg-game-surface/60 border border-white/8 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-game font-semibold text-game-gold">
              Daily Reward
            </span>
            <span className="text-[10px] font-game text-white/40">
              Streak: {streak.streakCount}
            </span>
          </div>
          {streak.canClaim ? (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-2 rounded-xl font-game font-bold text-xs text-white tracking-wide
                         bg-game-gold/90 hover:bg-game-gold shadow-md shadow-game-gold/20
                         transition-all active:scale-95 disabled:opacity-50"
            >
              {claiming ? 'Claiming...' : 'Claim Reward'}
            </button>
          ) : (
            <div className="text-center text-[11px] font-game text-white/30 py-1.5">
              Next reward in {formatTime(countdown)}
            </div>
          )}
        </div>
      )}

      {/* Menu buttons */}
      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        <button
          onClick={() => handleClick(onPlay)}
          className="w-full py-4 rounded-2xl font-game font-bold text-base text-white tracking-wide
                     bg-game-accent hover:bg-game-accent/85 shadow-lg shadow-game-accent/20
                     transition-all active:scale-95"
        >
          PLAY
        </button>

        <button
          onClick={() => handleClick(onAchievements)}
          className="w-full py-3 rounded-2xl font-game font-semibold text-sm text-game-gold/80
                     bg-game-surface border border-game-gold/15 hover:bg-game-surface/80
                     transition-all active:scale-95"
        >
          Achievements
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => handleClick(onHowToPlay)}
            className="flex-1 py-3 rounded-2xl font-game font-semibold text-sm text-white/70
                       bg-game-surface border border-white/8 hover:bg-game-surface/80
                       transition-all active:scale-95"
          >
            How to Play
          </button>
          <button
            onClick={() => handleClick(onSettings)}
            className="flex-1 py-3 rounded-2xl font-game font-semibold text-sm text-white/70
                       bg-game-surface border border-white/8 hover:bg-game-surface/80
                       transition-all active:scale-95"
          >
            Settings
          </button>
        </div>
      </div>

      <div className="text-[10px] font-game text-white/15 mt-10">
        Built on Starknet
      </div>
    </div>
  );
}
