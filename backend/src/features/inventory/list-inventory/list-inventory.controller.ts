import type { RequestHandler } from 'express';
import { z } from 'zod';
import { listInventory } from './list-inventory.query.js';

const querySchema = z.object({
  grade: z.enum(['A', 'B', 'C']).optional(),
  search: z.string().trim().max(100).optional(),
});

export const listInventoryController: RequestHandler = async (request, response) => {
  const query = querySchema.parse(request.query);
  response.json({ data: await listInventory(query) });
};
