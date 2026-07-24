import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { database, inTransaction } from '../../../shared/database.js';

interface PriceRow extends RowDataPacket {
  id: number; grade: string; size: string | null; price_per_kilogram: number;
}
const priceSchema = z.object({
  grade: z.enum(['A', 'B', 'C']),
  size: z.enum(['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO']).nullable(),
  pricePerKilogram: z.number().positive().multipleOf(0.01),
}).superRefine((value, context) => {
  if ((value.grade === 'C') !== (value.size === null)) {
    context.addIssue({ code: 'custom', path: ['size'], message: 'Grade C uses one uniform price; Grades A and B require a size.' });
  }
});

export const listPricesController: RequestHandler = async (_request, response) => {
  const [rows] = await database.query<PriceRow[]>(
    `SELECT id, grade, size, price_per_kilogram
     FROM fruit_prices WHERE is_active = 1
     ORDER BY FIELD(grade, 'A', 'B', 'C'), FIELD(size, 'EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO')`,
  );
  response.json({ data: rows.map((row) => ({
    id: row.id, grade: row.grade, size: row.size, pricePerKilogram: row.price_per_kilogram,
  })) });
};

export const configurePriceController: RequestHandler = async (request, response) => {
  const price = priceSchema.parse(request.body);
  const result = await inTransaction(async (connection) => {
    await connection.execute(
      `UPDATE fruit_prices SET is_active = 0, effective_to = UTC_TIMESTAMP()
       WHERE grade = ? AND size <=> ? AND is_active = 1`,
      [price.grade, price.size],
    );
    const [created] = await connection.execute<import('mysql2').ResultSetHeader>(
      `INSERT INTO fruit_prices
       (grade, size, price_per_kilogram, effective_from, is_active, configured_by)
       VALUES (?, ?, ?, UTC_TIMESTAMP(), 1, ?)`,
      [price.grade, price.size, price.pricePerKilogram, request.auth!.sub],
    );
    return { id: created.insertId, ...price };
  });
  response.status(201).json({ data: result });
};
