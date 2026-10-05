/**
 * Auth routes – spec §9
 *
 * POST /auth/register  – create account, return JWT
 * POST /auth/login     – verify password, return JWT (rate-limited)
 * GET  /auth/me        – return current user (JWT required)
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { RegisterBodySchema, LoginBodySchema } from '@proxispeak/shared/events';
import { User } from '../models/User.js';
import { requireAuth, signToken } from './auth.middleware.js';
import { logger } from '../config/logger.js';

const authRouter = Router();

/** Rate limiter for auth routes: 10 requests per 15 minutes per IP */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// ─── POST /auth/register ─────────────────────────────────────────────────────
authRouter.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { name, email, password, avatarColor } = parsed.data;

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, avatarColor });

  const token = signToken({
    sub: (user._id as { toString(): string }).toString(),
    email: user.email,
    name: user.name,
  });

  logger.info({ userId: user._id, email }, 'User registered');
  res.status(201).json({ token, user });
});

// ─── POST /auth/login ────────────────────────────────────────────────────────
authRouter.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  // Include passwordHash for comparison (excluded by toJSON transform)
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    // Constant-time: still run bcrypt even if user not found
    await bcrypt.compare(password, '$2a$12$notavalidhashjusttomaintaintiming');
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken({
    sub: (user._id as { toString(): string }).toString(),
    email: user.email,
    name: user.name,
  });

  logger.info({ userId: user._id, email }, 'User logged in');
  res.status(200).json({ token, user });
});

// ─── GET /auth/me ────────────────────────────────────────────────────────────
authRouter.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.sub).select('-passwordHash').lean();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(200).json({ user });
});

export default authRouter;
