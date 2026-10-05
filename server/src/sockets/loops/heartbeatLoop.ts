/**
 * Heartbeat loop – spec §7
 *
 * Every PRESENCE_HEARTBEAT_MS, touch `updatedAt` for ALL connected users.
 * This prevents idle-but-connected users from being evicted by the TTL index.
 *
 * Uses a single updateMany (not a per-user write).
 */
import { PRESENCE_HEARTBEAT_MS } from '@proxispeak/shared/constants';
import { getAllUserIds } from '../presenceMap.js';
import { Presence } from '../../models/Presence.js';
import { logger } from '../../config/logger.js';

export function startHeartbeatLoop(): NodeJS.Timeout {
  return setInterval(() => {
    void (async () => {
      const userIds = getAllUserIds();
      if (userIds.length === 0) return;

      try {
        const result = await Presence.updateMany(
          { userId: { $in: userIds } },
          { $set: { updatedAt: new Date() } },
        );
        logger.debug(
          { touched: result.modifiedCount, connected: userIds.length },
          'heartbeat: touched updatedAt',
        );
      } catch (err: unknown) {
        logger.error({ err }, 'heartbeat: updateMany failed');
      }
    })();
  }, PRESENCE_HEARTBEAT_MS);
}
