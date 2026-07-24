import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { inTransaction } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';

interface SourceRow extends RowDataPacket {
  harvest_batch_id: number; size: string; grade: 'A' | 'B' | 'C'; available_pieces: number;
}
interface IdRow extends RowDataPacket { id: number }

export function validateRegrade(
  sourceGrade: 'A' | 'B' | 'C',
  targetGrade: 'B' | 'C',
): 'B' | 'C' {
  if (sourceGrade === 'A' && (targetGrade === 'B' || targetGrade === 'C')) return targetGrade;
  if (sourceGrade === 'B' && targetGrade === 'C') return targetGrade;
  if (sourceGrade === 'C') {
    throw new AppError(409, 'Grade C inventory cannot be regraded.', 'FINAL_GRADE');
  }
  throw new AppError(
    409,
    `Grade ${sourceGrade} inventory cannot be regraded to Grade ${targetGrade}.`,
    'INVALID_REGRADE',
  );
}

export async function regradeInventory(command: {
  inventoryId: number; targetGrade: 'B' | 'C'; pieces: number; reason: string; regradedBy: string;
}) {
  return inTransaction(async (connection) => {
    const [sources] = await connection.execute<SourceRow[]>(
      `SELECT harvest_batch_id, size, grade, available_pieces
       FROM inventory WHERE id = ? FOR UPDATE`,
      [command.inventoryId],
    );
    const source = sources[0];
    if (!source) throw new AppError(404, 'Inventory record not found.', 'INVENTORY_NOT_FOUND');
    if (command.pieces > source.available_pieces) {
      throw new AppError(409, 'Regrading exceeds available pieces.', 'INSUFFICIENT_INVENTORY');
    }
    const targetGrade = validateRegrade(source.grade, command.targetGrade);

    await connection.execute(
      `INSERT INTO harvest_size_items (harvest_batch_id, size, grade, pieces)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [source.harvest_batch_id, source.size, targetGrade, command.pieces],
    );
    const [itemRows] = await connection.execute<IdRow[]>(
      `SELECT id FROM harvest_size_items
       WHERE harvest_batch_id = ? AND size = ? AND grade = ?`,
      [source.harvest_batch_id, source.size, targetGrade],
    );
    const itemId = itemRows[0]!.id;
    await connection.execute(
      `INSERT INTO inventory
       (harvest_batch_id, harvest_size_item_id, size, grade, available_pieces)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE available_pieces = available_pieces + VALUES(available_pieces)`,
      [source.harvest_batch_id, itemId, source.size, targetGrade, command.pieces],
    );
    const [targetRows] = await connection.execute<IdRow[]>(
      `SELECT id FROM inventory WHERE harvest_batch_id = ? AND size = ? AND grade = ?`,
      [source.harvest_batch_id, source.size, targetGrade],
    );
    const targetId = targetRows[0]!.id;

    await connection.execute(
      'UPDATE inventory SET available_pieces = available_pieces - ? WHERE id = ?',
      [command.pieces, command.inventoryId],
    );
    await connection.execute(
      `INSERT INTO inventory_transactions
       (inventory_id, transaction_type, pieces, remarks, created_by)
       VALUES (?, 'REGRADING_OUT', ?, ?, ?), (?, 'REGRADING_IN', ?, ?, ?)`,
      [
        command.inventoryId, -command.pieces, command.reason, command.regradedBy,
        targetId, command.pieces, command.reason, command.regradedBy,
      ],
    );
    return { sourceInventoryId: command.inventoryId, targetInventoryId: targetId, targetGrade };
  });
}
