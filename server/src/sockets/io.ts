/**
 * Socket.io server factory – spec §6, §7, §9
 *
 * - WebSocket transport ONLY (no HTTP long-poll)
 * - JWT handshake auth: token in socket.handshake.auth.token
 * - Single-session-per-user: new login disconnects the old socket
 * - Attaches handlers: join, move
 * - Starts background loops: broadcast, flush, heartbeat
 * - Handles disconnect: removes from presenceMap, deletes Presence doc
 */
import { Server, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { presenceMap } from './presenceMap.js';
import { Presence } from '../models/Presence.js';
import { registerJoinHandler } from './handlers/joinHandler.js';
import { registerMoveHandler } from './handlers/moveHandler.js';
import { startBroadcastLoop } from './loops/broadcastLoop.js';
import { startFlushLoop } from './loops/flushLoop.js';
import { startHeartbeatLoop } from './loops/heartbeatLoop.js';
import type { JwtPayload } from '../http/auth.middleware.js';

/** Socket with typed data attached during auth */
export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    name: string;
    avatarColor: string;
  };
}

/**
 * Maps userId → socketId for single-session enforcement.
 * Keyed by userId (string). Value is the currently active socketId.
 */
const activeSocketByUser = new Map<string, string>();

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    transports: ['websocket'], // spec §2: websocket ONLY
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  // ── JWT Handshake Middleware ───────────────────────────────────────────────
  io.use((socket, next) => {
    const token = (socket.handshake.auth as Record<string, unknown>).token;
    if (typeof token !== 'string' || !token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      // Attach to socket.data (typed via AuthenticatedSocket)
      (socket as AuthenticatedSocket).data.userId = payload.sub;
      (socket as AuthenticatedSocket).data.email = payload.email;
      (socket as AuthenticatedSocket).data.name = payload.name;
      (socket as AuthenticatedSocket).data.avatarColor = '#6366f1'; // default; updated from DB in join
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.data.userId;

    // ── Single-session enforcement ──────────────────────────────────────────
    const existingSocketId = activeSocketByUser.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = io.sockets.sockets.get(existingSocketId);
      if (existingSocket) {
        logger.info(
          { userId, oldSocketId: existingSocketId, newSocketId: socket.id },
          'Disconnecting previous session for single-session enforcement',
        );
        existingSocket.emit('error', { message: 'New session started from another location' });
        existingSocket.disconnect(true);
      }
    }
    activeSocketByUser.set(userId, socket.id);

    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // ── Register event handlers ─────────────────────────────────────────────
    registerJoinHandler(socket);
    registerMoveHandler(socket);

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'Socket disconnected');

      // Remove from activeSocketByUser only if this is the current socket
      if (activeSocketByUser.get(userId) === socket.id) {
        activeSocketByUser.delete(userId);
      }

      // Get officeId before removing from presenceMap
      const entry = presenceMap.get(userId);
      const officeId = entry?.officeId;

      // Remove from in-memory map
      presenceMap.delete(userId);

      // Notify office peers
      if (officeId) {
        socket.to(`office:${officeId}`).emit('user:left', { id: userId });
      }

      // Delete Presence document (fire-and-forget, with error logging)
      Presence.deleteOne({ userId }).catch((err: unknown) => {
        logger.error({ err, userId }, 'Failed to delete presence on disconnect');
      });
    });
  });

  // ── Start Background Loops ─────────────────────────────────────────────────
  startBroadcastLoop(io);
  startFlushLoop();
  startHeartbeatLoop();

  logger.info('Socket.io server created (websocket-only transport, JWT auth)');
  return io;
}
