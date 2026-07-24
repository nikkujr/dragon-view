import type { RequestHandler } from 'express';
import { z } from 'zod';
import { regradeInventory } from './regrade-inventory.command.js';

const schema = z.object({
  targetGrade: z.enum(['B', 'C']),
  pieces: z.number().int().positive(),
  reason: z.string().trim().min(3).max(255),
});
export const regradeInventoryController: RequestHandler = async (request, response) => {
  const id = z.coerce.number().int().positive().parse(request.params.id);
  const body = schema.parse(request.body);
  response.json({ data: await regradeInventory({
    inventoryId: id, ...body, regradedBy: request.auth!.sub,
  }) });
};
