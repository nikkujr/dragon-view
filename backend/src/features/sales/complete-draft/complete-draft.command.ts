import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { allocatePiecesFifo } from '../../../domain/fifo.js';
import { inTransaction } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';
import { calculateChangeDue, type CompleteSaleCommand } from '../complete-sale/complete-sale.command.js';

interface SaleRow extends RowDataPacket { status: string }
interface ItemRow extends RowDataPacket {
  id: number; size: string; grade: string; pieces: number; total_weight_kilograms: number;
}
interface PriceRow extends RowDataPacket { price_per_kilogram: number }
interface LotRow extends RowDataPacket { id: number; available_pieces: number }

export function assertDraftStatus(status: string): void {
  if (status !== 'DRAFT') {
    throw new AppError(409, 'Only a Draft sale may be completed.', 'SALE_NOT_DRAFT');
  }
}

export async function completeDraft(command: {
  saleId: number; payment: CompleteSaleCommand['payment']; completedBy: string;
}) {
  return inTransaction(async (connection) => {
    const [sales] = await connection.execute<SaleRow[]>(
      'SELECT status FROM sales WHERE id = ? FOR UPDATE', [command.saleId],
    );
    if (!sales[0]) throw new AppError(404, 'Sale not found.', 'SALE_NOT_FOUND');
    assertDraftStatus(sales[0].status);
    const [items] = await connection.execute<ItemRow[]>(
      'SELECT id, size, grade, pieces, total_weight_kilograms FROM sales_items WHERE sale_id = ? ORDER BY id',
      [command.saleId],
    );
    if (!items.length) throw new AppError(409, 'The Draft has no items.', 'SALE_ITEMS_REQUIRED');

    let total = 0;
    for (const item of items) {
      const [prices] = await connection.execute<PriceRow[]>(
        `SELECT price_per_kilogram FROM fruit_prices
         WHERE grade = ? AND is_active = 1 AND (size = ? OR (grade = 'C' AND size IS NULL))
         ORDER BY effective_from DESC LIMIT 1`,
        [item.grade, item.size],
      );
      const price = prices[0]?.price_per_kilogram;
      if (!price) throw new AppError(409, 'An active price is required for every item.', 'PRICE_NOT_CONFIGURED');
      const subtotal = item.total_weight_kilograms * price; total += subtotal;
      await connection.execute(
        'UPDATE sales_items SET price_per_kilogram = ?, subtotal = ? WHERE id = ?',
        [price, subtotal.toFixed(2), item.id],
      );

      const [lots] = await connection.execute<LotRow[]>(
        `SELECT i.id, i.available_pieces FROM inventory i
         JOIN harvest_batches hb ON hb.id = i.harvest_batch_id
         WHERE i.size = ? AND i.grade = ? AND i.available_pieces > 0
         ORDER BY hb.harvest_date, i.id FOR UPDATE`,
        [item.size, item.grade],
      );
      let allocations;
      try {
        allocations = allocatePiecesFifo(
          lots.map((lot) => ({ id: lot.id, availablePieces: lot.available_pieces })),
          item.pieces,
        );
      } catch {
        throw new AppError(409, 'Insufficient matching inventory for a Draft item.', 'INSUFFICIENT_INVENTORY');
      }
      for (const allocation of allocations) {
        await connection.execute(
          'UPDATE inventory SET available_pieces = available_pieces - ? WHERE id = ?',
          [allocation.pieces, allocation.inventoryId],
        );
        await connection.execute<ResultSetHeader>(
          'INSERT INTO sale_inventory_allocations (sale_item_id, inventory_id, pieces) VALUES (?, ?, ?)',
          [item.id, allocation.inventoryId, allocation.pieces],
        );
        await connection.execute(
          `INSERT INTO inventory_transactions
           (inventory_id, transaction_type, pieces, related_sale_id, created_by)
           VALUES (?, 'SALE_OUT', ?, ?, ?)`,
          [allocation.inventoryId, -allocation.pieces, command.saleId, command.completedBy],
        );
      }
    }
    const change = calculateChangeDue(command.payment.method, Number(command.payment.amountPaid), total);
    await connection.execute(
      `UPDATE sales SET status = 'COMPLETED', payment_status = 'PAID',
       payment_method = ?, amount_paid = ?, total_amount = ?, change_due = ?,
       payment_reference = ?, other_ewallet_provider = ?, completed_by = ?, completed_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        command.payment.method, command.payment.amountPaid, total.toFixed(2), change.toFixed(2),
        command.payment.reference ?? null, command.payment.otherEWalletProvider ?? null,
        command.completedBy, command.saleId,
      ],
    );
    return { id: command.saleId, totalAmount: total.toFixed(2), changeDue: change.toFixed(2), status: 'COMPLETED' };
  });
}
