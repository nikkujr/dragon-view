import type { RequestHandler } from 'express';
import { z } from 'zod';
import { registerHarvest } from './register-harvest.command.js';

const commandSchema = z.object({
  batchNumber: z.string().trim().min(1).max(40),
  harvestDate: z.string().date(),
  items: z.array(
    z.object({
      size: z.enum(['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO']),
      grade: z.enum(['A', 'B', 'C']),
      pieces: z.number().int().positive(),
    }),
  ).min(1),
});

export const registerHarvestController: RequestHandler = async (request, response) => {
  const command = commandSchema.parse(request.body);
  const result = await registerHarvest({
    ...command,
    recordedBy: request.auth!.sub,
  });
  response.status(201).json({ data: result });
};
