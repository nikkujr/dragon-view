import { describe, expect, it } from 'vitest';
import { assertDraftStatus } from './complete-draft.command.js';

describe('assertDraftStatus', () => {
  it('allows Draft and rejects terminal or completed states', () => {
    expect(() => assertDraftStatus('DRAFT')).not.toThrow();
    expect(() => assertDraftStatus('COMPLETED')).toThrow('Only a Draft');
    expect(() => assertDraftStatus('CANCELLED')).toThrow('Only a Draft');
  });
});
