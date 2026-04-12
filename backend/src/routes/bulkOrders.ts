import { Router } from 'express';
import { z } from 'zod';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { idempotencyRequired } from '../middleware/idempotency.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { recordBulkDispatchAndComplete, recordBulkReservation } from '../services/inventoryService.js';
import { createBulkOrderConfirmed, getBulkOrdersForUser, transitionBulkOrder } from '../services/bulkOrderService.js';

const createBulkOrderSchema = z.object({
  client_store_id: z.string().uuid(),
  warehouse_id: z.string().min(2),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const bulkOrdersRouter = Router();
bulkOrdersRouter.use(authRequired);

bulkOrdersRouter.get('/', rolesAllowed(['superadmin', 'warehouse_manager']), async (req, res, next) => {
  try {
    const rows = await getBulkOrdersForUser(req.user!.role, req.user!.location_id ?? undefined);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

bulkOrdersRouter.post(
  '/',
  rolesAllowed(['superadmin']),
  idempotencyRequired('POST /bulk-orders'),
  async (req, res, next) => {
    try {
      const parsed = createBulkOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          code: 'INVALID_PAYLOAD',
          message: 'Request body validation failed',
          details: parsed.error.flatten(),
        });
      }

      const order = await createBulkOrderConfirmed({
        clientStoreId: parsed.data.client_store_id,
        warehouseId: parsed.data.warehouse_id,
        items: parsed.data.items,
        createdBy: req.user!.id,
        role: req.user!.role,
      });

      await recordBulkReservation(order.id, req.user!.id);
      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'bulk_order_created',
        entityType: 'bulk_order',
        entityId: order.id,
        afterValue: { status: order.status, order_id: order.order_id },
        details: 'Superadmin created and auto-confirmed bulk order',
        requestId: req.header('Idempotency-Key') ?? undefined,
      });

      return res.status(201).json({ id: order.id, order_id: order.order_id, status: order.status });
    } catch (error) {
      return next(error);
    }
  },
);

bulkOrdersRouter.patch(
  '/:id/pack',
  rolesAllowed(['warehouse_manager']),
  idempotencyRequired('PATCH /bulk-orders/:id/pack'),
  async (req, res, next) => {
    try {
      const order = await transitionBulkOrder({
        bulkOrderId: String(req.params.id),
        actorRole: req.user!.role,
        actorLocationId: req.user!.location_id,
        target: 'packed',
      });
      if (!order) {
        return res.status(404).json({ code: 'BULK_ORDER_NOT_FOUND', message: 'Bulk order not found' });
      }

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'bulk_order_packed',
        entityType: 'bulk_order',
        entityId: order.id,
        afterValue: { status: order.status, order_id: order.order_id },
        details: 'Warehouse packed bulk order',
        requestId: req.header('Idempotency-Key') ?? undefined,
      });

      return res.json({ id: order.id, order_id: order.order_id, status: order.status });
    } catch (error) {
      return next(error);
    }
  },
);

bulkOrdersRouter.patch(
  '/:id/dispatch',
  rolesAllowed(['warehouse_manager']),
  idempotencyRequired('PATCH /bulk-orders/:id/dispatch'),
  async (req, res, next) => {
    try {
      const dispatched = await transitionBulkOrder({
        bulkOrderId: String(req.params.id),
        actorRole: req.user!.role,
        actorLocationId: req.user!.location_id,
        target: 'dispatched',
      });
      if (!dispatched) {
        return res.status(404).json({ code: 'BULK_ORDER_NOT_FOUND', message: 'Bulk order not found' });
      }

      const completed = await recordBulkDispatchAndComplete(dispatched.id, req.user!.id);

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'bulk_order_dispatched',
        entityType: 'bulk_order',
        entityId: dispatched.id,
        afterValue: { status: completed?.status ?? 'completed', order_id: dispatched.order_id },
        details: 'Warehouse dispatched and completed bulk order',
        requestId: req.header('Idempotency-Key') ?? undefined,
      });

      return res.json({
        id: completed?.id ?? dispatched.id,
        order_id: completed?.order_id ?? dispatched.order_id,
        status: completed?.status ?? 'completed',
      });
    } catch (error) {
      return next(error);
    }
  },
);
