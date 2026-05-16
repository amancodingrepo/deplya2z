import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { idempotencyRequired } from '../middleware/idempotency.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { createStoreOrderDraft, transitionOrder } from '../services/orderService.js';
import { env } from '../config/env.js';

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

const cancelSchema = z.object({
  reason: z.string().min(1),
});

export const ordersRouter = Router();
ordersRouter.use(authRequired);

// GET /orders — enhanced with filters
ordersRouter.get('/', rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']), async (req, res, next) => {
  try {
    const isSuperadmin = req.user?.role === 'superadmin';
    const statusFilter = String(req.query.status ?? '').trim();
    const storeId = String(req.query.store_id ?? '').trim() || undefined;
    const warehouseId = String(req.query.warehouse_id ?? '').trim() || undefined;
    const dateFrom = String(req.query.date_from ?? '').trim() || undefined;
    const dateTo = String(req.query.date_to ?? '').trim() || undefined;
    const search = String(req.query.search ?? '').trim() || undefined;
    const sort = String(req.query.sort ?? 'created_desc').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? env.defaultPageSize)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [];
    const values: (string | number)[] = [];

    // Role-based scoping
    if (!isSuperadmin) {
      const locationId = req.user?.location_id ?? '';
      values.push(locationId);
      if (req.user?.role === 'warehouse_manager') {
        clauses.push(`(so.warehouse_id::text = $${values.length} OR so.warehouse_id = (SELECT id FROM locations WHERE location_code = $${values.length} LIMIT 1))`);
      } else {
        clauses.push(`(so.store_id::text = $${values.length} OR so.store_id = (SELECT id FROM locations WHERE location_code = $${values.length} LIMIT 1))`);
      }
    }

    if (statusFilter) {
      const statuses = statusFilter.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        const placeholders = statuses.map((_, i) => `$${values.length + i + 1}`).join(', ');
        values.push(...statuses);
        clauses.push(`so.status IN (${placeholders})`);
      }
    }

    if (storeId && isSuperadmin) {
      values.push(storeId);
      clauses.push(`(so.store_id::text = $${values.length} OR so.store_id = (SELECT id FROM locations WHERE location_code = $${values.length} LIMIT 1))`);
    }
    if (warehouseId && isSuperadmin) {
      values.push(warehouseId);
      clauses.push(`(so.warehouse_id::text = $${values.length} OR so.warehouse_id = (SELECT id FROM locations WHERE location_code = $${values.length} LIMIT 1))`);
    }
    if (dateFrom) {
      values.push(dateFrom);
      clauses.push(`so.created_at >= $${values.length}::timestamp`);
    }
    if (dateTo) {
      values.push(dateTo);
      clauses.push(`so.created_at <= $${values.length}::timestamp`);
    }
    if (search) {
      values.push(`%${search}%`);
      clauses.push(`so.order_id ILIKE $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sortMap: Record<string, string> = {
      created_desc: 'so.created_at DESC',
      created_asc: 'so.created_at ASC',
      status_asc: 'so.status ASC',
    };
    const orderBy = sortMap[sort] ?? 'so.created_at DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM store_orders so ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const rows = await pool.query(
      `SELECT so.*,
              sl.name as store_name, sl.location_code as store_code,
              wl.name as warehouse_name, wl.location_code as warehouse_code
       FROM store_orders so
       LEFT JOIN locations sl ON sl.id = so.store_id
       LEFT JOIN locations wl ON wl.id = so.warehouse_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    );

    return res.json({
      success: true,
      data: rows.rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /orders/:id — full detail with timeline
ordersRouter.get('/:id', rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await pool.query(
      `SELECT so.*,
              sl.name as store_name, sl.location_code as store_code,
              wl.name as warehouse_name, wl.location_code as warehouse_code
       FROM store_orders so
       LEFT JOIN locations sl ON sl.id = so.store_id
       LEFT JOIN locations wl ON wl.id = so.warehouse_id
       WHERE so.id::text = $1 OR so.order_id = $1
       LIMIT 1`,
      [id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    const order = result.rows[0] as { id: string; warehouse_id: string; store_id: string; [key: string]: unknown };

    // Enforce location scoping for non-superadmin
    if (req.user!.role !== 'superadmin') {
      const actorLocationId = req.user!.location_id;
      if (!actorLocationId) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'User has no assigned location' });
      }
      const locRow = await pool.query(
        `SELECT id, type FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
        [actorLocationId],
      );
      const actorLocation = locRow.rows[0];
      if (!actorLocation) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Location not found' });
      }
      if (req.user!.role === 'warehouse_manager') {
        if (actorLocation.id !== order.warehouse_id) {
          return res.status(403).json({ code: 'WAREHOUSE_SCOPE_VIOLATION', message: 'Cannot access order from another warehouse' });
        }
      } else if (req.user!.role === 'store_manager') {
        if (actorLocation.id !== order.store_id) {
          return res.status(403).json({ code: 'STORE_SCOPE_VIOLATION', message: 'Cannot access order from another store' });
        }
      }
    }

    // Get timeline from audit_logs
    const timeline = await pool.query(
      `SELECT al.*, u.name as actor_name, u.role as actor_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE al.entity_type = 'store_order' AND al.entity_id::text = $1
       ORDER BY al.created_at ASC`,
      [order.id],
    );

    return res.json({ success: true, data: { ...order, timeline: timeline.rows } });
  } catch (error) {
    return next(error);
  }
});

// POST /orders — create order draft
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

    return res.status(201).json({ success: true, data: { order_id: order.order_id, status: order.status, id: order.id } });
  } catch (error) {
    return next(error);
  }
});

ordersRouter.patch(
  '/:id/approve',
  rolesAllowed(['warehouse_manager']),
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

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_confirmed',
      entityType: 'store_order',
      entityId: order.id,
      afterValue: { status: order.status, order_id: order.order_id },
      details: 'Warehouse manager approved order and reserved stock',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });
    return res.json({ success: true, data: { order_id: order.order_id, status: order.status } });
  } catch (error) {
    return next(error);
  }
});

// PATCH /orders/:id/reject — warehouse_manager only, only from draft
ordersRouter.patch('/:id/reject', rolesAllowed(['warehouse_manager']), async (req, res, next) => {
  try {
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'reason is required', details: parsed.error.flatten() });
    }

    const id = String(req.params.id);
    const orderResult = await pool.query(
      `SELECT * FROM store_orders WHERE id::text = $1 OR order_id = $1 LIMIT 1`,
      [id],
    );

    if (!orderResult.rows[0]) {
      return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    const order = orderResult.rows[0] as { id: string; status: string; order_id: string; warehouse_id: string };
    if (order.status !== 'draft') {
      return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', message: 'Order can only be rejected from draft status' });
    }

    // Warehouse scope check
    const actorLocationId = req.user?.location_id ?? null;
    if (!actorLocationId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Manager has no assigned location' });
    }
    const locRow = await pool.query(
      `SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
      [actorLocationId],
    );
    const actorLocation = locRow.rows[0];
    if (!actorLocation || actorLocation.id !== order.warehouse_id) {
      return res.status(403).json({ code: 'WAREHOUSE_SCOPE_VIOLATION', message: 'Cannot reject order from another warehouse' });
    }

    await pool.query(
      `UPDATE store_orders SET status = 'cancelled', cancel_reason = $1, updated_at = NOW() WHERE id = $2`,
      [parsed.data.reason, order.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_rejected',
      entityType: 'store_order',
      entityId: order.id,
      beforeValue: { status: order.status },
      afterValue: { status: 'cancelled', reason: parsed.data.reason },
      details: `Warehouse manager rejected order: ${parsed.data.reason}`,
    });

    return res.json({ success: true, data: { order_id: order.order_id, status: 'cancelled' } });
  } catch (error) {
    return next(error);
  }
});

// PATCH /orders/:id/cancel — warehouse_manager or store_manager
// WH: can cancel draft/confirmed/packed from their warehouse
// Store manager: can cancel draft only from their store
ordersRouter.patch('/:id/cancel', rolesAllowed(['warehouse_manager', 'store_manager']), async (req, res, next) => {
  try {
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'reason is required', details: parsed.error.flatten() });
    }

    const id = String(req.params.id);
    const orderResult = await pool.query(
      `SELECT so.*, (
         SELECT json_agg(row_to_json(oi)) FROM order_items oi WHERE oi.order_id = so.id
       ) as order_items_detail FROM store_orders so WHERE so.id::text = $1 OR so.order_id = $1 LIMIT 1`,
      [id],
    );

    if (!orderResult.rows[0]) {
      return res.status(404).json({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    const order = orderResult.rows[0] as {
      id: string; status: string; order_id: string;
      warehouse_id: string; store_id: string;
      items: Array<{ product_id: string; qty: number }>;
    };

    const actorRole = req.user!.role;
    const actorLocationId = req.user!.location_id ?? null;
    if (!actorLocationId) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Manager has no assigned location' });
    }
    const locRow = await pool.query(
      `SELECT id, type FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
      [actorLocationId],
    );
    const actorLocation = locRow.rows[0];
    if (!actorLocation) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Location not found' });
    }

    if (actorRole === 'store_manager') {
      // Store managers can only cancel draft orders from their own store
      if (order.status !== 'draft') {
        return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', message: 'Store managers can only cancel draft orders' });
      }
      if (actorLocation.id !== order.store_id) {
        return res.status(403).json({ code: 'STORE_SCOPE_VIOLATION', message: 'Cannot cancel order from another store' });
      }
    } else if (actorRole === 'warehouse_manager') {
      // Warehouse managers can cancel draft/confirmed/packed from their warehouse
      const cancellableStatuses = ['draft', 'confirmed', 'packed'];
      if (!cancellableStatuses.includes(order.status)) {
        return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', message: `Cannot cancel order with status: ${order.status}` });
      }
      if (actorLocation.id !== order.warehouse_id) {
        return res.status(403).json({ code: 'WAREHOUSE_SCOPE_VIOLATION', message: 'Cannot cancel order from another warehouse' });
      }
    } else {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Invalid role for cancellation' });
    }

    await pool.query(
      `UPDATE store_orders SET status = 'cancelled', cancel_reason = $1, updated_at = NOW() WHERE id = $2`,
      [parsed.data.reason, order.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_cancelled',
      entityType: 'store_order',
      entityId: order.id,
      beforeValue: { status: order.status },
      afterValue: { status: 'cancelled', reason: parsed.data.reason },
      details: `${actorRole === 'warehouse_manager' ? 'Warehouse manager' : 'Store manager'} cancelled order: ${parsed.data.reason}`,
    });

    return res.json({ success: true, data: { order_id: order.order_id, status: 'cancelled' } });
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
      details: 'Warehouse manager packed order',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });
    return res.json({ success: true, data: { order_id: order.order_id, status: order.status } });
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

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'store_order_dispatched',
      entityType: 'store_order',
      entityId: order.id,
      afterValue: { status: order.status, order_id: order.order_id },
      details: 'Warehouse manager dispatched order',
      requestId: req.header('Idempotency-Key') ?? undefined,
    });
    return res.json({ success: true, data: { order_id: order.order_id, status: order.status } });
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
    return res.json({ success: true, data: { order_id: completed?.order_id ?? order.order_id, status: 'completed' } });
  } catch (error) {
    return next(error);
  }
});
