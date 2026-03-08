import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { soundManager } from '../engine/SoundManager';
import { useOnlineStore } from '../store/onlineStore';
import { emitJoinRoom } from '../socket/useOnlineGame';
import { useAccount } from '@starknet-react/core';

interface OnlineLobbyScreenProps {
  onCreateChooseDifficulty: () => void;
  onRoomJoined: () => void;
  onBack: () => void;
}

export function OnlineLobbyScreen({ onCreateChooseDifficulty, onRoomJoined, onBack }: OnlineLobbyScreenProps) {
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');
  const error = useOnlineStore((s) => s.error);
  const setError = useOnlineStore((s) => s.setError);
  const { connector } = useAccount();

  // Pull username from Cartridge controller on mount
  useEffect(() => {
    (async () => {
      let username = 'Player';
      try {
        const ctrl = connector as any;
        if (typeof ctrl?.username === 'function') {
          const result = ctrl.username();
          if (result && typeof result.then === 'function') {
            username = await result;
          } else if (typeof result === 'string') {
            username = result;
          }
        }
      } catch {
        // fallback
      }
      useOnlineStore.getState().setPlayerName(username);
    })();
  }, [connector]);

  const handleCreate = () => {
    setError(null);
    soundManager.init();
    soundManager.play('menu-select');
    useOnlineStore.getState().setIsHost(true);
    onCreateChooseDifficulty();
  };

  const handleJoin = () => {
    if (!code.trim() || code.trim().length < 4) { setError('Enter a valid 4-character room code'); return; }
    setError(null);
    soundManager.init();
    soundManager.play('menu-select');
    useOnlineStore.getState().setIsHost(false);
    const playerName = useOnlineStore.getState().playerName || 'Player';
    emitJoinRoom(code.trim().toUpperCase(), playerName);
    onRoomJoined();
  };

  if (mode === 'choose') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6 gap-6">
        <h2 className="text-xl font-game font-bold text-white mb-4">Online Play</h2>

        <div className="flex flex-col gap-3 w-full max-w-[300px]">
          <button
            onClick={() => { soundManager.play('menu-select'); handleCreate(); }}
            className="bg-game-surface/80 hover:bg-game-surface rounded-2xl p-4 pl-5
                       transition-all active:scale-[0.97] text-left border border-white/5
                       flex items-center gap-4"
            style={{ borderLeft: '3px solid #10b981' }}
          >
            <div className="flex-1">
              <div className="text-base font-game font-bold text-game-green mb-0.5">Create Room</div>
              <div className="text-xs font-game text-white/40">Host a game and share the code</div>
            </div>
            <div className="text-white/20 text-lg">&rsaquo;</div>
          </button>

          <button
            onClick={() => { soundManager.play('menu-select'); setMode('join'); }}
            className="bg-game-surface/80 hover:bg-game-surface rounded-2xl p-4 pl-5
                       transition-all active:scale-[0.97] text-left border border-white/5
                       flex items-center gap-4"
            style={{ borderLeft: '3px solid #38bdf8' }}
          >
            <div className="flex-1">
              <div className="text-base font-game font-bold text-game-blue mb-0.5">Join Room</div>
              <div className="text-xs font-game text-white/40">Enter a room code to join</div>
            </div>
            <div className="text-white/20 text-lg">&rsaquo;</div>
          </button>
        </div>

        <Button size="sm" variant="secondary" onClick={onBack} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6 gap-5">
      <h2 className="text-xl font-game font-bold text-white mb-2">Join Room</h2>

      <div className="flex flex-col gap-4 w-full max-w-[280px]">
        <div>
          <label className="text-xs font-game font-semibold text-white/50 block mb-1.5">Room Code</label>
          <input
            type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4} placeholder="XXXX"
            className="w-full bg-game-surface border border-white/10 rounded-xl px-4 py-2.5
                       text-sm font-game text-white placeholder-white/25 uppercase tracking-[0.3em] text-center
                       focus:outline-none focus:border-game-accent/50 transition-colors"
            autoFocus
          />
        </div>

        {error && (
          <div className="text-xs font-game text-game-wrong text-center">{error}</div>
        )}

        <Button size="md" onClick={handleJoin} className="mt-1">
          Join
        </Button>
      </div>

      <Button
        size="sm" variant="secondary"
        onClick={() => { setMode('choose'); setError(null); }}
        className="mt-2"
      >
        Back
      </Button>
    </div>
  );
}
