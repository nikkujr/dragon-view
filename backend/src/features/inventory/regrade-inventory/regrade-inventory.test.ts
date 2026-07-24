import { describe, expect, it } from 'vitest';
import { AppError } from '../../../shared/errors.js';
import { validateRegrade } from './regrade-inventory.command.js';

describe('validateRegrade', () => {
  it('allows Grade A to be downgraded to Grade B or Grade C', () => {
    expect(validateRegrade('A', 'B')).toBe('B');
    expect(validateRegrade('A', 'C')).toBe('C');
  });

  it('allows Grade B to be downgraded only to Grade C', () => {
    expect(validateRegrade('B', 'C')).toBe('C');
    expect(() => validateRegrade('B', 'B')).toThrow('cannot be regraded');
  });

  it('prevents regrading Grade C', () => {
    expect(() => validateRegrade('C', 'C')).toThrow(AppError);
  });
});
