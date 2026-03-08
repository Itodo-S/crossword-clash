import { useGameStore } from '../store/gameStore';

export function TurnIndicator() {
  const currentTurn = useGameStore((s) => s.currentTurn);
  const aiState = useGameStore((s) => s.aiState);
  const gameMode = useGameStore((s) => s.gameMode);

  if (currentTurn === 'human') {
    return (
      <span className="text-xs font-game font-bold text-game-tile-human animate-pop-in">
        Your Turn
      </span>
    );
  }

  if (gameMode === 'vs-online') {
    return (
      <span className="text-xs font-game font-bold text-game-tile-ai animate-pop-in">
        Opponent's Turn
      </span>
    );
  }

  return (
    <span className="text-xs font-game font-bold text-game-tile-ai">
      {aiState === 'thinking' ? (
        <>
          AI Thinking
          <span className="inline-flex ml-0.5">
            <span className="animate-[thinking-dots_1.4s_infinite_0s]">.</span>
            <span className="animate-[thinking-dots_1.4s_infinite_0.2s]">.</span>
            <span className="animate-[thinking-dots_1.4s_infinite_0.4s]">.</span>
          </span>
        </>
      ) : aiState === 'placing' ? (
        'AI Placing'
      ) : (
        "AI's Turn"
      )}
    </span>
  );
}
