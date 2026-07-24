import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { database } from '../../shared/database.js';

interface SummaryRow extends RowDataPacket {
  inventory_pieces: number; active_batches: number; sales_today: number;
  monthly_revenue: number; planting_groups: number; classifications_today: number;
}
interface TrendRow extends RowDataPacket { date: string; pieces: number }
interface GradeRow extends RowDataPacket { grade: 'A' | 'B' | 'C'; count: number }

export const dashboardController: RequestHandler = async (_request, response) => {
  const [[summaryRows], [trendRows], [gradeRows], [inventoryRows], [saleRows], [plantRows], [classificationRows]] =
    await Promise.all([
      database.query<SummaryRow[]>(`
        SELECT
          (SELECT COALESCE(SUM(available_pieces), 0) FROM inventory) inventory_pieces,
          (SELECT COUNT(DISTINCT harvest_batch_id) FROM inventory WHERE available_pieces > 0) active_batches,
          (SELECT COUNT(*) FROM sales WHERE status = 'COMPLETED' AND completed_at >= UTC_DATE() AND completed_at < UTC_DATE() + INTERVAL 1 DAY) sales_today,
          (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'COMPLETED' AND completed_at >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01') AND completed_at < DATE_FORMAT(UTC_DATE() + INTERVAL 1 MONTH, '%Y-%m-01')) monthly_revenue,
          (SELECT COUNT(*) FROM planting_records WHERE deleted_at IS NULL) planting_groups,
          (SELECT COUNT(*) FROM classification_history WHERE classified_at >= UTC_DATE() AND classified_at < UTC_DATE() + INTERVAL 1 DAY) classifications_today
      `),
      database.query<TrendRow[]>(`
        SELECT DATE(hb.harvest_date) date, SUM(hsi.pieces) pieces
        FROM harvest_batches hb JOIN harvest_size_items hsi ON hsi.harvest_batch_id = hb.id
        WHERE hb.harvest_date >= UTC_DATE() - INTERVAL 6 DAY AND hb.harvest_date < UTC_DATE() + INTERVAL 1 DAY
        GROUP BY DATE(hb.harvest_date) ORDER BY date
      `),
      database.query<GradeRow[]>(`
        SELECT grade, COUNT(*) count FROM classification_history
        WHERE classified_at >= UTC_DATE() - INTERVAL 6 DAY AND classified_at < UTC_DATE() + INTERVAL 1 DAY
        GROUP BY grade
      `),
      database.query<RowDataPacket[]>(`
        SELECT it.inventory_id id, it.transaction_type type, it.pieces, it.created_at,
               hb.batch_number label
        FROM inventory_transactions it JOIN inventory i ON i.id = it.inventory_id
        JOIN harvest_batches hb ON hb.id = i.harvest_batch_id
        ORDER BY it.created_at DESC, it.id DESC LIMIT 4
      `),
      database.query<RowDataPacket[]>(`
        SELECT id, CONCAT('Sale #', id, ' · ', customer_name) label, status type,
               total_amount amount, created_at
        FROM sales ORDER BY created_at DESC, id DESC LIMIT 4
      `),
      database.query<RowDataPacket[]>(`
        SELECT id, record_number label, 'PLANTING' type, number_of_plants amount, created_at
        FROM planting_records WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 4
      `),
      database.query<RowDataPacket[]>(`
        SELECT id, CONCAT('Grade ', grade) label, 'CLASSIFICATION' type,
               confidence amount, classified_at created_at
        FROM classification_history ORDER BY classified_at DESC, id DESC LIMIT 4
      `),
    ]);
  const summary = summaryRows[0]!;
  const grades = { A: 0, B: 0, C: 0 };
  for (const row of gradeRows) grades[row.grade] = row.count;
  response.json({ data: {
    summary: {
      inventoryPieces: summary.inventory_pieces, activeBatches: summary.active_batches,
      salesToday: summary.sales_today, monthlyRevenue: summary.monthly_revenue,
      plantingGroups: summary.planting_groups, classificationsToday: summary.classifications_today,
    },
    harvestTrend: trendRows,
    classificationByGrade: grades,
    recent: {
      inventory: inventoryRows, sales: saleRows, planting: plantRows, classifications: classificationRows,
    },
  } });
};
