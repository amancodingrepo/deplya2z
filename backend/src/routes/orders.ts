import { Router } from 'express';
import { z } from 'zod';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { idempotencyRequired } from '../middleware/idempotency.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { recordDispatch, recordReceipt, recordReservation } from '../services/inventoryService.js';
import { createStoreOrderDraft, getOrdersForUser, transitionOrder } from '../services/orderService.js';

const createOrderSchema = z.object({
  store_id: z.string().min(2),
  warehouse_id: z.string().min(2),
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      qty: z.number().int().positive(),
    }),
  ).min(1),
});

export const ordersRouter = Router();
ordersRouter.use(authRequired);

ordersRouter.get('/', async (req, res, next) => {
  try {
    const rows = await getOrdersForUser(req.user!.role, req.user!.location_id ?? undefined);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

ordersRouter.post('/', rolesAllowed(['store_manager']), idempotencyRequired('POST /orders'), async (req, res, next) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'INVALID_PAYLOAD',
        message: 'Request body validation failed',
        details: parsed.error.flatten(),
      });
    }

    const order = await createStoreOrderDraft({
      storeId: parsed.data.store_id,
      warehouseId: parsed.data.warehouse_id,
      items: parsed.data.items,
      createdBy: req.user!.id,
      role: req.user!.role,
      locationId: req.user!.location_id,
    });

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_created',
      entityType: 'store_order',
      entityId: order.id,
      afterValue: { status: order.status, order_id: order.order_id },
      details: 'Store manager created order draft',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });

    return res.status(201).json({ order_id: order.order_id, status: order.status, id: order.id });
  } catch (error) {
    return next(error);
  }
});

ordersRouter.patch(
  '/:id/approve',
  rolesAllowed(['superadmin']),
  idempotencyRequired('PATCH /orders/:id/approve'),
  async (req, res, next) => {
  try {
    const order = await transitionOrder({
      orderId: String(req.params.id),
      actorRole: req.user!.role,
      actorUserId: req.user!.id,
      actorLocationId: req.user!.location_id,
      target: 'confirmed',
    });

    if (!order) {
      return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    await recordReservation(order.id, req.user!.id);
    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_confirmed',
      entityType: 'store_order',
      entityId: order.id,
      afterValue: { status: order.status, order_id: order.order_id },
      details: 'Superadmin approved order and reserved stock',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });
    return res.json({ order_id: order.order_id, status: order.status });
  } catch (error) {
    return next(error);
  }
});

ordersRouter.patch(
  '/:id/pack',
  rolesAllowed(['warehouse_manager']),
  idempotencyRequired('PATCH /orders/:id/pack'),
  async (req, res, next) => {
  try {
    const order = await transitionOrder({
      orderId: String(req.params.id),
      actorRole: req.user!.role,
      actorUserId: req.user!.id,
      actorLocationId: req.user!.location_id,
      target: 'packed',
    });

    if (!order) {
      return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_packed',
      entityType: 'store_order',
      entityId: order.id,
      afterValue: { status: order.status, order_id: order.order_id },
      details: 'Warehouse packed order',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });
    return res.json({ order_id: order.order_id, status: order.status });
  } catch (error) {
    return next(error);
  }
});

ordersRouter.patch(
  '/:id/dispatch',
  rolesAllowed(['warehouse_manager']),
  idempotencyRequired('PATCH /orders/:id/dispatch'),
  async (req, res, next) => {
  try {
    const order = await transitionOrder({
      orderId: String(req.params.id),
      actorRole: req.user!.role,
      actorUserId: req.user!.id,
      actorLocationId: req.user!.location_id,
      target: 'dispatched',
    });

    if (!order) {
      return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    await recordDispatch(order.id, req.user!.id);
    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_dispatched',
      entityType: 'store_order',
      entityId: order.id,
      afterValue: { status: order.status, order_id: order.order_id },
      details: 'Warehouse dispatched order',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });
    return res.json({ order_id: order.order_id, status: order.status });
  } catch (error) {
    return next(error);
  }
});

ordersRouter.patch(
  '/:id/confirm-receive',
  rolesAllowed(['store_manager']),
  idempotencyRequired('PATCH /orders/:id/confirm-receive'),
  async (req, res, next) => {
  try {
    const order = await transitionOrder({
      orderId: String(req.params.id),
      actorRole: req.user!.role,
      actorUserId: req.user!.id,
      actorLocationId: req.user!.location_id,
      target: 'store_received',
    });

    if (!order) {
      return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    await recordReceipt(order.id, req.user!.id);
    const completed = await transitionOrder({
      orderId: String(req.params.id),
      actorRole: req.user!.role,
      actorUserId: req.user!.id,
      actorLocationId: req.user!.location_id,
      target: 'completed',
    });

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_received',
      entityType: 'store_order',
      entityId: order.id,
      afterValue: { status: 'completed', order_id: completed?.order_id ?? order.order_id },
      details: 'Store confirmed receipt and completed order',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });
    return res.json({ order_id: completed?.order_id ?? order.order_id, status: 'completed' });
  } catch (error) {
    return next(error);
  }
});
