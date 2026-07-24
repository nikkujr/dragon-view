import { describe, expect, it } from 'vitest';
import { allocatePiecesFifo } from './fifo.js';

describe('allocatePiecesFifo', () => {
  it('deducts pieces from the oldest lots first', () => {
    const result = allocatePiecesFifo(
      [
        { id: 101, availablePieces: 5 },
        { id: 102, availablePieces: 10 },
        { id: 103, availablePieces: 8 },
      ],
      12,
    );

    expect(result).toEqual([
      { inventoryId: 101, pieces: 5 },
      { inventoryId: 102, pieces: 7 },
    ]);
  });

  it('rejects requests larger than matching piece inventory', () => {
    expect(() =>
      allocatePiecesFifo([{ id: 101, availablePieces: 4 }], 5),
    ).toThrow('Only 4 pieces are available');
  });
});
