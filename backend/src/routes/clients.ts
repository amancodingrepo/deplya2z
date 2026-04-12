import { Router } from 'express';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { listClientStores } from '../repositories/clientStoreRepository.js';

export const clientsRouter = Router();

clientsRouter.use(authRequired, rolesAllowed(['superadmin']));

clientsRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await listClientStores();
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});
