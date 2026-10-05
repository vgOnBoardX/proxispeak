/**
 * Unit tests for move handler logic:
 * - Speed check (exceeding AVATAR_SPEED × MAX_SPEED_TOLERANCE is rejected)
 * - Bounds clamping (coords outside world are clamped, not rejected)
 * - Zod schema rejects malformed payloads
 *
 * These tests run logic in isolation without a real Socket or DB.
 */
import { describe, it, expect } from 'vitest';
import {
  AVATAR_SPEED,
  MAX_SPEED_TOLERANCE,
  DEFAULT_WORLD_W,
  DEFAULT_WORLD_H,
} from '@proxispeak/shared/constants';
import { clamp, distance } from '@proxispeak/shared/geometry';
import { MovePayloadSchema } from '@proxispeak/shared/events';

const MAX_SPEED_PX_S = AVATAR_SPEED * MAX_SPEED_TOLERANCE;

/**
 * Pure helper — mirrors the logic in moveHandler.ts so we can test it without sockets.
 */
function checkMove(
  prevX: number,
  prevY: number,
  prevTimestamp: number,
  rawX: number,
  rawY: number,
  nowMs: number,
): { accepted: boolean; x: number; y: number } {
  const x = clamp(rawX, 0, DEFAULT_WORLD_W);
  const y = clamp(rawY, 0, DEFAULT_WORLD_H);

  const deltaMs = nowMs - prevTimestamp;
  if (deltaMs >= 10) {
    const dist = distance(prevX, prevY, x, y);
    const speed = dist / (deltaMs / 1000);
    if (speed > MAX_SPEED_PX_S) {
      return { accepted: false, x: prevX, y: prevY };
    }
  }

  return { accepted: true, x, y };
}

// ─── Bounds clamping ──────────────────────────────────────────────────────────

describe('Bounds clamping', () => {
  it('passes through coordinates within world bounds', () => {
    const result = checkMove(100, 100, Date.now() - 5000, 500, 600, Date.now());
    expect(result.accepted).toBe(true);
    expect(result.x).toBe(500);
    expect(result.y).toBe(600);
  });

  it('clamps x below 0 to 0', () => {
    const result = checkMove(100, 100, Date.now() - 5000, -50, 100, Date.now());
    expect(result.accepted).toBe(true);
    expect(result.x).toBe(0);
  });

  it('clamps y below 0 to 0', () => {
    const result = checkMove(100, 100, Date.now() - 5000, 100, -200, Date.now());
    expect(result.accepted).toBe(true);
    expect(result.y).toBe(0);
  });

  it('clamps x above DEFAULT_WORLD_W to DEFAULT_WORLD_W', () => {
    const result = checkMove(
      DEFAULT_WORLD_W - 50,
      100,
      Date.now() - 1000,
      DEFAULT_WORLD_W + 500,
      100,
      Date.now(),
    );
    expect(result.accepted).toBe(true);
    expect(result.x).toBe(DEFAULT_WORLD_W);
  });

  it('clamps y above DEFAULT_WORLD_H to DEFAULT_WORLD_H', () => {
    const result = checkMove(
      100,
      DEFAULT_WORLD_H - 50,
      Date.now() - 1000,
      100,
      DEFAULT_WORLD_H + 500,
      Date.now(),
    );
    expect(result.accepted).toBe(true);
    expect(result.y).toBe(DEFAULT_WORLD_H);
  });

  it('clamps both x and y when both are out of bounds', () => {
    const result = checkMove(50, DEFAULT_WORLD_H - 50, Date.now() - 1000, -999, 99999, Date.now());
    expect(result.accepted).toBe(true);
    expect(result.x).toBe(0);
    expect(result.y).toBe(DEFAULT_WORLD_H);
  });
});

// ─── Speed check ─────────────────────────────────────────────────────────────

describe('Speed check', () => {
  it('accepts movement at exactly AVATAR_SPEED px/s', () => {
    const deltaMs = 1000;
    const dist = AVATAR_SPEED; // px/s × 1s = AVATAR_SPEED px
    const now = Date.now();
    const prev = now - deltaMs;
    const result = checkMove(0, 0, prev, dist, 0, now);
    expect(result.accepted).toBe(true);
  });

  it('accepts movement at AVATAR_SPEED × MAX_SPEED_TOLERANCE exactly', () => {
    const deltaMs = 1000;
    const dist = MAX_SPEED_PX_S; // exactly at limit
    const now = Date.now();
    const prev = now - deltaMs;
    const result = checkMove(0, 0, prev, dist, 0, now);
    // At the exact limit it should pass (> not >=)
    expect(result.accepted).toBe(true);
  });

  it('rejects movement above MAX_SPEED_TOLERANCE × AVATAR_SPEED', () => {
    const deltaMs = 100; // 100ms
    // Move 10× the maximum allowed distance
    const dist = MAX_SPEED_PX_S * 10;
    const now = Date.now();
    const prev = now - deltaMs;
    const result = checkMove(0, 0, prev, dist, 0, now);
    expect(result.accepted).toBe(false);
  });

  it('skips speed check when delta is < 10ms (avoids divide-by-near-zero jitter)', () => {
    const now = Date.now();
    const prev = now - 5; // only 5ms ago
    // Would be impossibly fast if delta were counted, but should pass
    const result = checkMove(0, 0, prev, 10000, 0, now);
    // Clamped to world bounds, but accepted (no speed check)
    expect(result.accepted).toBe(true);
    expect(result.x).toBe(DEFAULT_WORLD_W);
  });

  it('snap-back position is the previous position on rejection', () => {
    const prevX = 400;
    const prevY = 300;
    const now = Date.now();
    const prev = now - 100;
    const result = checkMove(prevX, prevY, prev, prevX + 10000, prevY, now);
    expect(result.accepted).toBe(false);
    expect(result.x).toBe(prevX);
    expect(result.y).toBe(prevY);
  });
});

// ─── MovePayload zod schema (again, focused on edge cases) ───────────────────

describe('MovePayloadSchema – edge cases', () => {
  it('rejects when x is a string', () => {
    expect(MovePayloadSchema.safeParse({ x: '100', y: 0, seq: 0 }).success).toBe(false);
  });
  it('rejects negative infinity', () => {
    expect(MovePayloadSchema.safeParse({ x: -Infinity, y: 0, seq: 0 }).success).toBe(false);
  });
  it('rejects extra fields gracefully (strips them)', () => {
    const result = MovePayloadSchema.safeParse({ x: 10, y: 20, seq: 1, extra: 'bad' });
    expect(result.success).toBe(true);
    // zod strips unknown keys
  });
});
