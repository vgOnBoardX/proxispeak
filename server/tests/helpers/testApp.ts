/**
 * Test helper: in-memory MongoDB + Express/Socket.io app factory.
 * Uses mongodb-memory-server so tests are isolated from dev DB.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import type { Server as IOServer } from 'socket.io';
import healthRouter from '../../src/http/health.router.js';
import authRouter from '../../src/http/auth.router.js';
import { createSocketServer } from '../../src/sockets/io.js';

let mongod: MongoMemoryServer | null = null;
let httpServer: HttpServer | null = null;
let ioServer: IOServer | null = null;

export interface TestApp {
  app: ReturnType<typeof express>;
  httpServer: HttpServer;
  io: IOServer;
  mongoUri: string;
  port: number;
}

export async function startTestApp(): Promise<TestApp> {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();

  // Set env vars before loading config
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'test-secret-must-be-at-least-32-chars-long!!';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
  process.env.INSTANCE_ID = 'test-instance';
  process.env.STUN_URLS = 'stun:stun.l.google.com:19302';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.LOG_LEVEL = 'silent';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(mongoUri);

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);

  httpServer = createServer(app);
  ioServer = createSocketServer(httpServer);

  const port = await new Promise<number>((resolve) => {
    httpServer!.listen(0, () => {
      const addr = httpServer!.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });

  return { app, httpServer, io: ioServer, mongoUri, port };
}

export async function stopTestApp(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (!httpServer) {
      resolve();
      return;
    }
    httpServer.close((err) => {
      err ? reject(err) : resolve();
    });
  });

  if (ioServer) {
    await new Promise<void>((resolve) =>
      ioServer!.close(() => {
        resolve();
      }),
    );
  }

  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
  httpServer = null;
  ioServer = null;
}
