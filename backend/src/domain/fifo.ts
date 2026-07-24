export interface FifoLot {
  id: number;
  availablePieces: number;
}

export interface FifoAllocation {
  inventoryId: number;
  pieces: number;
}

export function allocatePiecesFifo(
  lots: readonly FifoLot[],
  requestedPieces: number,
): FifoAllocation[] {
  if (!Number.isInteger(requestedPieces) || requestedPieces <= 0) {
    throw new RangeError('Requested pieces must be a positive whole number.');
  }

  const availablePieces = lots.reduce((total, lot) => total + lot.availablePieces, 0);
  if (availablePieces < requestedPieces) {
    throw new RangeError(
      `Only ${availablePieces} pieces are available; ${requestedPieces} were requested.`,
    );
  }

  let remaining = requestedPieces;
  const allocations: FifoAllocation[] = [];
  for (const lot of lots) {
    if (remaining === 0) break;
    const pieces = Math.min(lot.availablePieces, remaining);
    if (pieces > 0) {
      allocations.push({ inventoryId: lot.id, pieces });
      remaining -= pieces;
    }
  }
  return allocations;
}
