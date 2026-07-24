import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { inTransaction } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';

interface StatusRow extends RowDataPacket { status: string }
interface PriceRow extends RowDataPacket { price_per_kilogram: number }
const schema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(120), address: z.string().trim().min(1).max(255),
    contactNumber: z.string().trim().min(7).max(30), emailAddress: z.string().email(),
  }),
  items: z.array(z.object({
    size: z.enum(['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO']),
    grade: z.enum(['A', 'B', 'C']), pieces: z.number().int().positive(),
    totalWeightKilograms: z.string().regex(/^\d+(\.\d{1,3})?$/),
  })).min(1),
});

export const updateDraftController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const command = schema.parse(request.body);
  const result = await inTransaction(async (connection) => {
    const [rows] = await connection.execute<StatusRow[]>('SELECT status FROM sales WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) throw new AppError(404, 'Sale not found.', 'SALE_NOT_FOUND');
    if (rows[0].status !== 'DRAFT') throw new AppError(409, 'Only Draft sales may be edited.', 'SALE_NOT_EDITABLE');
    await connection.execute(
      `UPDATE sales SET customer_name = ?, customer_address = ?, customer_contact_number = ?,
       customer_email = ? WHERE id = ?`,
      [command.customer.name, command.customer.address, command.customer.contactNumber, command.customer.emailAddress, id],
    );
    await connection.execute('DELETE FROM sales_items WHERE sale_id = ?', [id]);
    let total = 0;
    for (const item of command.items) {
      const [prices] = await connection.execute<PriceRow[]>(
        `SELECT price_per_kilogram FROM fruit_prices
         WHERE grade = ? AND is_active = 1 AND (size = ? OR (grade = 'C' AND size IS NULL))
         ORDER BY effective_from DESC LIMIT 1`,
        [item.grade, item.size],
      );
      const price = prices[0]?.price_per_kilogram;
      if (!price) throw new AppError(409, 'An active price is required for every item.', 'PRICE_NOT_CONFIGURED');
      const subtotal = Number(item.totalWeightKilograms) * price; total += subtotal;
      await connection.execute(
        `INSERT INTO sales_items
         (sale_id, size, grade, pieces, total_weight_kilograms, price_per_kilogram, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, item.size, item.grade, item.pieces, item.totalWeightKilograms, price, subtotal.toFixed(2)],
      );
    }
    await connection.execute('UPDATE sales SET total_amount = ? WHERE id = ?', [total.toFixed(2), id]);
    return { id, totalAmount: total.toFixed(2), status: 'DRAFT' };
  });
  response.json({ data: result });
};
