import { useGameStore } from '../store/gameStore';
import { useOnlineStore } from '../store/onlineStore';

export function ScoreBoard() {
  const humanScore = useGameStore((s) => s.humanScore);
  const aiScore = useGameStore((s) => s.aiScore);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const gameMode = useGameStore((s) => s.gameMode);
  const board = useGameStore((s) => s.board);
  const completion = board?.getCompletionPercentage() ?? 0;
  const playerName = useOnlineStore((s) => s.playerName);
  const hostName = useOnlineStore((s) => s.hostName);
  const guestName = useOnlineStore((s) => s.guestName);
  const isHost = useOnlineStore((s) => s.isHost);

  let p1Label = 'P1';
  let p2Label = gameMode === 'vs-ai' ? 'AI' : 'P2';

  if (gameMode === 'vs-online') {
    p1Label = playerName || 'YOU';
    p2Label = isHost ? (guestName || 'OPP') : (hostName || 'OPP');
  }

  return (
    <div className="flex items-center justify-between px-3 h-9 gap-2">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all flex-1"
        style={{
          background: currentTurn === 'human'
            ? 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.04) 100%)'
            : 'rgba(22,32,50,0.4)',
          border: currentTurn === 'human'
            ? '1px solid rgba(6,182,212,0.3)'
            : '1px solid rgba(51,65,85,0.2)',
        }}
      >
        <span className="text-[11px] font-game font-bold text-game-tile-human truncate">{p1Label}</span>
        <span className="text-sm font-game font-extrabold text-white ml-auto">{humanScore}</span>
      </div>

      <div className="flex flex-col items-center gap-0.5 px-1">
        <div className="text-[10px] font-game font-semibold text-white/25">{completion}%</div>
        <div className="w-10 h-1 bg-game-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completion}%`,
              background: 'linear-gradient(90deg, #06b6d4, #10b981, #fbbf24)',
            }}
          />
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all flex-1"
        style={{
          background: currentTurn === 'ai'
            ? 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.04) 100%)'
            : 'rgba(22,32,50,0.4)',
          border: currentTurn === 'ai'
            ? '1px solid rgba(245,158,11,0.3)'
            : '1px solid rgba(51,65,85,0.2)',
        }}
      >
        <span className="text-[11px] font-game font-bold text-game-tile-ai truncate">{p2Label}</span>
        <span className="text-sm font-game font-extrabold text-white ml-auto">{aiScore}</span>
      </div>
    </div>
  );
}
