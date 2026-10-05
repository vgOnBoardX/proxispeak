/**
 * In-memory presence map.
 *
 * Keyed by userId (string). Each entry stores the current in-memory position,
 * dirty flag (needs flushing to Mongo), and movement metadata for speed checks.
 *
 * Rules:
 * - One entry per userId at all times (single-session enforcement).
 * - Only moveHandler writes to pos/dirty; flushLoop reads and clears dirty.
 * - Heartbeat and disconnect are the only other writers.
 */

export interface PresenceEntry {
  userId: string;
  officeId: string;
  socketId: string;
  instanceId: string;
  x: number;
  y: number;
  seq: number;
  muted: boolean;
  dirty: boolean;
  /** Timestamp of last accepted move (ms since epoch). Used for speed check. */
  lastMovedAt: number;
}

/** Global in-memory presence map. userId → PresenceEntry */
export const presenceMap = new Map<string, PresenceEntry>();

/** Returns all entries for a given officeId. */
export function getOfficePresences(officeId: string): PresenceEntry[] {
  const result: PresenceEntry[] = [];
  for (const entry of presenceMap.values()) {
    if (entry.officeId === officeId) {
      result.push(entry);
    }
  }
  return result;
}

/** Returns all dirty entries and clears their dirty flags atomically. */
export function drainDirty(): PresenceEntry[] {
  const dirty: PresenceEntry[] = [];
  for (const entry of presenceMap.values()) {
    if (entry.dirty) {
      dirty.push({ ...entry }); // snapshot
      entry.dirty = false;
    }
  }
  return dirty;
}

/** Returns all userId strings currently in the map. */
export function getAllUserIds(): string[] {
  return Array.from(presenceMap.keys());
}
