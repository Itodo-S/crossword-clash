import { useState, useCallback, useEffect, useRef } from 'react';
import type { Screen, Difficulty, GameMode } from './types/game';
import { useGameStore } from './store/gameStore';
import { useOnlineStore } from './store/onlineStore';
import { useOnlineGame, emitCreateRoom } from './socket/useOnlineGame';
import { connectSocket, disconnectSocket } from './socket/socketClient';
import { useOnChainSync } from './hooks/useOnChainSync';
import useContract from './hooks/useContract';
import { useAccount, useConnect } from '@starknet-react/core';
import { isPlayerRegistered } from './utils/contractReader';
import { toast } from 'react-toastify';
import { LoadingScreen } from './screens/LoadingScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { GameModeScreen } from './screens/GameModeScreen';
import { DifficultyScreen } from './screens/DifficultyScreen';
import { GameplayScreen } from './screens/GameplayScreen';
import { PauseScreen } from './screens/PauseScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { HowToPlayScreen } from './screens/HowToPlayScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnlineLobbyScreen } from './screens/OnlineLobbyScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { OnlineWaitingScreen } from './screens/OnlineWaitingScreen';
import type { AccountInterface } from 'starknet';

interface Wallet {
  IsConnected: boolean;
  Account: AccountInterface | undefined;
}

declare global {
  interface Window {
    Wallet: Wallet;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [fadeOut, setFadeOut] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const startGame = useGameStore((s) => s.startGame);
  const togglePause = useGameStore((s) => s.togglePause);
  const resetGame = useGameStore((s) => s.resetGame);
  const gameMode = useGameStore((s) => s.gameMode);
  const phase = useGameStore((s) => s.phase);
  const board = useGameStore((s) => s.board);

  const { account, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { registerPlayer, forfeitGame: contractForfeit } = useContract();
  const registrationAttempted = useRef(false);

  // Initialize online socket listeners (hook is a no-op when not in vs-online mode)
  useOnlineGame();

  // Sync on-chain state when wallet connects
  useOnChainSync();

  const pendingPlay = useRef(false);

  // Set global window.Wallet when account connects
  useEffect(() => {
    if (!account) {
      registrationAttempted.current = false;
      return;
    }
    if (window.Wallet?.Account) return;
    window.Wallet = {
      Account: account,
      IsConnected: true,
    };
    // If user pressed PLAY while disconnected, continue to game-mode now
    if (pendingPlay.current) {
      pendingPlay.current = false;
      transition('game-mode');
    }
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-register player on wallet connect
  useEffect(() => {
    if (!account || !connector || !window.Wallet?.Account) return;
    if (registrationAttempted.current) return;
    registrationAttempted.current = true;

    (async () => {
      const alreadyRegistered = await isPlayerRegistered(account.address);

      if (!alreadyRegistered) {
        let username = 'player';
        try {
          const ctrl = connector as any;
          if (typeof ctrl.username === 'function') {
            const result = ctrl.username();
            if (result && typeof result.then === 'function') {
              username = await result;
            } else if (typeof result === 'string') {
              username = result;
            }
          }
        } catch {
          // fallback to 'player'
        }

        const ok = await registerPlayer(username);
        if (ok) {
          toast.success('Welcome! Player registered.');
        }
      }
    })();
  }, [account, connector]); // eslint-disable-line react-hooks/exhaustive-deps

  const transition = useCallback((to: Screen, delay = 300) => {
    setFadeOut(true);
    setTimeout(() => {
      setScreen(to);
      requestAnimationFrame(() => {
        setFadeOut(false);
      });
      setIsPaused(false);
    }, delay);
  }, []);

  const handleSelectMode = useCallback(
    (mode: GameMode) => {
      setGameMode(mode);
      if (mode === 'vs-online') {
        // Connect socket and go to online lobby
        connectSocket();
        useOnlineStore.getState().setIsOnline(true);
        transition('online-lobby');
      } else {
        transition('difficulty');
      }
    },
    [setGameMode, transition],
  );

  const handleSelectDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficulty(d);

      if (gameMode === 'vs-online') {
        // Online host: create room with difficulty, then go to waiting screen
        const playerName = useOnlineStore.getState().playerName;
        emitCreateRoom(playerName, d);
        transition('online-waiting');
        return;
      }

      setGameKey((k) => k + 1);
      transition('gameplay');
      setTimeout(() => {
        startGame();
      }, 350);
    },
    [setDifficulty, startGame, transition, gameMode],
  );

  // When online: both players transition to gameplay when game starts (auto-starts on guest join)
  useEffect(() => {
    if (gameMode !== 'vs-online') return;
    // board must exist to confirm the game actually started (phase defaults to 'playing')
    if (phase === 'playing' && board && screen === 'online-waiting') {
      setGameKey((k) => k + 1);
      transition('gameplay');
    }
  }, [gameMode, phase, board, screen, transition]);

  const handlePause = useCallback(() => {
    togglePause();
    setIsPaused(true);
  }, [togglePause]);

  const handleResume = useCallback(() => {
    togglePause();
    setIsPaused(false);
  }, [togglePause]);

  const handleRestart = useCallback(() => {
    const gameId = useGameStore.getState().currentGameId;
    if (board && gameId) contractForfeit(gameId);
    resetGame();
    setGameKey((k) => k + 1);
    setIsPaused(false);
    transition('difficulty');
  }, [resetGame, transition, board, contractForfeit]);

  const handleQuit = useCallback(() => {
    const gameId = useGameStore.getState().currentGameId;
    if (board && gameId) contractForfeit(gameId);
    resetGame();
    setIsPaused(false);
    if (gameMode === 'vs-online') {
      disconnectSocket();
      useOnlineStore.getState().reset();
    }
    transition('main-menu');
  }, [resetGame, transition, gameMode, board, contractForfeit]);

  return (
    <div className="w-full h-full relative">
      {screen === 'loading' && (
        <LoadingScreen onComplete={() => transition('main-menu')} />
      )}

      {screen === 'main-menu' && (
        <MainMenuScreen
          onPlay={() => {
            if (!account && connectors.length > 0) {
              pendingPlay.current = true;
              connect({ connector: connectors[0] });
              return;
            }
            transition('game-mode');
          }}
          onHowToPlay={() => transition('how-to-play')}
          onSettings={() => transition('settings')}
          onAchievements={() => transition('achievements')}
        />
      )}

      {screen === 'game-mode' && (
        <GameModeScreen
          onSelect={handleSelectMode}
          onBack={() => transition('main-menu')}
        />
      )}

      {screen === 'difficulty' && (
        <DifficultyScreen
          onSelect={handleSelectDifficulty}
          onBack={() => {
            if (gameMode === 'vs-online') {
              transition('online-lobby');
            } else {
              transition('game-mode');
            }
          }}
        />
      )}

      {screen === 'online-lobby' && (
        <OnlineLobbyScreen
          onCreateChooseDifficulty={() => transition('difficulty')}
          onRoomJoined={() => transition('online-waiting')}
          onBack={() => {
            disconnectSocket();
            useOnlineStore.getState().reset();
            setGameMode('vs-ai');
            transition('game-mode');
          }}
        />
      )}

      {screen === 'online-waiting' && (
        <OnlineWaitingScreen
          onBack={() => {
            disconnectSocket();
            useOnlineStore.getState().reset();
            setGameMode('vs-ai');
            transition('main-menu');
          }}
        />
      )}

      {screen === 'gameplay' && !isPaused && (
        <GameplayScreen
          key={gameKey}
          onPause={handlePause}
          onGameOver={() => transition('game-over', 500)}
        />
      )}

      {screen === 'gameplay' && isPaused && (
        <PauseScreen
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      )}

      {screen === 'game-over' && (
        <GameOverScreen
          onPlayAgain={() => {
            if (gameMode === 'vs-online') {
              disconnectSocket();
              useOnlineStore.getState().reset();
              setGameMode('vs-ai');
            }
            transition('difficulty');
          }}
          onMainMenu={() => {
            resetGame();
            if (gameMode === 'vs-online') {
              disconnectSocket();
              useOnlineStore.getState().reset();
              setGameMode('vs-ai');
            }
            transition('main-menu');
          }}
        />
      )}

      {screen === 'how-to-play' && (
        <HowToPlayScreen onBack={() => transition('main-menu')} />
      )}

      {screen === 'achievements' && (
        <AchievementsScreen onBack={() => transition('main-menu')} />
      )}

      {screen === 'settings' && (
        <SettingsScreen onBack={() => transition('main-menu')} />
      )}

      {/* Opponent disconnected overlay */}
      {gameMode === 'vs-online' && screen === 'gameplay' && (
        <OpponentDisconnectedOverlay />
      )}

      {/* Fade transition overlay — z-50 to sit above all screens */}
      <div
        className={`absolute inset-0 bg-game-bg pointer-events-none z-50 transition-opacity duration-300 ${
          fadeOut ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

function OpponentDisconnectedOverlay() {
  const disconnected = useOnlineStore((s) => s.opponentDisconnected);

  if (!disconnected) return null;

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
      <div className="bg-game-surface border border-white/10 rounded-2xl p-6 text-center">
        <div className="text-sm font-game font-bold text-game-gold mb-2">
          Opponent Disconnected
        </div>
        <div className="text-xs font-game text-white/40">
          Waiting for reconnect (30s)...
        </div>
      </div>
    </div>
  );
}
