export const SERVER_PORT = parseInt(process.env.PORT || "3001", 10);

export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

export const DISCONNECT_GRACE_MS = 30_000; // 30 seconds

export const ROOM_CODE_LENGTH = 4;
