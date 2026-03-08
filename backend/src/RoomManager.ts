import type { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
import type { Difficulty } from './shared/types.js';
import { Room } from './Room.js';
import { ROOM_CODE_LENGTH } from './config.js';

const generateCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', ROOM_CODE_LENGTH);

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>(); // socketId → roomCode
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean stale rooms every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  createRoom(hostSocketId: string, hostName: string, difficulty: Difficulty): Room {
    let code: string;
    do {
      code = generateCode();
    } while (this.rooms.has(code));

    const room = new Room(code, hostSocketId, hostName, difficulty);
    this.rooms.set(code, room);
    this.socketToRoom.set(hostSocketId, code);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  joinRoom(code: string, guestSocketId: string, guestName: string, io: Server): Room | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return null;

    const joined = room.join(guestSocketId, guestName, io);
    if (!joined) return null;

    this.socketToRoom.set(guestSocketId, code.toUpperCase());
    return room;
  }

  associateSocket(socketId: string, roomCode: string): void {
    this.socketToRoom.set(socketId, roomCode);
  }

  removeSocket(socketId: string): void {
    this.socketToRoom.delete(socketId);
  }

  removeRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
    }
  }

  private cleanup(): void {
    for (const [code, room] of this.rooms) {
      if (room.isStale()) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    for (const room of this.rooms.values()) {
      room.destroy();
    }
    this.rooms.clear();
    this.socketToRoom.clear();
  }
}
