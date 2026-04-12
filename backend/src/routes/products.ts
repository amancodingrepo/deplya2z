import { Router } from 'express';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { listProducts } from '../repositories/productRepository.js';

export const productsRouter = Router();

productsRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']));

productsRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const status = String(req.query.status ?? '').trim();
  const rows = await listProducts({ q, status });
  return res.json(rows);
});
