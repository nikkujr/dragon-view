import cors from 'cors';
import express from 'express';
import { authenticate } from './shared/auth.js';
import { allowedOrigins } from './shared/env.js';
import { errorHandler, notFoundHandler } from './shared/errors.js';
import { inventoryRouter } from './features/inventory/inventory.routes.js';
import { salesRouter } from './features/sales/sales.routes.js';
import { authRouter } from './features/auth/auth.routes.js';
import { plantingRouter } from './features/planting/planting.routes.js';
import { dashboardRouter } from './features/dashboard/dashboard.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin is not permitted by CORS.'));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/inventory', authenticate, inventoryRouter);
  app.use('/api/sales', authenticate, salesRouter);
  app.use('/api/planting', authenticate, plantingRouter);
  app.use('/api/dashboard', authenticate, dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
