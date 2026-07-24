import { describe, expect, it } from 'vitest';
import { boundaries } from './sales-analytics.controller.js';

describe('analytics boundaries', () => {
  it('uses adjacent months for monthly comparisons', () => {
    const result = boundaries('monthly', '2026-01-15');
    expect(result.start.toISOString()).toContain('2026-01-01');
    expect(result.end.toISOString()).toContain('2026-02-01');
    expect(result.previousStart.toISOString()).toContain('2025-12-01');
  });

  it('uses adjacent years for annual comparisons', () => {
    const result = boundaries('annual', '2026-07-24');
    expect(result.start.getUTCFullYear()).toBe(2026);
    expect(result.end.getUTCFullYear()).toBe(2027);
    expect(result.previousStart.getUTCFullYear()).toBe(2025);
  });
});
