/**
 * MongoDB connection helper.
 * Call connectMongo() once at startup, before anything that needs DB access.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function connectMongo(uri?: string): Promise<void> {
  const mongoUri = uri ?? env.MONGO_URI;

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
  mongoose.connection.on('error', (err: unknown) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  await mongoose.connect(mongoUri, {
    // Recommended settings for production reliability
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45_000,
  });

  logger.info({ uri: mongoUri }, 'MongoDB connected');
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
}
