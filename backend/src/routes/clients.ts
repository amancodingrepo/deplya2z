import { Router } from 'express';
import { z } from 'zod';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import {
  createClientStore,
  deleteClientStore,
  findClientStoreById,
  listClientStores,
  updateClientStore,
} from '../repositories/clientStoreRepository.js';

export const clientsRouter = Router();
clientsRouter.use(authRequired, rolesAllowed(['superadmin']));

const clientSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  gst_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

// GET /clients
clientsRouter.get('/', async (_req, res, next) => {
  try {
    return res.json(await listClientStores());
  } catch (err) {
    return next(err);
  }
});

// POST /clients
clientsRouter.post('/', async (req, res, next) => {
  try {
    const body = clientSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
    }
    const client = await createClientStore(body.data);
    return res.status(201).json(client);
  } catch (err) {
    return next(err);
  }
});

// GET /clients/:id
clientsRouter.get('/:id', async (req, res, next) => {
  try {
    const client = await findClientStoreById(req.params.id);
    if (!client) return res.status(404).json({ code: 'NOT_FOUND', message: 'Client not found' });
    return res.json(client);
  } catch (err) {
    return next(err);
  }
});

const updateClientSchema = clientSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'blocked']),
});

// PATCH /clients/:id
clientsRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = updateClientSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
    }
    const client = await updateClientStore(req.params.id, body.data);
    if (!client) return res.status(404).json({ code: 'NOT_FOUND', message: 'Client not found' });
    return res.json(client);
  } catch (err) {
    return next(err);
  }
});

// PATCH /clients/:id/status
clientsRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const body = updateStatusSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
    }
    const client = await updateClientStore(req.params.id, { status: body.data.status });
    if (!client) return res.status(404).json({ code: 'NOT_FOUND', message: 'Client not found' });
    return res.json(client);
  } catch (err) {
    return next(err);
  }
});

// DELETE /clients/:id
clientsRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteClientStore(req.params.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});
