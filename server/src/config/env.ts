/**
 * Server environment configuration loader.
 * Validates all env vars with zod at startup — fails fast with clear messages.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  INSTANCE_ID: z.string().min(1).default('server1'),
  STUN_URLS: z.string().default('stun:stun.l.google.com:19302'),
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const isTest = process.env.NODE_ENV === 'test';
  const defaults = isTest
    ? {
        MONGO_URI: 'mongodb://127.0.0.1:27017/proxispeak_test',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_SECRET: 'test-secret-must-be-at-least-32-chars-long!!',
        LOG_LEVEL: 'silent',
      }
    : {};

  const merged = { ...defaults, ...process.env };
  const result = EnvSchema.safeParse(merged);
  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    const current = loadEnv();
    return (current as unknown as Record<string | symbol, unknown>)[prop];
  },
});
