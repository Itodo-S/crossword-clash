import { create } from 'zustand';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

type OnlineState = {
  // Connection
  connectionStatus: ConnectionStatus;
  isOnline: boolean;

  // Room
  roomCode: string | null;
  playerName: string;
  hostName: string | null;
  guestName: string | null;
  isHost: boolean;

  // Opponent status
  opponentDisconnected: boolean;

  // Error
  error: string | null;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoomCode: (code: string | null) => void;
  setPlayerName: (name: string) => void;
  setRoomPlayers: (hostName: string, guestName: string) => void;
  setIsHost: (isHost: boolean) => void;
  setOpponentDisconnected: (disconnected: boolean) => void;
  setError: (error: string | null) => void;
  setIsOnline: (online: boolean) => void;
  reset: () => void;
};

const initialState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  isOnline: false,
  roomCode: null as string | null,
  playerName: '',
  hostName: null as string | null,
  guestName: null as string | null,
  isHost: false,
  opponentDisconnected: false,
  error: null as string | null,
};

export const useOnlineStore = create<OnlineState>((set) => ({
  ...initialState,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomPlayers: (hostName, guestName) => set({ hostName, guestName }),
  setIsHost: (isHost) => set({ isHost }),
  setOpponentDisconnected: (disconnected) => set({ opponentDisconnected: disconnected }),
  setError: (error) => set({ error }),
  setIsOnline: (online) => set({ isOnline: online }),
  reset: () => set(initialState),
}));
