import type { RequestHandler } from 'express';
import { z } from 'zod';
import { completeSale } from './complete-sale.command.js';

const money = z.string().regex(/^\d+(\.\d{1,2})?$/);

const commandSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(255),
    contactNumber: z.string().trim().min(7).max(30),
    emailAddress: z.string().email(),
  }),
  items: z.array(
    z.object({
      size: z.enum(['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'JUMBO']),
      grade: z.enum(['A', 'B', 'C']),
      pieces: z.number().int().positive(),
      totalWeightKilograms: z.string().regex(/^\d+(\.\d{1,3})?$/),
    }),
  ).min(1),
  payment: z.object({
    method: z.enum(['CASH', 'GCASH', 'MAYA', 'OTHER_E_WALLET', 'BANK_TRANSFER']),
    amountPaid: money,
    reference: z.string().trim().min(1).max(100).optional(),
    otherEWalletProvider: z.string().trim().min(1).max(80).optional(),
  }).superRefine((payment, context) => {
    if (payment.method !== 'CASH' && !payment.reference) {
      context.addIssue({
        code: 'custom',
        path: ['reference'],
        message: 'A payment reference is required for non-cash payments.',
      });
    }
    if (payment.method === 'OTHER_E_WALLET' && !payment.otherEWalletProvider) {
      context.addIssue({
        code: 'custom',
        path: ['otherEWalletProvider'],
        message: 'The e-wallet provider is required.',
      });
    }
  }),
});

export const completeSaleController: RequestHandler = async (request, response) => {
  const command = commandSchema.parse(request.body);
  const result = await completeSale({
    ...command,
    completedBy: request.auth!.sub,
  });
  response.status(201).json({ data: result });
};
