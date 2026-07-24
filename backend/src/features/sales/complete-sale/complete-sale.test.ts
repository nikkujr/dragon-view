import { describe, expect, it } from 'vitest';
import { calculateChangeDue } from './complete-sale.command.js';

describe('calculateChangeDue', () => {
  it('returns cash change and rejects cash underpayment', () => {
    expect(calculateChangeDue('CASH', 250, 225)).toBe(25);
    expect(() => calculateChangeDue('CASH', 200, 225)).toThrow('less than');
  });

  it('requires electronic payment to equal the total', () => {
    expect(calculateChangeDue('GCASH', 225, 225)).toBe(0);
    expect(() => calculateChangeDue('BANK_TRANSFER', 250, 225)).toThrow('must equal');
  });
});
