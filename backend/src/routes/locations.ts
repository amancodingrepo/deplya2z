import { Router } from 'express';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { listLocations } from '../repositories/locationRepository.js';

export const locationsRouter = Router();

locationsRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']));

locationsRouter.get('/', async (req, res) => {
  const type = String(req.query.type ?? '').trim();
  const rows = await listLocations({ type: type || undefined });
  return res.json(rows);
});
