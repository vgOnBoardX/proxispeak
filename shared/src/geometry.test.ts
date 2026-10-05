import { describe, it, expect } from 'vitest';
import { clamp, distance, segmentsIntersect } from '../src/geometry.js';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it('clamps to min', () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });
  it('clamps to max', () => {
    expect(clamp(200, 0, 100)).toBe(100);
  });
  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });
  it('returns max when value equals max', () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(5, 5, 5, 5)).toBe(0);
  });
  it('returns 5 for 3-4-5 triangle', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });
  it('is symmetric', () => {
    expect(distance(1, 2, 7, 10)).toBeCloseTo(distance(7, 10, 1, 2));
  });
  it('returns horizontal distance', () => {
    expect(distance(0, 0, 10, 0)).toBe(10);
  });
  it('returns vertical distance', () => {
    expect(distance(0, 0, 0, 10)).toBe(10);
  });
});

describe('segmentsIntersect', () => {
  it('returns true for crossing segments', () => {
    // + shape
    expect(segmentsIntersect(-1, 0, 1, 0, 0, -1, 0, 1)).toBe(true);
  });
  it('returns false for parallel segments', () => {
    expect(segmentsIntersect(0, 0, 10, 0, 0, 1, 10, 1)).toBe(false);
  });
  it('returns false for non-crossing T-shape', () => {
    // Segments share endpoint on extension but do not cross interiors
    expect(segmentsIntersect(0, 0, 5, 0, 5, 0, 10, 5)).toBe(false);
  });
  it('returns false for collinear overlapping segments', () => {
    expect(segmentsIntersect(0, 0, 4, 0, 2, 0, 6, 0)).toBe(false);
  });
  it('returns false for segments that would cross if extended', () => {
    expect(segmentsIntersect(0, 0, 1, 0, 2, -1, 2, 1)).toBe(false);
  });
});
