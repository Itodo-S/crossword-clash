import { useState } from 'react';
import { useOnlineStore } from '../store/onlineStore';
import { Button } from '../components/Button';
import { disconnectSocket } from '../socket/socketClient';

interface OnlineWaitingScreenProps {
  onBack: () => void;
}

export function OnlineWaitingScreen({ onBack }: OnlineWaitingScreenProps) {
  const roomCode = useOnlineStore((s) => s.roomCode);
  const connectionStatus = useOnlineStore((s) => s.connectionStatus);
  const error = useOnlineStore((s) => s.error);

  const handleQuit = () => {
    disconnectSocket();
    useOnlineStore.getState().reset();
    onBack();
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-game-bg px-6 gap-5">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-game-green'
              : connectionStatus === 'connecting'
              ? 'bg-game-gold animate-pulse'
              : 'bg-game-wrong'
          }`}
        />
        <span className="text-xs font-game text-white/40">
          {connectionStatus === 'connected'
            ? 'Connected'
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Disconnected'}
        </span>
      </div>

      {roomCode && <RoomCodeDisplay code={roomCode} />}

      <div className="flex flex-col items-center gap-2 mt-4">
        <div className="text-sm font-game font-bold text-white">
          Waiting for opponent
          <span className="inline-flex ml-1">
            <span className="animate-[thinking-dots_1.4s_infinite_0s]">.</span>
            <span className="animate-[thinking-dots_1.4s_infinite_0.2s]">.</span>
            <span className="animate-[thinking-dots_1.4s_infinite_0.4s]">.</span>
          </span>
        </div>
        <p className="text-xs font-game text-white/30 mt-1">
          Share the room code with your friend
        </p>
      </div>

      {error && (
        <div className="text-xs font-game text-game-wrong mt-2">{error}</div>
      )}

      <Button size="sm" variant="secondary" onClick={handleQuit} className="mt-4">
        Leave
      </Button>
    </div>
  );
}

function RoomCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-game font-semibold text-white/40">Room Code</div>
      <button
        onClick={handleCopy}
        className="bg-game-surface border-2 border-game-gold/40 rounded-2xl px-7 py-3
                   flex items-center gap-3 hover:border-game-gold/70 transition-colors active:scale-95"
      >
        <div className="text-2xl font-game font-extrabold text-game-gold tracking-[0.3em]">
          {code}
        </div>
        <div className="text-white/40 hover:text-white transition-colors">
          {copied ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-game-green">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </div>
      </button>
      <div className="text-[10px] font-game text-white/25">
        {copied ? 'Copied!' : 'Tap to copy'}
      </div>
    </div>
  );
}
