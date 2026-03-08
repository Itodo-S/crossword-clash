import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SERVER_PORT, CORS_ORIGIN } from './config.js';
import { RoomManager } from './RoomManager.js';
import { registerHandlers } from './handlers.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

const rooms = new RoomManager();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Register socket handlers
registerHandlers(io, rooms);

httpServer.listen(SERVER_PORT, () => {
  console.log(`Crossword backend listening on port ${SERVER_PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  rooms.destroy();
  io.close();
  httpServer.close();
});
