import type { RequestHandler } from 'express';
import { z } from 'zod';
import { getInventoryDetails } from './inventory-details.query.js';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export const inventoryDetailsController: RequestHandler = async (request, response) => {
  const { id } = paramsSchema.parse(request.params);
  response.json({ data: await getInventoryDetails(id) });
};
