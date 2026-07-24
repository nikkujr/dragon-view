import type { RequestHandler } from 'express';
import { z } from 'zod';
import { adjustInventory } from './adjust-inventory.command.js';

const schema = z.object({
  pieces: z.number().int().refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(255),
});
export const adjustInventoryController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const body = schema.parse(request.body);
  response.json({ data: await adjustInventory({
    inventoryId: id, ...body, adjustedBy: request.auth!.sub,
  }) });
};
