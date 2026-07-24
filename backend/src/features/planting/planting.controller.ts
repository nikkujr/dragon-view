import type { RequestHandler } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { database } from '../../shared/database.js';
import { AppError } from '../../shared/errors.js';
import { calculateLifecycle, normalizeDateOnly } from './planting.lifecycle.js';

interface PlantRow extends RowDataPacket {
  id: number; record_number: string; grafting_date: string | Date; variety: string;
  location: string; number_of_plants: number; created_at: Date;
}
interface MonitoringRow extends RowDataPacket {
  id: number; notes: string | null; recorded_at: Date; recorded_by_name: string;
}
const fields = z.object({
  recordNumber: z.string().trim().min(1).max(40),
  graftingDate: z.string().date().refine((date) => date <= new Date().toISOString().slice(0, 10), 'Future grafting dates are not allowed.'),
  variety: z.string().trim().min(1).max(100),
  location: z.string().trim().min(1).max(150),
  numberOfPlants: z.number().int().positive(),
});
const mapPlant = (row: PlantRow) => ({
  id: row.id, recordNumber: row.record_number, graftingDate: normalizeDateOnly(row.grafting_date),
  variety: row.variety, location: row.location, numberOfPlants: row.number_of_plants,
  ...calculateLifecycle(row.grafting_date),
});

export const listPlantingController: RequestHandler = async (_request, response) => {
  const [rows] = await database.query<PlantRow[]>(
    `SELECT id, record_number, grafting_date, variety, location, number_of_plants, created_at
     FROM planting_records WHERE deleted_at IS NULL ORDER BY grafting_date, id`,
  );
  response.json({ data: rows.map(mapPlant) });
};
export const createPlantingController: RequestHandler = async (request, response) => {
  const item = fields.parse(request.body);
  const [result] = await database.execute<ResultSetHeader>(
    `INSERT INTO planting_records
     (record_number, grafting_date, variety, location, number_of_plants, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.recordNumber, item.graftingDate, item.variety, item.location, item.numberOfPlants, request.auth!.sub],
  );
  response.status(201).json({ data: { id: result.insertId, ...item, ...calculateLifecycle(item.graftingDate) } });
};
export const plantingDetailsController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const [rows] = await database.execute<PlantRow[]>(
    `SELECT id, record_number, grafting_date, variety, location, number_of_plants, created_at
     FROM planting_records WHERE id = ? AND deleted_at IS NULL`, [id],
  );
  if (!rows[0]) throw new AppError(404, 'Planting group not found.', 'PLANTING_NOT_FOUND');
  const [monitoring] = await database.execute<MonitoringRow[]>(
    `SELECT pm.id, pm.notes, pm.recorded_at, u.display_name recorded_by_name
     FROM plant_monitoring pm JOIN users u ON u.id = pm.recorded_by
     WHERE pm.planting_record_id = ? ORDER BY pm.recorded_at DESC, pm.id DESC`, [id],
  );
  response.json({ data: { ...mapPlant(rows[0]), monitoring: monitoring.map((entry) => ({
    id: entry.id, notes: entry.notes, recordedAt: entry.recorded_at, recordedBy: entry.recorded_by_name,
  })) } });
};
export const updatePlantingController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const item = fields.omit({ recordNumber: true }).parse(request.body);
  const [result] = await database.execute<ResultSetHeader>(
    `UPDATE planting_records SET grafting_date = ?, variety = ?, location = ?, number_of_plants = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [item.graftingDate, item.variety, item.location, item.numberOfPlants, id],
  );
  if (!result.affectedRows) throw new AppError(404, 'Planting group not found.', 'PLANTING_NOT_FOUND');
  response.json({ data: { id, ...item, ...calculateLifecycle(item.graftingDate) } });
};
export const deletePlantingController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const { reason } = z.object({ reason: z.string().trim().min(3).max(255) }).parse(request.body);
  const [result] = await database.execute<ResultSetHeader>(
    `UPDATE planting_records SET deleted_at = UTC_TIMESTAMP(), deletion_reason = ?, deleted_by = ?
     WHERE id = ? AND deleted_at IS NULL`, [reason, request.auth!.sub, id],
  );
  if (!result.affectedRows) throw new AppError(404, 'Planting group not found.', 'PLANTING_NOT_FOUND');
  response.json({ data: { id, deleted: true } });
};
export const addMonitoringController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const { notes } = z.object({ notes: z.string().trim().min(1).max(500) }).parse(request.body);
  const [exists] = await database.execute<RowDataPacket[]>(
    'SELECT id FROM planting_records WHERE id = ? AND deleted_at IS NULL', [id],
  );
  if (!exists[0]) throw new AppError(404, 'Planting group not found.', 'PLANTING_NOT_FOUND');
  const [result] = await database.execute<ResultSetHeader>(
    'INSERT INTO plant_monitoring (planting_record_id, notes, recorded_by) VALUES (?, ?, ?)',
    [id, notes, request.auth!.sub],
  );
  response.status(201).json({ data: { id: result.insertId, notes } });
};
