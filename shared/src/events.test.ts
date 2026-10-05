import { describe, it, expect } from 'vitest';
import {
  JoinPayloadSchema,
  MovePayloadSchema,
  SignalOfferSchema,
  SignalAnswerSchema,
  SignalIceSchema,
  MutePayloadSchema,
  RegisterBodySchema,
  LoginBodySchema,
} from '../src/events.js';

describe('JoinPayloadSchema', () => {
  it('accepts valid officeId', () => {
    expect(JoinPayloadSchema.safeParse({ officeId: 'office-123' }).success).toBe(true);
  });
  it('rejects missing officeId', () => {
    expect(JoinPayloadSchema.safeParse({}).success).toBe(false);
  });
  it('rejects empty string officeId', () => {
    expect(JoinPayloadSchema.safeParse({ officeId: '' }).success).toBe(false);
  });
  it('rejects officeId over 64 chars', () => {
    expect(JoinPayloadSchema.safeParse({ officeId: 'x'.repeat(65) }).success).toBe(false);
  });
});

describe('MovePayloadSchema', () => {
  it('accepts valid move payload', () => {
    expect(MovePayloadSchema.safeParse({ x: 100, y: 200, seq: 42 }).success).toBe(true);
  });
  it('rejects NaN x', () => {
    expect(MovePayloadSchema.safeParse({ x: NaN, y: 200, seq: 1 }).success).toBe(false);
  });
  it('rejects Infinity y', () => {
    expect(MovePayloadSchema.safeParse({ x: 100, y: Infinity, seq: 1 }).success).toBe(false);
  });
  it('rejects negative seq', () => {
    expect(MovePayloadSchema.safeParse({ x: 100, y: 200, seq: -1 }).success).toBe(false);
  });
  it('rejects fractional seq', () => {
    expect(MovePayloadSchema.safeParse({ x: 100, y: 200, seq: 1.5 }).success).toBe(false);
  });
  it('rejects missing fields', () => {
    expect(MovePayloadSchema.safeParse({ x: 100 }).success).toBe(false);
  });
  it('rejects string x', () => {
    expect(MovePayloadSchema.safeParse({ x: '100', y: 200, seq: 1 }).success).toBe(false);
  });
});

describe('SignalOfferSchema', () => {
  it('accepts valid signal:offer', () => {
    expect(SignalOfferSchema.safeParse({ to: 'user-abc', sdp: 'v=0...' }).success).toBe(true);
  });
  it('rejects empty `to`', () => {
    expect(SignalOfferSchema.safeParse({ to: '', sdp: 'v=0...' }).success).toBe(false);
  });
  it('rejects empty sdp', () => {
    expect(SignalOfferSchema.safeParse({ to: 'user-abc', sdp: '' }).success).toBe(false);
  });
  it('rejects missing sdp', () => {
    expect(SignalOfferSchema.safeParse({ to: 'user-abc' }).success).toBe(false);
  });
});

describe('SignalAnswerSchema', () => {
  it('accepts valid signal:answer', () => {
    expect(SignalAnswerSchema.safeParse({ to: 'user-abc', sdp: 'v=0...' }).success).toBe(true);
  });
  it('rejects missing `to`', () => {
    expect(SignalAnswerSchema.safeParse({ sdp: 'v=0...' }).success).toBe(false);
  });
});

describe('SignalIceSchema', () => {
  it('accepts valid signal:ice with candidate object', () => {
    expect(
      SignalIceSchema.safeParse({ to: 'user-xyz', candidate: { candidate: 'a=...' } }).success,
    ).toBe(true);
  });
  it('rejects missing `to`', () => {
    expect(SignalIceSchema.safeParse({ candidate: {} }).success).toBe(false);
  });
});

describe('MutePayloadSchema', () => {
  it('accepts muted: true', () => {
    expect(MutePayloadSchema.safeParse({ muted: true }).success).toBe(true);
  });
  it('accepts muted: false', () => {
    expect(MutePayloadSchema.safeParse({ muted: false }).success).toBe(true);
  });
  it('rejects string muted', () => {
    expect(MutePayloadSchema.safeParse({ muted: 'yes' }).success).toBe(false);
  });
  it('rejects missing muted', () => {
    expect(MutePayloadSchema.safeParse({}).success).toBe(false);
  });
});

describe('RegisterBodySchema', () => {
  const valid = { name: 'Alice', email: 'alice@example.com', password: 'password123' };

  it('accepts valid registration', () => {
    expect(RegisterBodySchema.safeParse(valid).success).toBe(true);
  });
  it('rejects invalid email', () => {
    expect(RegisterBodySchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });
  it('rejects short password (< 8 chars)', () => {
    expect(RegisterBodySchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });
  it('rejects empty name', () => {
    expect(RegisterBodySchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });
  it('rejects invalid avatarColor format', () => {
    expect(RegisterBodySchema.safeParse({ ...valid, avatarColor: 'red' }).success).toBe(false);
  });
  it('accepts valid hex avatarColor', () => {
    expect(RegisterBodySchema.safeParse({ ...valid, avatarColor: '#ff00aa' }).success).toBe(true);
  });
  it('defaults avatarColor to #6366f1 when omitted', () => {
    const result = RegisterBodySchema.safeParse(valid);
    expect(result.success && result.data.avatarColor).toBe('#6366f1');
  });
});

describe('LoginBodySchema', () => {
  it('accepts valid credentials', () => {
    expect(
      LoginBodySchema.safeParse({ email: 'alice@example.com', password: 'password123' }).success,
    ).toBe(true);
  });
  it('rejects invalid email', () => {
    expect(LoginBodySchema.safeParse({ email: 'bad', password: 'password123' }).success).toBe(
      false,
    );
  });
  it('rejects empty password', () => {
    expect(LoginBodySchema.safeParse({ email: 'alice@example.com', password: '' }).success).toBe(
      false,
    );
  });
});
