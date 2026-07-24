import type { RequestHandler } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { inTransaction } from '../../../shared/database.js';
import { AppError } from '../../../shared/errors.js';

interface PriceRow extends RowDataPacket { price_per_kilogram: number }
const itemSchema = z.object({
  size: z.enum(['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO']),
  grade: z.enum(['A', 'B', 'C']),
  pieces: z.number().int().positive(),
  totalWeightKilograms: z.string().regex(/^\d+(\.\d{1,3})?$/),
});
const schema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(255),
    contactNumber: z.string().trim().min(7).max(30),
    emailAddress: z.string().email(),
  }),
  items: z.array(itemSchema).min(1),
});

export const createDraftSaleController: RequestHandler = async (request, response) => {
  const command = schema.parse(request.body);
  const result = await inTransaction(async (connection) => {
    const [sale] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales
       (customer_name, customer_address, customer_contact_number, customer_email,
        status, payment_status, currency, created_by)
       VALUES (?, ?, ?, ?, 'DRAFT', 'UNPAID', 'PHP', ?)`,
      [
        command.customer.name, command.customer.address,
        command.customer.contactNumber, command.customer.emailAddress,
        request.auth!.sub,
      ],
    );
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
      const subtotal = Number(item.totalWeightKilograms) * price;
      total += subtotal;
      await connection.execute(
        `INSERT INTO sales_items
         (sale_id, size, grade, pieces, total_weight_kilograms, price_per_kilogram, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sale.insertId, item.size, item.grade, item.pieces, item.totalWeightKilograms, price, subtotal.toFixed(2)],
      );
    }
    await connection.execute('UPDATE sales SET total_amount = ? WHERE id = ?', [total.toFixed(2), sale.insertId]);
    return { id: sale.insertId, totalAmount: total.toFixed(2), status: 'DRAFT' };
  });
  response.status(201).json({ data: result });
};
