/**
 * Auth HTTP route tests – spec acceptance criteria
 *
 * Covers:
 * - POST /auth/register success + duplicate email
 * - POST /auth/login success + wrong password
 * - GET  /auth/me with valid token + missing token
 * - GET  /health
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { startTestApp, stopTestApp } from './helpers/testApp.js';

let app: Express;

beforeAll(async () => {
  ({ app } = await startTestApp());
});

afterAll(async () => {
  await stopTestApp();
});

// ─── Health ───────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.ts).toBe('string');
  });
});

// ─── Register ─────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  const validUser = {
    name: 'Alice',
    email: 'alice@test.com',
    password: 'Password123!',
  };

  it('registers a new user and returns token + user', async () => {
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('alice@test.com');
    // passwordHash must NOT be in the response
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app).post('/auth/register').send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('rejects invalid email with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validUser, email: 'new@test.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects empty name with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validUser, email: 'new2@test.com', name: '' });
    expect(res.status).toBe(400);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  const credentials = { email: 'alice@test.com', password: 'Password123!' };

  it('logs in with correct credentials and returns token', async () => {
    const res = await request(app).post('/auth/login').send(credentials);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ ...credentials, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('rejects non-existent email with 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@test.com', password: 'Password123!' });
    expect(res.status).toBe(401);
  });

  it('rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'bad', password: 'Password123!' });
    expect(res.status).toBe(400);
  });
});

// ─── Me ──────────────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@test.com', password: 'Password123!' });
    token = res.body.token as string;
  });

  it('returns the current user with a valid token', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalidtoken.xxx.yyy');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed Authorization header', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
  });
});
