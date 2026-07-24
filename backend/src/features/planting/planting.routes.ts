import { Router } from 'express';
import { requireRole } from '../../shared/auth.js';
import {
  addMonitoringController, createPlantingController, deletePlantingController,
  listPlantingController, plantingDetailsController, updatePlantingController,
} from './planting.controller.js';

export const plantingRouter = Router();
plantingRouter.get('/', listPlantingController);
plantingRouter.post('/', requireRole('OWNER_ADMIN', 'STAFF_FARMER'), createPlantingController);
plantingRouter.get('/:id', plantingDetailsController);
plantingRouter.put('/:id', requireRole('OWNER_ADMIN'), updatePlantingController);
plantingRouter.delete('/:id', requireRole('OWNER_ADMIN'), deletePlantingController);
plantingRouter.post('/:id/monitoring', requireRole('OWNER_ADMIN', 'STAFF_FARMER'), addMonitoringController);
