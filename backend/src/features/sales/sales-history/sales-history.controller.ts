import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { database } from '../../../shared/database.js';

interface SaleRow extends RowDataPacket {
  id: number; customer_name: string; status: string; payment_status: string;
  payment_method: string | null; total_amount: number; total_pieces: number;
  completed_at: Date | null; created_at: Date;
}
export const salesHistoryController: RequestHandler = async (_request, response) => {
  const [rows] = await database.query<SaleRow[]>(
    `SELECT s.id, s.customer_name, s.status, s.payment_status, s.payment_method,
            s.total_amount, COALESCE(SUM(si.pieces), 0) AS total_pieces,
            s.completed_at, s.created_at
     FROM sales s LEFT JOIN sales_items si ON si.sale_id = s.id
     GROUP BY s.id ORDER BY s.created_at DESC, s.id DESC`,
  );
  response.json({ data: rows.map((row) => ({
    id: row.id, customerName: row.customer_name, status: row.status,
    paymentStatus: row.payment_status, paymentMethod: row.payment_method,
    totalAmount: row.total_amount, totalPieces: row.total_pieces,
    transactionDate: row.completed_at ?? row.created_at,
  })) });
};
