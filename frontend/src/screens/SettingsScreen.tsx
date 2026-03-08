import { useState, useEffect, useCallback } from 'react';
import { useAccount } from '@starknet-react/core';
import { Button } from '../components/Button';
import { soundManager } from '../engine/SoundManager';
import { getPlayer, type PlayerData } from '../utils/contractReader';
import useContract from '../hooks/useContract';
import { toast } from 'react-toastify';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { account } = useAccount();
  const { applyReferral } = useContract();
  const [musicVol, setMusicVol] = useState(soundManager.getMusicVolume());
  const [sfxVol, setSfxVol] = useState(soundManager.getSfxVolume());
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [referralInput, setReferralInput] = useState('');
  const [applying, setApplying] = useState(false);

  const fetchPlayer = useCallback(async () => {
    if (!account?.address) return;
    try {
      const data = await getPlayer(account.address);
      setPlayer(data);
    } catch {
      // player may not be registered yet
    }
  }, [account?.address]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  const handleApplyReferral = async () => {
    const code = referralInput.trim();
    if (!code) return;
    setApplying(true);
    const ok = await applyReferral(code);
    if (ok) {
      toast.success('Referral applied!');
      soundManager.play('word-complete');
      setReferralInput('');
      await fetchPlayer();
    }
    setApplying(false);
  };

  const copyReferralCode = () => {
    if (!player?.referralCode) return;
    navigator.clipboard.writeText(player.referralCode);
    toast.success('Copied!');
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6 gap-5">
      <h2 className="text-xl font-game font-bold text-white mb-1">Settings</h2>

      <div className="w-full max-w-[280px] flex flex-col gap-5">
        {/* Volume controls */}
        <div>
          <div className="flex justify-between mb-3">
            <span className="text-sm font-game font-semibold text-white/70">Music</span>
            <span className="text-sm font-game text-white/40">
              {Math.round(musicVol * 100)}%
            </span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05" value={musicVol}
            onChange={(e) => { const v = parseFloat(e.target.value); setMusicVol(v); soundManager.setMusicVolume(v); }}
          />
        </div>

        <div>
          <div className="flex justify-between mb-3">
            <span className="text-sm font-game font-semibold text-white/70">SFX</span>
            <span className="text-sm font-game text-white/40">
              {Math.round(sfxVol * 100)}%
            </span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05" value={sfxVol}
            onChange={(e) => { const v = parseFloat(e.target.value); setSfxVol(v); soundManager.setSfxVolume(v); }}
          />
        </div>

        {/* Referral section */}
        {account && player && (
          <div className="border-t border-white/8 pt-4 flex flex-col gap-3">
            <span className="text-sm font-game font-semibold text-game-gold">Referrals</span>

            {/* Your referral code */}
            {player.referralCode && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-game text-white/40">Your code:</span>
                <button
                  onClick={copyReferralCode}
                  className="px-3 py-1 rounded-lg bg-game-surface border border-white/10 text-xs
                             font-game font-bold text-white/80 hover:bg-game-surface/80
                             transition-all active:scale-95"
                >
                  {player.referralCode}
                </button>
                <span className="text-[10px] font-game text-white/25">
                  {player.referralCount} referral{player.referralCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Apply referral */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter referral code"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-game-surface border border-white/10
                           text-xs font-game text-white placeholder:text-white/20
                           outline-none focus:border-game-accent/50"
              />
              <button
                onClick={handleApplyReferral}
                disabled={applying || !referralInput.trim()}
                className="px-4 py-2 rounded-xl font-game font-bold text-xs text-white
                           bg-game-accent hover:bg-game-accent/85 transition-all active:scale-95
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? '...' : 'Apply'}
              </button>
            </div>
          </div>
        )}

        {/* Player stats */}
        {account && player && (
          <div className="border-t border-white/8 pt-4 flex flex-col gap-1.5">
            <span className="text-sm font-game font-semibold text-white/70 mb-1">Stats</span>
            <StatRow label="Games Played" value={player.gamesPlayed} />
            <StatRow label="Games Won" value={player.gamesWon} />
            <StatRow label="Highest Score" value={player.highestScore} />
            <StatRow label="Total Score" value={player.totalScore} />
            <StatRow label="Words Completed" value={player.wordsCompleted} />
            <StatRow label="Online Wins" value={player.onlineWins} />
          </div>
        )}
      </div>

      <Button size="sm" variant="secondary" onClick={onBack} className="mt-2">
        Back
      </Button>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs font-game">
      <span className="text-white/40">{label}</span>
      <span className="text-white/60 font-semibold">{value}</span>
    </div>
  );
}
