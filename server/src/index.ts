/**
 * ProxiSpeak Server – Entry Point
 *
 * Boot order:
 *  1. Load & validate env
 *  2. Create Express app (helmet, CORS, JSON body parser)
 *  3. Connect to MongoDB
 *  4. Mount HTTP routers
 *  5. Create HTTP server + Socket.io
 *  6. Start background loops
 *  7. Listen
 */
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectMongo } from './config/mongo.js';
import healthRouter from './http/health.router.js';
import authRouter from './http/auth.router.js';
import { createSocketServer } from './sockets/io.js';

async function main(): Promise<void> {
  // ── Express app ────────────────────────────────────────────────────────────
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '16kb' }));

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);

  // ── MongoDB ────────────────────────────────────────────────────────────────
  await connectMongo();

  // ── HTTP server + Socket.io ────────────────────────────────────────────────
  const httpServer = createServer(app);
  createSocketServer(httpServer);

  // ── Listen ─────────────────────────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, instanceId: env.INSTANCE_ID, nodeEnv: env.NODE_ENV },
      'ProxiSpeak server listening',
    );
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  function shutdown(signal: string): void {
    logger.info({ signal }, 'Shutting down gracefully...');
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
