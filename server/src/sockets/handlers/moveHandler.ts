/**
 * move handler – spec §7
 *
 * Algorithm:
 * 1. Validate payload with zod MovePayloadSchema
 * 2. Clamp x,y to [0, world_width] × [0, world_height]
 * 3. Speed check: distance / time_delta <= AVATAR_SPEED * MAX_SPEED_TOLERANCE
 *    - On first move (lastMovedAt not meaningful), skip speed check
 * 4. Update presenceMap entry (x, y, seq, dirty = true, lastMovedAt)
 * 5. On rejection: emit position:correct with last accepted position
 *
 * NEVER touches MongoDB here (spec performance rule).
 */
import { MovePayloadSchema } from '@proxispeak/shared/events';
import {
  DEFAULT_WORLD_W,
  DEFAULT_WORLD_H,
  AVATAR_SPEED,
  MAX_SPEED_TOLERANCE,
} from '@proxispeak/shared/constants';
import { clamp, distance } from '@proxispeak/shared/geometry';
import { presenceMap } from '../presenceMap.js';
import { logger } from '../../config/logger.js';
import { incrementMoveCount } from '../loops/flushLoop.js';
import type { AuthenticatedSocket } from '../io.js';

/** Maximum px/s the server will accept */
const MAX_SPEED_PX_S = AVATAR_SPEED * MAX_SPEED_TOLERANCE;

/** Guard: minimum ms between moves to prevent divide-by-zero jitter */
const MIN_DELTA_MS = 10;

export function registerMoveHandler(socket: AuthenticatedSocket): void {
  socket.on('move', (payload: unknown) => {
    const userId = socket.data.userId;
    const entry = presenceMap.get(userId);
    if (!entry) {
      // User has not joined an office yet
      return;
    }

    // ── 1. Zod validation ─────────────────────────────────────────────────────
    const parsed = MovePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn({ userId, payload }, 'move: invalid payload');
      // Snap client back to last known good position
      socket.emit('position:correct', { x: entry.x, y: entry.y });
      return;
    }
    const { x: rawX, y: rawY, seq } = parsed.data;

    // ── 2. Bounds clamp ───────────────────────────────────────────────────────
    // Use world width/height from presenceMap (set from office at join).
    // For now use defaults; proximity service will pass real bounds in later phases.
    const x = clamp(rawX, 0, DEFAULT_WORLD_W);
    const y = clamp(rawY, 0, DEFAULT_WORLD_H);

    // ── 3. Speed check ────────────────────────────────────────────────────────
    const now = Date.now();
    const deltaMs = now - entry.lastMovedAt;

    if (deltaMs >= MIN_DELTA_MS) {
      const dist = distance(entry.x, entry.y, x, y);
      const speedPxS = dist / (deltaMs / 1000);
      if (speedPxS > MAX_SPEED_PX_S) {
        logger.warn(
          { userId, speedPxS, maxAllowed: MAX_SPEED_PX_S, deltaMs, dist },
          'move: speed check failed – sending position:correct',
        );
        socket.emit('position:correct', { x: entry.x, y: entry.y });
        return;
      }
    }

    // ── 4. Accept move ────────────────────────────────────────────────────────
    entry.x = x;
    entry.y = y;
    entry.seq = seq;
    entry.dirty = true;
    entry.lastMovedAt = now;
    incrementMoveCount();
  });
}
