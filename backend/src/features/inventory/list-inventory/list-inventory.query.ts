import type { RowDataPacket } from 'mysql2';
import { database } from '../../../shared/database.js';

interface InventoryRow extends RowDataPacket {
  id: number;
  batch_number: string;
  harvest_date: string;
  size: string;
  grade: string;
  available_pieces: number;
}

export interface ListInventoryQuery {
  grade?: 'A' | 'B' | 'C' | undefined;
  search?: string | undefined;
}

export async function listInventory(query: ListInventoryQuery) {
  const conditions = ['i.available_pieces > 0'];
  const parameters: unknown[] = [];

  if (query.grade) {
    conditions.push('i.grade = ?');
    parameters.push(query.grade);
  }

  if (query.search) {
    conditions.push('(hb.batch_number LIKE ? OR i.size LIKE ?)');
    const search = `%${query.search}%`;
    parameters.push(search, search);
  }

  const [rows] = await database.query<InventoryRow[]>(
    `SELECT
       i.id,
       hb.batch_number,
       hb.harvest_date,
       i.size,
       i.grade,
       i.available_pieces
     FROM inventory AS i
     INNER JOIN harvest_batches AS hb ON hb.id = i.harvest_batch_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY hb.harvest_date ASC, i.id ASC`,
    parameters,
  );

  return rows.map((row) => ({
    id: row.id,
    batchNumber: row.batch_number,
    harvestDate: row.harvest_date,
    size: row.size,
    grade: row.grade,
    availablePieces: row.available_pieces,
  }));
}
