import type { RequestHandler } from 'express';
import { z } from 'zod';
import { completeDraft } from './complete-draft.command.js';

const schema = z.object({
  method: z.enum(['CASH', 'GCASH', 'MAYA', 'OTHER_E_WALLET', 'BANK_TRANSFER']),
  amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reference: z.string().trim().min(1).max(100).optional(),
  otherEWalletProvider: z.string().trim().min(1).max(80).optional(),
}).superRefine((payment, context) => {
  if (payment.method !== 'CASH' && !payment.reference) {
    context.addIssue({ code: 'custom', path: ['reference'], message: 'A payment reference is required.' });
  }
  if (payment.method === 'OTHER_E_WALLET' && !payment.otherEWalletProvider) {
    context.addIssue({ code: 'custom', path: ['otherEWalletProvider'], message: 'The e-wallet provider is required.' });
  }
});

export const completeDraftController: RequestHandler = async (request, response) => {
  const saleId = z.coerce.number().int().positive().parse(request.params.id);
  const payment = schema.parse(request.body);
  response.json({ data: await completeDraft({ saleId, payment, completedBy: request.auth!.sub }) });
};
