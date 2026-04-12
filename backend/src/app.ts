import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';

import { env } from './config/env.js';
import { healthCheckDatabase } from './database/connection.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { bulkOrdersRouter } from './routes/bulkOrders.js';
import { clientsRouter } from './routes/clients.js';
import { inventoryRouter } from './routes/inventory.js';
import { locationsRouter } from './routes/locations.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';

const logger = pino({ level: env.logLevel });

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'store-warehouse-backend' });
  });

  app.get('/ready', async (_req, res) => {
    try {
      const databaseOk = await healthCheckDatabase();
      return res.status(databaseOk ? 200 : 503).json({ ok: databaseOk, database: databaseOk ? 'up' : 'down' });
    } catch {
      return res.status(503).json({ ok: false, database: 'down' });
    }
  });

  const mountApiRoutes = (prefix: string) => {
    app.use(`${prefix}/auth`, authRouter);
    app.use(`${prefix}/inventory`, inventoryRouter);
    app.use(`${prefix}/products`, productsRouter);
    app.use(`${prefix}/locations`, locationsRouter);
    app.use(`${prefix}/orders`, ordersRouter);
    app.use(`${prefix}/bulk-orders`, bulkOrdersRouter);
    app.use(`${prefix}/clients`, clientsRouter);
  };

  mountApiRoutes('/v1');
  mountApiRoutes('');

  app.use(errorHandler);

  return app;
}
