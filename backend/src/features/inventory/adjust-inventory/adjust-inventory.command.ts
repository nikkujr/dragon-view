import type { RowDataPacket } from 'mysql2';
import { inTransaction } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';

interface InventoryRow extends RowDataPacket { available_pieces: number }

export async function adjustInventory(command: {
  inventoryId: number; pieces: number; reason: string; adjustedBy: string;
}) {
  return inTransaction(async (connection) => {
    const [rows] = await connection.execute<InventoryRow[]>(
      'SELECT available_pieces FROM inventory WHERE id = ? FOR UPDATE',
      [command.inventoryId],
    );
    const lot = rows[0];
    if (!lot) throw new AppError(404, 'Inventory record not found.', 'INVENTORY_NOT_FOUND');
    const remaining = lot.available_pieces + command.pieces;
    if (remaining < 0) {
      throw new AppError(409, 'Adjustment exceeds available pieces.', 'INSUFFICIENT_INVENTORY');
    }
    await connection.execute(
      'UPDATE inventory SET available_pieces = ? WHERE id = ?',
      [remaining, command.inventoryId],
    );
    await connection.execute(
      `INSERT INTO inventory_transactions
       (inventory_id, transaction_type, pieces, remarks, created_by)
       VALUES (?, 'MANUAL_ADJUSTMENT', ?, ?, ?)`,
      [command.inventoryId, command.pieces, command.reason, command.adjustedBy],
    );
    return { inventoryId: command.inventoryId, availablePieces: remaining };
  });
}
