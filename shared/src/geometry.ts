/**
 * ProxiSpeak – Shared Geometry Utilities
 *
 * Pure functions with no side-effects. Fully unit-tested.
 * These are used by both server (move validation) and client (audio attenuation).
 */

/**
 * Clamp a value within [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Euclidean distance between two 2D points.
 */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Test whether two line segments (p1→p2) and (p3→p4) intersect.
 * Returns true if they cross (not counting collinear overlap).
 * Used for sound occlusion checks in Phase 2.
 */
export function segmentsIntersect(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  p4x: number,
  p4y: number,
): boolean {
  const d1x = p2x - p1x;
  const d1y = p2y - p1y;
  const d2x = p4x - p3x;
  const d2y = p4y - p3y;

  const cross = d1x * d2y - d1y * d2x;

  // Parallel segments
  if (cross === 0) return false;

  const dx = p3x - p1x;
  const dy = p3y - p1y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  return t > 0 && t < 1 && u > 0 && u < 1;
}
