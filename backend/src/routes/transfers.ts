import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { env } from '../config/env.js';

export const transfersRouter = Router();

transfersRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']));

// GET /transfers
transfersRouter.get('/', async (req, res, next) => {
  try {
    const isSuperadmin = req.user?.role === 'superadmin';
    const statusFilter = String(req.query.status ?? '').trim() || undefined;
    const locationId = isSuperadmin
      ? (String(req.query.location_id ?? '').trim() || undefined)
      : (req.user?.location_id ?? undefined);
    const dateFrom = String(req.query.date_from ?? '').trim() || undefined;
    const dateTo = String(req.query.date_to ?? '').trim() || undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? env.defaultPageSize)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [];
    const values: (string | number)[] = [];

    if (locationId) {
      values.push(locationId);
      clauses.push(
        `(tr.from_location_id::text = $${values.length}
          OR tr.to_location_id::text = $${values.length}
          OR fl.location_code = $${values.length}
          OR tl.location_code = $${values.length})`,
      );
    }
    if (statusFilter) {
      values.push(statusFilter);
      clauses.push(`tr.status = $${values.length}`);
    }
    if (dateFrom) {
      values.push(dateFrom);
      clauses.push(`tr.created_at >= $${values.length}::timestamp`);
    }
    if (dateTo) {
      values.push(dateTo);
      clauses.push(`tr.created_at <= $${values.length}::timestamp`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM transfer_requests tr
       LEFT JOIN locations fl ON fl.id = tr.from_location_id
       LEFT JOIN locations tl ON tl.id = tr.to_location_id
       ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const rows = await pool.query(
      `SELECT
         tr.*,
         p.sku, p.title as product_title,
         fl.name as from_location_name, fl.location_code as from_location_code,
         tl.name as to_location_name, tl.location_code as to_location_code
       FROM transfer_requests tr
       JOIN products p ON p.id = tr.product_id
       LEFT JOIN locations fl ON fl.id = tr.from_location_id
       LEFT JOIN locations tl ON tl.id = tr.to_location_id
       ${where}
       ORDER BY tr.created_at DESC
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

const createTransferSchema = z.object({
  product_id: z.string().uuid(),
  to_location_id: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

// POST /transfers — warehouse_manager only
transfersRouter.post('/', rolesAllowed(['warehouse_manager']), async (req, res, next) => {
  try {
    const parsed = createTransferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Validation failed', details: parsed.error.flatten() });
    }

    const { product_id, to_location_id, quantity, notes } = parsed.data;
    const fromLocationId = req.user!.location_id;
    if (!fromLocationId) {
      return res.status(400).json({ code: 'NO_LOCATION', message: 'User has no location assigned' });
    }

    // Resolve from location
    const fromLocResult = await pool.query(
      `SELECT id FROM locations WHERE id::text = $1 OR location_code = $1 LIMIT 1`,
      [fromLocationId],
    );
    if (!fromLocResult.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'From location not found' });
    }

    // Resolve to location
    const toLocResult = await pool.query(
      `SELECT id FROM locations WHERE id::text = $1 OR location_code = $1 LIMIT 1`,
      [to_location_id],
    );
    if (!toLocResult.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'To location not found' });
    }

    const fromId = fromLocResult.rows[0].id as string;
    const toId = toLocResult.rows[0].id as string;

    const result = await pool.query(
      `INSERT INTO transfer_requests (product_id, from_location_id, to_location_id, quantity, status, notes, created_by)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       RETURNING *`,
      [product_id, fromId, toId, quantity, notes ?? null, req.user!.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'transfer_created',
      entityType: 'transfer_request',
      entityId: result.rows[0].id,
      afterValue: { product_id, quantity, status: 'pending' },
      details: `Transfer request created for ${quantity} units`,
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// PATCH /transfers/:id/transit — warehouse_manager
transfersRouter.patch('/:id/transit', rolesAllowed(['warehouse_manager']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await pool.query(
      `SELECT * FROM transfer_requests WHERE id::text = $1 LIMIT 1`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }
    const transfer = result.rows[0] as { id: string; status: string; quantity: number; product_id: string; from_location_id: string };

    if (transfer.status !== 'pending') {
      return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', message: 'Transfer must be pending to transit' });
    }

    // Deduct from source inventory
    await pool.query(
      `UPDATE inventory
       SET total_stock = GREATEST(0, total_stock - $1), updated_at = NOW()
       WHERE product_id = $2 AND location_id = $3`,
      [transfer.quantity, transfer.product_id, transfer.from_location_id],
    );

    const updated = await pool.query(
      `UPDATE transfer_requests SET status = 'in_transit', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [transfer.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'transfer_in_transit',
      entityType: 'transfer_request',
      entityId: transfer.id,
      afterValue: { status: 'in_transit' },
      details: 'Transfer marked in transit',
    });

    return res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// PATCH /transfers/:id/complete — store_manager
transfersRouter.patch('/:id/complete', rolesAllowed(['store_manager']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await pool.query(
      `SELECT * FROM transfer_requests WHERE id::text = $1 LIMIT 1`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }
    const transfer = result.rows[0] as { id: string; status: string; quantity: number; product_id: string; to_location_id: string };

    if (transfer.status !== 'in_transit') {
      return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', message: 'Transfer must be in_transit to complete' });
    }

    // UPSERT to destination inventory
    await pool.query(
      `INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET total_stock = inventory.total_stock + $3, updated_at = NOW()`,
      [transfer.product_id, transfer.to_location_id, transfer.quantity],
    );

    const updated = await pool.query(
      `UPDATE transfer_requests SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [transfer.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'transfer_completed',
      entityType: 'transfer_request',
      entityId: transfer.id,
      afterValue: { status: 'completed' },
      details: 'Transfer completed and inventory updated',
    });

    return res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// PATCH /transfers/:id/reject — warehouse_manager
transfersRouter.patch('/:id/reject', rolesAllowed(['warehouse_manager']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await pool.query(
      `SELECT * FROM transfer_requests WHERE id::text = $1 LIMIT 1`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Transfer not found' });
    }
    const transfer = result.rows[0] as { id: string; status: string; quantity: number; product_id: string; from_location_id: string };

    if (!['pending', 'in_transit'].includes(transfer.status)) {
      return res.status(409).json({ code: 'INVALID_STATUS_TRANSITION', message: 'Transfer cannot be rejected in current status' });
    }

    // If in_transit, return stock to source
    if (transfer.status === 'in_transit') {
      await pool.query(
        `UPDATE inventory SET total_stock = total_stock + $1, updated_at = NOW()
         WHERE product_id = $2 AND location_id = $3`,
        [transfer.quantity, transfer.product_id, transfer.from_location_id],
      );
    }

    const updated = await pool.query(
      `UPDATE transfer_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [transfer.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'transfer_rejected',
      entityType: 'transfer_request',
      entityId: transfer.id,
      afterValue: { status: 'rejected' },
      details: 'Transfer rejected',
    });

    return res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    return next(error);
  }
});
