/**
 * Flush loop – spec §7
 *
 * Every PRESENCE_FLUSH_MS, drain all dirty presenceMap entries and
 * run a single bulkWrite to MongoDB.
 *
 * Key correctness property: we snapshot-and-clear dirty flags atomically
 * (via drainDirty()) before awaiting the bulkWrite. If the bulkWrite fails,
 * we log the error — we do NOT re-set dirty, since subsequent moves will
 * mark dirty again on the next flush cycle.
 *
 * Spec §7: "Never write to MongoDB per movement event."
 */
import { PRESENCE_FLUSH_MS } from '@proxispeak/shared/constants';
import { drainDirty } from '../presenceMap.js';
import { Presence } from '../../models/Presence.js';
import { logger } from '../../config/logger.js';

/** Total moves received (for testing: compare to bulkWrite calls) */
let totalMoveEvents = 0;
let totalBulkWrites = 0;

export function incrementMoveCount(): void {
  totalMoveEvents++;
}

export function getFlushStats(): { moveEvents: number; bulkWrites: number } {
  return { moveEvents: totalMoveEvents, bulkWrites: totalBulkWrites };
}

export function startFlushLoop(): NodeJS.Timeout {
  return setInterval(() => {
    void (async () => {
      const dirty = drainDirty();
      if (dirty.length === 0) return;

      totalBulkWrites++;
      const batchSize = dirty.length;

      try {
        const ops = dirty.map((entry) => ({
          updateOne: {
            filter: { userId: entry.userId },
            update: {
              $set: {
                pos: [entry.x, entry.y] as [number, number],
                socketId: entry.socketId,
                instanceId: entry.instanceId,
                muted: entry.muted,
                updatedAt: new Date(),
              },
            },
            upsert: false, // presence must exist (created at join)
          },
        }));

        await Presence.bulkWrite(ops, { ordered: false });

        logger.debug(
          { batchSize, totalBulkWrites, totalMoveEvents },
          'presence flush: bulkWrite complete',
        );
      } catch (err: unknown) {
        logger.error({ err, batchSize }, 'presence flush: bulkWrite failed');
        // Do not re-dirty; next moves will create new dirty entries
      }
    })();
  }, PRESENCE_FLUSH_MS);
}
