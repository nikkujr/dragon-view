import type { ResultSetHeader } from 'mysql2';
import { inTransaction } from '../../../shared/database.js';

export type FruitSize = 'EXTRA_SMALL' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'JUMBO';
export type FruitGrade = 'A' | 'B' | 'C';

export interface RegisterHarvestCommand {
  batchNumber: string;
  harvestDate: string;
  recordedBy: string;
  items: Array<{
    size: FruitSize;
    grade: FruitGrade;
    pieces: number;
  }>;
}

export async function registerHarvest(command: RegisterHarvestCommand) {
  return inTransaction(async (connection) => {
    const [batchResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO harvest_batches (batch_number, harvest_date, recorded_by)
       VALUES (?, ?, ?)`,
      [command.batchNumber, command.harvestDate, command.recordedBy],
    );

    for (const item of command.items) {
      const [itemResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO harvest_size_items
           (harvest_batch_id, size, grade, pieces)
         VALUES (?, ?, ?, ?)`,
        [batchResult.insertId, item.size, item.grade, item.pieces],
      );

      const [inventoryResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO inventory
           (harvest_batch_id, harvest_size_item_id, size, grade, available_pieces)
         VALUES (?, ?, ?, ?, ?)`,
        [batchResult.insertId, itemResult.insertId, item.size, item.grade, item.pieces],
      );

      await connection.execute(
        `INSERT INTO inventory_transactions
           (inventory_id, transaction_type, pieces, remarks, created_by)
         VALUES (?, 'HARVEST_IN', ?, 'Initial harvest registration', ?)`,
        [inventoryResult.insertId, item.pieces, command.recordedBy],
      );
    }

    return {
      id: batchResult.insertId,
      batchNumber: command.batchNumber,
      itemCount: command.items.length,
    };
  });
}
