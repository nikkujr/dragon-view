import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { database } from '../../../shared/database.js';

interface TotalRow extends RowDataPacket {
  revenue: number; sales_count: number; pieces: number; weight_kg: number;
}
interface TrendRow extends RowDataPacket { label: string; revenue: number; pieces: number }
interface SummaryRow extends RowDataPacket {
  size: string; grade: string; pieces: number; weight_kg: number; revenue: number;
}
const querySchema = z.object({
  period: z.enum(['daily', 'monthly', 'annual']).default('daily'),
  date: z.string().date(),
});

export function boundaries(period: 'daily' | 'monthly' | 'annual', date: string) {
  const selected = new Date(`${date}T00:00:00Z`);
  let start: Date;
  let end: Date;
  let previousStart: Date;
  if (period === 'daily') {
    start = selected;
    end = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), selected.getUTCDate() + 1));
    previousStart = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), selected.getUTCDate() - 1));
  } else if (period === 'monthly') {
    start = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
    end = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 1));
    previousStart = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() - 1, 1));
  } else {
    start = new Date(Date.UTC(selected.getUTCFullYear(), 0, 1));
    end = new Date(Date.UTC(selected.getUTCFullYear() + 1, 0, 1));
    previousStart = new Date(Date.UTC(selected.getUTCFullYear() - 1, 0, 1));
  }
  return { start, end, previousStart };
}
const mysqlDate = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

export const salesAnalyticsController: RequestHandler = async (request, response) => {
  const query = querySchema.parse(request.query);
  const { start, end, previousStart } = boundaries(query.period, query.date);
  const totalsSql = `SELECT COALESCE(SUM(si.subtotal), 0) revenue,
    COUNT(DISTINCT s.id) sales_count, COALESCE(SUM(si.pieces), 0) pieces,
    COALESCE(SUM(si.total_weight_kilograms), 0) weight_kg
    FROM sales s LEFT JOIN sales_items si ON si.sale_id = s.id
    WHERE s.status = 'COMPLETED' AND s.completed_at >= ? AND s.completed_at < ?`;
  const [currentRows] = await database.execute<TotalRow[]>(totalsSql, [mysqlDate(start), mysqlDate(end)]);
  const [previousRows] = await database.execute<TotalRow[]>(totalsSql, [mysqlDate(previousStart), mysqlDate(start)]);
  const format = query.period === 'annual' ? '%b' : query.period === 'monthly' ? '%d' : '%H:00';
  const [trend] = await database.execute<TrendRow[]>(
    `SELECT DATE_FORMAT(s.completed_at, ?) label, SUM(si.subtotal) revenue, SUM(si.pieces) pieces
     FROM sales s JOIN sales_items si ON si.sale_id = s.id
     WHERE s.status = 'COMPLETED' AND s.completed_at >= ? AND s.completed_at < ?
     GROUP BY label ORDER BY MIN(s.completed_at)`,
    [format, mysqlDate(start), mysqlDate(end)],
  );
  const [summary] = await database.execute<SummaryRow[]>(
    `SELECT si.size, si.grade, SUM(si.pieces) pieces,
      SUM(si.total_weight_kilograms) weight_kg, SUM(si.subtotal) revenue
     FROM sales s JOIN sales_items si ON si.sale_id = s.id
     WHERE s.status = 'COMPLETED' AND s.completed_at >= ? AND s.completed_at < ?
     GROUP BY si.size, si.grade ORDER BY si.grade, si.size`,
    [mysqlDate(start), mysqlDate(end)],
  );
  const current = currentRows[0]!;
  const previous = previousRows[0]!;
  const comparisonPercent = previous.revenue
    ? ((current.revenue - previous.revenue) / previous.revenue) * 100
    : null;
  response.json({ data: {
    period: query.period, selectedDate: query.date,
    totals: { revenue: current.revenue, completedSales: current.sales_count, pieces: current.pieces, weightKilograms: current.weight_kg },
    previousRevenue: previous.revenue, comparisonPercent,
    trend, summary: summary.map((row) => ({
      size: row.size, grade: row.grade, pieces: row.pieces,
      weightKilograms: row.weight_kg, revenue: row.revenue,
    })),
  } });
};
