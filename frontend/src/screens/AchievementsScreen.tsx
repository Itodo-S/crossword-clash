import { useState, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { Button } from '../components/Button';
import { getAllAchievements, type AchievementData } from '../utils/contractReader';

interface AchievementsScreenProps {
  onBack: () => void;
}

const ACHIEVEMENT_META: Record<number, { icon: string; desc: string }> = {
  1:  { icon: '1', desc: 'Complete your first game' },
  2:  { icon: '2', desc: 'Complete 5+ words in a single game' },
  3:  { icon: '3', desc: 'Play 10 games' },
  4:  { icon: '4', desc: 'Win with opponent scoring 0' },
  5:  { icon: '5', desc: 'Win by 50+ points' },
  6:  { icon: '6', desc: 'Complete 10+ words in a single game' },
  7:  { icon: '7', desc: 'Score 500+ points in a single game' },
  8:  { icon: '8', desc: 'Apply a referral code' },
  9:  { icon: '9', desc: 'Refer 5 players' },
  10: { icon: '10', desc: 'Reach a 7-day daily streak' },
  11: { icon: '11', desc: 'Win 5 online games' },
  12: { icon: '12', desc: 'Win a hard difficulty game' },
};

export function AchievementsScreen({ onBack }: AchievementsScreenProps) {
  const { account } = useAccount();
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account?.address) {
      setLoading(false);
      return;
    }
    (async () => {
      const data = await getAllAchievements(account.address);
      setAchievements(data);
      setLoading(false);
    })();
  }, [account?.address]);

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;

  return (
    <div className="w-full h-full flex flex-col items-center bg-game-bg px-4 py-8 overflow-y-auto">
      <h2 className="text-xl font-game font-bold text-white mb-1">Achievements</h2>
      <p className="text-xs font-game text-white/40 mb-5">
        {loading ? 'Loading...' : `${unlocked} / ${total} unlocked`}
      </p>

      {!account && !loading && (
        <p className="text-xs font-game text-white/30 mb-4">Connect wallet to view achievements</p>
      )}

      <div className="w-full max-w-[340px] flex flex-col gap-2.5 mb-6">
        {achievements.map((ach) => {
          const meta = ACHIEVEMENT_META[ach.id];
          return (
            <div
              key={ach.id}
              className={`rounded-2xl p-3.5 pl-4 border transition-all flex items-center gap-3.5 ${
                ach.unlocked
                  ? 'bg-game-surface/90 border-game-gold/30'
                  : 'bg-game-surface/40 border-white/5 opacity-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-game font-extrabold shrink-0 ${
                  ach.unlocked
                    ? 'bg-game-gold/20 text-game-gold'
                    : 'bg-white/5 text-white/20'
                }`}
              >
                {meta?.icon ?? ach.id}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-game font-bold leading-tight ${
                    ach.unlocked ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {ach.label}
                </div>
                <div className="text-[11px] font-game text-white/30 mt-0.5 leading-snug">
                  {meta?.desc ?? ''}
                </div>
              </div>
              {ach.unlocked && (
                <div className="text-game-gold text-lg shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button size="sm" variant="secondary" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
