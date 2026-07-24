import { describe, expect, it } from 'vitest';
import { calculateLifecycle, normalizeDateOnly } from './planting.lifecycle.js';

describe('planting lifecycle', () => {
  const today = new Date('2026-07-24T12:00:00Z');
  it('uses the defined growth-stage boundaries', () => {
    expect(calculateLifecycle('2026-07-19', today).stage).toBe('NEWLY_GRAFTED');
    expect(calculateLifecycle('2026-07-18', today).stage).toBe('INTERMEDIATE');
    expect(calculateLifecycle('2026-06-23', today).stage).toBe('NEAR_MATURITY');
  });
  it('marks day 45 as near maturity and ready for harvest', () => {
    const result = calculateLifecycle('2026-06-09', today);
    expect(result.elapsedDays).toBe(45);
    expect(result.stage).toBe('NEAR_MATURITY');
    expect(result.readyForHarvest).toBe(true);
    expect(result.remainingDays).toBe(0);
  });
  it('normalizes MySQL Date objects without calling string methods on them', () => {
    expect(normalizeDateOnly(new Date('2026-07-24T00:00:00Z'))).toBe('2026-07-24');
    expect(calculateLifecycle(new Date('2026-07-19T00:00:00Z'), today).elapsedDays).toBe(5);
  });
});
