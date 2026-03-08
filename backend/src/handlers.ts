import type { Server, Socket } from 'socket.io';
import type { RoomManager } from './RoomManager.js';
import type { Difficulty } from './shared/types.js';

export function registerHandlers(io: Server, rooms: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[connect] ${socket.id}`);

    // ── Room: Create (with difficulty already chosen) ────────
    socket.on('room:create', ({ playerName, difficulty }: { playerName: string; difficulty: Difficulty }) => {
      if (!playerName || typeof playerName !== 'string') {
        socket.emit('room:error', { message: 'Player name is required' });
        return;
      }
      if (!difficulty || !['easy', 'normal', 'hard'].includes(difficulty)) {
        socket.emit('room:error', { message: 'Invalid difficulty' });
        return;
      }

      const room = rooms.createRoom(socket.id, playerName.trim(), difficulty);
      socket.join(room.code);
      socket.emit('room:created', { roomCode: room.code });
      console.log(`[room:create] ${playerName} created room ${room.code} (${difficulty})`);
    });

    // ── Room: Join ──────────────────────────────────────────
    socket.on('room:join', ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      if (!playerName || typeof playerName !== 'string') {
        socket.emit('room:error', { message: 'Player name is required' });
        return;
      }
      if (!roomCode || typeof roomCode !== 'string') {
        socket.emit('room:error', { message: 'Room code is required' });
        return;
      }

      const code = roomCode.trim().toUpperCase();
      const existing = rooms.getRoom(code);
      if (!existing) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      // Check if this is a reconnect
      if (existing.status === 'playing') {
        const stateSync = existing.handleReconnect(socket.id, playerName.trim(), io);
        if (stateSync) {
          rooms.associateSocket(socket.id, code);
          socket.join(code);
          socket.emit('game:state-sync', stateSync);
          console.log(`[reconnect] ${playerName} reconnected to room ${code}`);
          return;
        }
      }

      // Join room — this auto-starts the game since difficulty was set at creation
      const room = rooms.joinRoom(code, socket.id, playerName.trim(), io);
      if (!room) {
        socket.emit('room:error', { message: 'Room is full or game already started' });
        return;
      }

      socket.join(code);

      // Notify both players that opponent joined
      const payload = { hostName: room.host.name, guestName: room.guest!.name };
      io.to(room.host.socketId).emit('room:joined', payload);
      io.to(room.guest!.socketId).emit('room:joined', payload);

      console.log(`[room:join] ${playerName} joined room ${code}`);
    });

    // ── Game: On-chain game ID relay (host → guest) ─────────
    socket.on('game:chain-started', ({ gameId }: { gameId: number }) => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room || !room.guest) return;

      // Only the host can send this
      if (socket.id !== room.host.socketId) return;

      io.to(room.guest.socketId).emit('game:chain-id', { gameId });
      console.log(`[chain] host relayed on-chain gameId=${gameId} to guest in room ${room.code}`);
    });

    // ── Game: Place Tile ────────────────────────────────────
    socket.on('game:place-tile', ({ tileId, row, col }: { tileId: string; row: number; col: number }) => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room) return;

      room.placeTile(socket.id, tileId, row, col, io);
    });

    // ── Game: End Turn ──────────────────────────────────────
    socket.on('game:end-turn', () => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room) return;

      room.endTurn(socket.id, io);
    });

    // ── Game: Swap Tiles ────────────────────────────────────
    socket.on('game:swap-tiles', () => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room) return;

      room.swapTiles(socket.id, io);
    });

    // ── Game: Skip Turn ─────────────────────────────────────
    socket.on('game:skip-turn', () => {
      const room = rooms.getRoomBySocket(socket.id);
      if (!room) return;

      room.skipTurn(socket.id, io);
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[disconnect] ${socket.id}`);

      const room = rooms.getRoomBySocket(socket.id);
      if (room) {
        room.handleDisconnect(socket.id, io);

        // If room is in waiting state and host disconnects, remove the room
        if (room.status === 'waiting') {
          rooms.removeRoom(room.code);
        }
      }
      rooms.removeSocket(socket.id);
    });
  });
}
