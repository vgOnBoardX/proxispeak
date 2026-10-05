/**
 * ProxiSpeak – Shared Constants
 * Source: docs/PROJECT_SPEC.md §4
 *
 * All radii, rates, and limits live here.
 * No magic numbers anywhere else in the codebase.
 */

// ─── World Dimensions ────────────────────────────────────────────────────────

/** Default office width in pixels */
export const DEFAULT_WORLD_W = 2000;

/** Default office height in pixels */
export const DEFAULT_WORLD_H = 1200;

/** Upper bound for the Mongoose `2d` index (pixel coordinate space) */
export const INDEX_MAX = 4096;

// ─── Proximity Radii ─────────────────────────────────────────────────────────

/** Connect to peers within this pixel distance */
export const HEARING_RADIUS = 100;

/** Disconnect only beyond this distance (hysteresis gap prevents thrashing) */
export const DISCONNECT_RADIUS = 120;

/** Full volume inside this pixel distance */
export const INNER_RADIUS = 20;

// ─── Peer Limits ─────────────────────────────────────────────────────────────

/** Maximum simultaneous WebRTC peers per user (nearest-first selection) */
export const MAX_PEERS = 6;

// ─── Tick Rates ──────────────────────────────────────────────────────────────

/** Client movement emit rate (Hz) */
export const CLIENT_MOVE_HZ = 15;

/** Server position broadcast rate (Hz) */
export const SERVER_BROADCAST_HZ = 20;

// ─── Persistence Intervals ───────────────────────────────────────────────────

/** Batched MongoDB flush interval for dirty positions (ms) */
export const PRESENCE_FLUSH_MS = 100;

/** Touch `updatedAt` for ALL connected users (prevents TTL expiry while idle) (ms) */
export const PRESENCE_HEARTBEAT_MS = 10_000;

/** TTL index expiry for stale presence documents (seconds) */
export const PRESENCE_TTL_S = 30;

// ─── Proximity Tick ──────────────────────────────────────────────────────────

/** Neighbor recalculation interval (ms) */
export const PROXIMITY_TICK_MS = 150;

// ─── Movement ────────────────────────────────────────────────────────────────

/** Avatar movement speed (px/s) */
export const AVATAR_SPEED = 220;

/**
 * Server rejects movement above AVATAR_SPEED × this multiplier.
 * Accounts for clock drift and network jitter.
 */
export const MAX_SPEED_TOLERANCE = 1.5;

// ─── Audio ───────────────────────────────────────────────────────────────────

/** Gain multiplier applied to a source when a wall/furniture segment occludes it */
export const OCCLUDED_GAIN = 0.25;

/** Lowpass filter cutoff (Hz) when source is occluded */
export const OCCLUDED_LOWPASS_HZ = 600;

/** Gain/pan update rate on the client (Hz) */
export const AUDIO_UPDATE_HZ = 30;
