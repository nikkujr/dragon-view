import type { RowDataPacket } from 'mysql2';
import { database } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';

interface DetailRow extends RowDataPacket {
  id: number; batch_number: string; harvest_date: string;
  size: string; grade: 'A' | 'B' | 'C'; available_pieces: number;
}
interface TransactionRow extends RowDataPacket {
  id: number; transaction_type: string; pieces: number;
  remarks: string | null; created_at: Date; created_by_name: string;
}

export async function getInventoryDetails(id: number) {
  const [lots] = await database.execute<DetailRow[]>(
    `SELECT i.id, hb.batch_number, hb.harvest_date, i.size, i.grade, i.available_pieces
     FROM inventory i
     JOIN harvest_batches hb ON hb.id = i.harvest_batch_id
     WHERE i.id = ?`,
    [id],
  );
  const lot = lots[0];
  if (!lot) throw new AppError(404, 'Inventory record not found.', 'INVENTORY_NOT_FOUND');

  const [transactions] = await database.execute<TransactionRow[]>(
    `SELECT it.id, it.transaction_type, it.pieces, it.remarks, it.created_at,
            u.display_name AS created_by_name
     FROM inventory_transactions it
     JOIN users u ON u.id = it.created_by
     WHERE it.inventory_id = ?
     ORDER BY it.created_at ASC, it.id ASC`,
    [id],
  );
  return {
    id: lot.id,
    batchNumber: lot.batch_number,
    harvestDate: lot.harvest_date,
    size: lot.size,
    grade: lot.grade,
    availablePieces: lot.available_pieces,
    transactions: transactions.map((item) => ({
      id: item.id,
      type: item.transaction_type,
      pieces: item.pieces,
      remarks: item.remarks,
      createdAt: item.created_at,
      createdBy: item.created_by_name,
    })),
  };
}
