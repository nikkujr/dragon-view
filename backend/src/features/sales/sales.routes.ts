import { Router } from 'express';
import { requireRole } from '../../shared/auth.js';
import { completeSaleController } from './complete-sale/complete-sale.controller.js';
import { configurePriceController, listPricesController } from './prices/prices.controller.js';
import { salesHistoryController } from './sales-history/sales-history.controller.js';
import { createDraftSaleController } from './draft-sale/draft-sale.controller.js';
import { cancelSaleController } from './cancel-sale/cancel-sale.controller.js';
import { saleDetailsController } from './sale-details/sale-details.controller.js';
import { updateDraftController } from './update-draft/update-draft.controller.js';
import { completeDraftController } from './complete-draft/complete-draft.controller.js';
import { salesAnalyticsController } from './analytics/sales-analytics.controller.js';

export const salesRouter = Router();

salesRouter.get('/', salesHistoryController);
salesRouter.get('/prices', listPricesController);
salesRouter.get('/analytics', requireRole('OWNER_ADMIN'), salesAnalyticsController);
salesRouter.post('/prices', requireRole('OWNER_ADMIN'), configurePriceController);
salesRouter.post('/drafts', requireRole('OWNER_ADMIN', 'STAFF_FARMER'), createDraftSaleController);
salesRouter.get('/:id', saleDetailsController);
salesRouter.put('/:id', requireRole('OWNER_ADMIN'), updateDraftController);
salesRouter.post('/:id/complete', requireRole('OWNER_ADMIN', 'STAFF_FARMER'), completeDraftController);
salesRouter.post('/:id/cancel', requireRole('OWNER_ADMIN'), cancelSaleController);
salesRouter.post(
  '/complete',
  requireRole('OWNER_ADMIN', 'STAFF_FARMER'),
  completeSaleController,
);
