import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export function useGameLoop() {
  const phase = useGameStore((s) => s.phase);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const aiState = useGameStore((s) => s.aiState);
  const gameMode = useGameStore((s) => s.gameMode);
  const tickTimer = useGameStore((s) => s.tickTimer);
  const executeAiTurn = useGameStore((s) => s.executeAiTurn);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiExecuting = useRef(false);

  // Timer tick every second — skip in online mode (server drives timer)
  useEffect(() => {
    if (gameMode === 'vs-online') return;

    if (phase !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, tickTimer, gameMode]);

  // AI turn trigger — only in vs-ai mode (never in online)
  useEffect(() => {
    if (gameMode !== 'vs-ai') return;
    if (phase !== 'playing' || currentTurn !== 'ai' || aiState !== 'idle') return;
    if (aiExecuting.current) return;

    aiExecuting.current = true;
    executeAiTurn().finally(() => {
      aiExecuting.current = false;
    });
  }, [phase, currentTurn, aiState, gameMode, executeAiTurn]);
}
