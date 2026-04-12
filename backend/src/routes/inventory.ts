import { Router } from 'express';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { getInventoryForLocation, getLowStockForLocation, getStockMovements } from '../services/inventoryService.js';

export const inventoryRouter = Router();

inventoryRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']));

inventoryRouter.get('/', async (req, res) => {
  const locationId = String(req.query.location_id ?? '').trim();
  const productId = String(req.query.product_id ?? '').trim();

  const rows = await getInventoryForLocation(req.user?.role === 'superadmin' ? locationId : req.user?.location_id ?? undefined, productId || undefined);
  return res.json(rows);
});

inventoryRouter.get('/low-stock', async (req, res) => {
  const threshold = Number(req.query.threshold ?? 3);
  const location = req.user?.role === 'superadmin' ? String(req.query.location_id ?? '') : req.user?.location_id;
  const rows = await getLowStockForLocation(location || undefined, threshold);
  return res.json(rows);
});

inventoryRouter.get('/movements', async (req, res) => {
  const rows = await getStockMovements({
    actorRole: req.user!.role,
    actorLocationCode: req.user!.location_id,
    locationId: String(req.query.location_id ?? '').trim() || undefined,
    productId: String(req.query.product_id ?? '').trim() || undefined,
    dateFrom: String(req.query.date_from ?? '').trim() || undefined,
    dateTo: String(req.query.date_to ?? '').trim() || undefined,
  });
  return res.json(rows);
});
