import { Router } from 'express';
import { z } from 'zod';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { listUsers, createUser, updateUser } from '../services/userService.js';
import type { UserRole, UserStatus } from '../types.js';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(4),
  role: z.enum(['superadmin', 'warehouse_manager', 'store_manager']),
  location_id: z.string().min(2).nullable().optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  password: z.string().min(4).optional(),
  role: z.enum(['superadmin', 'warehouse_manager', 'store_manager']).optional(),
  location_id: z.string().min(2).nullable().optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

export const usersRouter = Router();
usersRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager']));

usersRouter.get('/', async (req, res, next) => {
  try {
    const role = String(req.query.role ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    const rows = await listUsers({
      actorRole: req.user!.role,
      actorLocationCode: req.user!.location_id,
      role: role ? (role as UserRole) : undefined,
      status: status ? (status as UserStatus) : undefined,
    });

    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

usersRouter.post('/', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'INVALID_PAYLOAD',
        message: 'Request body validation failed',
        details: parsed.error.flatten(),
      });
    }

    const created = await createUser({
      actorRole: req.user!.role,
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      role: parsed.data.role,
      locationCode: parsed.data.location_id ?? null,
      status: parsed.data.status,
    });

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'user_created',
      entityType: 'user',
      entityId: created.id,
      afterValue: {
        role: created.role,
        location_id: created.location_id,
        status: created.status,
      },
      details: `Created employee user ${created.email}`,
    });

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
});

usersRouter.patch('/:id', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'INVALID_PAYLOAD',
        message: 'Request body validation failed',
        details: parsed.error.flatten(),
      });
    }

    const updated = await updateUser({
      actorRole: req.user!.role,
      id: String(req.params.id),
      name: parsed.data.name,
      password: parsed.data.password,
      role: parsed.data.role,
      locationCode: parsed.data.location_id,
      status: parsed.data.status,
    });

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'user_updated',
      entityType: 'user',
      entityId: updated.id,
      afterValue: {
        role: updated.role,
        location_id: updated.location_id,
        status: updated.status,
      },
      details: `Updated employee user ${updated.email}`,
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});
