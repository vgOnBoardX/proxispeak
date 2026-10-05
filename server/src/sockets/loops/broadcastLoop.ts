/**
 * Broadcast loop – spec §7
 *
 * Every 1/SERVER_BROADCAST_HZ ms, emit a batched `positions` event
 * to each office room containing ALL locally connected movers.
 *
 * Only emits if there are entries in the presenceMap (no wasted emissions
 * when the server is idle).
 */
import type { Server } from 'socket.io';
import { SERVER_BROADCAST_HZ } from '@proxispeak/shared/constants';
import { presenceMap } from '../presenceMap.js';

const BROADCAST_INTERVAL_MS = Math.round(1000 / SERVER_BROADCAST_HZ);

export function startBroadcastLoop(io: Server): NodeJS.Timeout {
  return setInterval(() => {
    if (presenceMap.size === 0) return;

    // Group positions by officeId
    const byOffice = new Map<string, { id: string; x: number; y: number; seq: number }[]>();
    for (const entry of presenceMap.values()) {
      let list = byOffice.get(entry.officeId);
      if (!list) {
        list = [];
        byOffice.set(entry.officeId, list);
      }
      list.push({ id: entry.userId, x: entry.x, y: entry.y, seq: entry.seq });
    }

    // Emit to each office room
    for (const [officeId, positions] of byOffice) {
      io.to(`office:${officeId}`).emit('positions', positions);
    }
  }, BROADCAST_INTERVAL_MS);
}
