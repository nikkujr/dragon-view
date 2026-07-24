import { Router } from 'express';
import { requireRole } from '../../shared/auth.js';
import { listInventoryController } from './list-inventory/list-inventory.controller.js';
import { registerHarvestController } from './register-harvest/register-harvest.controller.js';
import { inventoryDetailsController } from './inventory-details/inventory-details.controller.js';
import { adjustInventoryController } from './adjust-inventory/adjust-inventory.controller.js';
import { regradeInventoryController } from './regrade-inventory/regrade-inventory.controller.js';

export const inventoryRouter = Router();

inventoryRouter.get('/', listInventoryController);
inventoryRouter.get('/:id', inventoryDetailsController);
inventoryRouter.post('/:id/adjustments', requireRole('OWNER_ADMIN'), adjustInventoryController);
inventoryRouter.post('/:id/regrade', requireRole('OWNER_ADMIN'), regradeInventoryController);
inventoryRouter.post(
  '/harvests',
  requireRole('OWNER_ADMIN', 'STAFF_FARMER'),
  registerHarvestController,
);
