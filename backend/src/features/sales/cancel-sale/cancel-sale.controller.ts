import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { inTransaction } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';

interface SaleRow extends RowDataPacket { status: 'DRAFT' | 'COMPLETED' | 'CANCELLED' }
interface AllocationRow extends RowDataPacket { inventory_id: number; pieces: number }
const schema = z.object({
  reason: z.string().trim().min(3).max(255),
  refundConfirmed: z.boolean().default(false),
  refundReference: z.string().trim().max(100).optional(),
});

export const cancelSaleController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const command = schema.parse(request.body);
  const result = await inTransaction(async (connection) => {
    const [sales] = await connection.execute<SaleRow[]>(
      'SELECT status FROM sales WHERE id = ? FOR UPDATE', [id],
    );
    const sale = sales[0];
    if (!sale) throw new AppError(404, 'Sale not found.', 'SALE_NOT_FOUND');
    if (sale.status === 'CANCELLED') throw new AppError(409, 'Sale is already cancelled.', 'SALE_ALREADY_CANCELLED');

    if (sale.status === 'COMPLETED') {
      if (!command.refundConfirmed) {
        throw new AppError(400, 'Payment refund confirmation is required.', 'REFUND_REQUIRED');
      }
      const [allocations] = await connection.execute<AllocationRow[]>(
        `SELECT sia.inventory_id, sia.pieces
         FROM sale_inventory_allocations sia
         JOIN sales_items si ON si.id = sia.sale_item_id
         WHERE si.sale_id = ? FOR UPDATE`,
        [id],
      );
      for (const allocation of allocations) {
        await connection.execute(
          'UPDATE inventory SET available_pieces = available_pieces + ? WHERE id = ?',
          [allocation.pieces, allocation.inventory_id],
        );
        await connection.execute(
          `INSERT INTO inventory_transactions
           (inventory_id, transaction_type, pieces, related_sale_id, remarks, created_by)
           VALUES (?, 'SALE_CANCELLATION_RETURN', ?, ?, ?, ?)`,
          [allocation.inventory_id, allocation.pieces, id, command.reason, request.auth!.sub],
        );
      }
    }
    await connection.execute(
      `UPDATE sales SET status = 'CANCELLED',
       payment_status = ?,
       cancellation_reason = ?, refund_reference = ?, cancelled_by = ?, cancelled_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        sale.status === 'COMPLETED' ? 'REFUNDED' : 'UNPAID',
        command.reason, command.refundReference ?? null, request.auth!.sub, id,
      ],
    );
    return { id, status: 'CANCELLED' };
  });
  response.json({ data: result });
};
