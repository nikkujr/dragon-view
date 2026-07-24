import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { database } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';

interface SaleRow extends RowDataPacket {
  id: number; customer_name: string; customer_address: string;
  customer_contact_number: string; customer_email: string; status: string;
  payment_status: string; payment_method: string | null; amount_paid: number | null;
  total_amount: number; change_due: number; payment_reference: string | null;
  other_ewallet_provider: string | null; currency: string; created_at: Date;
  completed_at: Date | null; cancelled_at: Date | null; cancellation_reason: string | null;
}
interface ItemRow extends RowDataPacket {
  id: number; size: string; grade: string; pieces: number; total_weight_kilograms: number;
  price_per_kilogram: number; subtotal: number;
}
interface AllocationRow extends RowDataPacket {
  sale_item_id: number; inventory_id: number; batch_number: string; pieces: number;
}

export const saleDetailsController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const [sales] = await database.execute<SaleRow[]>('SELECT * FROM sales WHERE id = ?', [id]);
  const sale = sales[0];
  if (!sale) throw new AppError(404, 'Sale not found.', 'SALE_NOT_FOUND');
  const [items] = await database.execute<ItemRow[]>('SELECT * FROM sales_items WHERE sale_id = ? ORDER BY id', [id]);
  const [allocations] = await database.execute<AllocationRow[]>(
    `SELECT sia.sale_item_id, sia.inventory_id, hb.batch_number, sia.pieces
     FROM sale_inventory_allocations sia
     JOIN sales_items si ON si.id = sia.sale_item_id
     JOIN inventory i ON i.id = sia.inventory_id
     JOIN harvest_batches hb ON hb.id = i.harvest_batch_id
     WHERE si.sale_id = ? ORDER BY sia.id`,
    [id],
  );
  response.json({ data: {
    id: sale.id,
    customer: { name: sale.customer_name, address: sale.customer_address, contactNumber: sale.customer_contact_number, emailAddress: sale.customer_email },
    status: sale.status, paymentStatus: sale.payment_status, paymentMethod: sale.payment_method,
    amountPaid: sale.amount_paid, totalAmount: sale.total_amount, changeDue: sale.change_due,
    paymentReference: sale.payment_reference, otherEWalletProvider: sale.other_ewallet_provider,
    currency: sale.currency, createdAt: sale.created_at, completedAt: sale.completed_at,
    cancelledAt: sale.cancelled_at, cancellationReason: sale.cancellation_reason,
    items: items.map((item) => ({
      id: item.id, size: item.size, grade: item.grade, pieces: item.pieces,
      totalWeightKilograms: item.total_weight_kilograms, pricePerKilogram: item.price_per_kilogram,
      subtotal: item.subtotal,
      allocations: allocations.filter((allocation) => allocation.sale_item_id === item.id).map((allocation) => ({
        inventoryId: allocation.inventory_id, batchNumber: allocation.batch_number, pieces: allocation.pieces,
      })),
    })),
  } });
};
