import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { env } from '../config/env.js';

export const inventoryRouter = Router();

inventoryRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']));

// GET /inventory — enhanced with pagination and filters
inventoryRouter.get('/', async (req, res, next) => {
  try {
    const isSuperadmin = req.user?.role === 'superadmin';
    const locationId = isSuperadmin
      ? (String(req.query.location_id ?? '').trim() || undefined)
      : (req.user?.location_id ?? undefined);
    const productId = String(req.query.product_id ?? '').trim() || undefined;
    const status = String(req.query.status ?? '').trim() || undefined; // in_stock|low_stock|out_of_stock|all
    const search = String(req.query.search ?? '').trim() || undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? env.defaultPageSize)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [];
    const values: (string | number)[] = [];

    if (locationId) {
      values.push(locationId);
      clauses.push(`(i.location_id::text = $${values.length} OR l.location_code = $${values.length})`);
    }
    if (productId) {
      values.push(productId);
      clauses.push(`i.product_id::text = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      values.push(`%${search}%`);
      clauses.push(`(p.title ILIKE $${values.length - 1} OR p.sku ILIKE $${values.length})`);
    }
    if (status && status !== 'all') {
      const threshold = env.defaultLowStockThreshold;
      if (status === 'out_of_stock') {
        clauses.push(`(i.total_stock - i.reserved_stock) = 0`);
      } else if (status === 'low_stock') {
        values.push(threshold);
        clauses.push(`(i.total_stock - i.reserved_stock) > 0 AND (i.total_stock - i.reserved_stock) <= $${values.length}`);
      } else if (status === 'in_stock') {
        values.push(threshold);
        clauses.push(`(i.total_stock - i.reserved_stock) > $${values.length}`);
      }
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN locations l ON l.id = i.location_id
       ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const rows = await pool.query(
      `SELECT
         i.id,
         i.product_id,
         p.sku,
         p.title,
         p.brand,
         p.status as product_status,
         p.low_stock_threshold,
         i.location_id,
         l.name as location_name,
         l.location_code,
         l.type as location_type,
         i.total_stock,
         i.reserved_stock,
         i.issued_stock,
         (i.total_stock - i.reserved_stock) as available_stock,
         i.updated_at
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN locations l ON l.id = i.location_id
       ${where}
       ORDER BY p.title ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    );

    // Summary stats
    const summaryResult = await pool.query(
      `SELECT
         COUNT(*) as total_products,
         SUM(i.total_stock) as total_units,
         SUM(i.reserved_stock) as reserved_units,
         SUM(i.total_stock - i.reserved_stock) as available_units,
         COUNT(CASE WHEN (i.total_stock - i.reserved_stock) = 0 THEN 1 END) as out_of_stock,
         COUNT(CASE WHEN (i.total_stock - i.reserved_stock) > 0 AND (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1) THEN 1 END) as low_stock,
         COUNT(CASE WHEN (i.total_stock - i.reserved_stock) > COALESCE(p.low_stock_threshold, $1) THEN 1 END) as in_stock
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN locations l ON l.id = i.location_id
       ${where}`,
      values.slice(0, values.length - 2).concat([env.defaultLowStockThreshold]),
    );

    return res.json({
      success: true,
      data: rows.rows,
      summary: summaryResult.rows[0],
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /inventory/by-location — superadmin only
inventoryRouter.get('/by-location', rolesAllowed(['superadmin']), async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         l.id,
         l.name,
         l.location_code,
         l.type,
         l.status,
         COUNT(DISTINCT i.product_id) as product_count,
         COALESCE(SUM(i.total_stock), 0) as total_units,
         COALESCE(SUM(i.reserved_stock), 0) as reserved_units,
         COALESCE(SUM(i.total_stock - i.reserved_stock), 0) as available_units,
         COUNT(CASE WHEN (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, 10) AND i.total_stock > 0 THEN 1 END) as low_stock_count,
         COUNT(CASE WHEN i.total_stock = 0 THEN 1 END) as out_of_stock_count
       FROM locations l
       LEFT JOIN inventory i ON i.location_id = l.id
       LEFT JOIN products p ON p.id = i.product_id
       GROUP BY l.id, l.name, l.location_code, l.type, l.status
       ORDER BY l.type, l.name`,
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
});

// GET /inventory/cross-location — superadmin only
inventoryRouter.get('/cross-location', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const values: (string | number)[] = [];
    let whereClause = `WHERE p.deleted_at IS NULL`;
    if (search) {
      values.push(`%${search}%`);
      values.push(`%${search}%`);
      whereClause += ` AND (p.title ILIKE $${values.length - 1} OR p.sku ILIKE $${values.length})`;
    }

    // Get all locations
    const locResult = await pool.query(`SELECT id, name, location_code, type FROM locations ORDER BY type, name`);
    const locations = locResult.rows;

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    values.push(limit, offset);
    const productRows = await pool.query(
      `SELECT p.id, p.sku, p.title, p.brand, p.status FROM products p ${whereClause}
       ORDER BY p.title ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    const productIds = productRows.rows.map((r: { id: string }) => r.id);
    let stockMap: Record<string, Record<string, number>> = {};

    if (productIds.length > 0) {
      const stockResult = await pool.query(
        `SELECT product_id, location_id, (total_stock - reserved_stock) as available_stock
         FROM inventory WHERE product_id = ANY($1::uuid[])`,
        [productIds],
      );
      for (const row of stockResult.rows) {
        if (!stockMap[row.product_id]) stockMap[row.product_id] = {};
        stockMap[row.product_id][row.location_id] = Number(row.available_stock);
      }
    }

    const data = productRows.rows.map((product: { id: string; sku: string; title: string; brand: string; status: string }) => {
      const stockByLocation: Record<string, number> = {};
      for (const loc of locations) {
        stockByLocation[loc.location_code] = stockMap[product.id]?.[loc.id] ?? 0;
      }
      return { ...product, stock_by_location: stockByLocation };
    });

    return res.json({
      success: true,
      data,
      locations,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /inventory/low-stock
inventoryRouter.get('/low-stock', async (req, res, next) => {
  try {
    const isSuperadmin = req.user?.role === 'superadmin';
    const locationId = isSuperadmin
      ? (String(req.query.location_id ?? '').trim() || undefined)
      : (req.user?.location_id ?? undefined);
    const threshold = Number(req.query.threshold ?? env.defaultLowStockThreshold);

    const clauses: string[] = [`(i.total_stock - i.reserved_stock) <= $1`];
    const values: (string | number)[] = [threshold];

    if (locationId) {
      values.push(locationId);
      clauses.push(`(i.location_id::text = $${values.length} OR l.location_code = $${values.length})`);
    }

    const result = await pool.query(
      `SELECT
         i.product_id,
         p.sku,
         p.title,
         p.brand,
         p.low_stock_threshold,
         i.location_id,
         l.name as location_name,
         l.location_code,
         i.total_stock,
         i.reserved_stock,
         (i.total_stock - i.reserved_stock) as available_stock
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN locations l ON l.id = i.location_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY available_stock ASC
       LIMIT 100`,
      values,
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
});

const adjustSchema = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().min(1),
  new_quantity: z.number().int().min(0),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

// POST /inventory/adjust — superadmin only
inventoryRouter.post('/adjust', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Validation failed', details: parsed.error.flatten() });
    }
    const { product_id, location_id, new_quantity, reason, notes } = parsed.data;

    // Resolve location
    const locResult = await pool.query(
      `SELECT id FROM locations WHERE id::text = $1 OR location_code = $1 LIMIT 1`,
      [location_id],
    );
    if (!locResult.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Location not found' });
    }
    const resolvedLocationId = locResult.rows[0].id as string;

    // Get current inventory
    const invResult = await pool.query(
      `SELECT * FROM inventory WHERE product_id = $1 AND location_id = $2`,
      [product_id, resolvedLocationId],
    );

    const currentReserved = Number(invResult.rows[0]?.reserved_stock ?? 0);
    if (new_quantity < currentReserved) {
      return res.status(409).json({
        code: 'BELOW_RESERVED_STOCK',
        message: `New quantity (${new_quantity}) cannot be less than reserved stock (${currentReserved})`,
      });
    }

    const prevTotal = Number(invResult.rows[0]?.total_stock ?? 0);
    const diff = new_quantity - prevTotal;

    await pool.query(
      `INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET total_stock = $3, updated_at = NOW()`,
      [product_id, resolvedLocationId, new_quantity],
    );

    const movementType = diff >= 0 ? 'manual_add' : 'manual_remove';
    await pool.query(
      `INSERT INTO stock_movements (product_id, from_location_id, to_location_id, quantity, movement_type, reference_type, reference_id, reason, created_by)
       VALUES ($1, $2, $2, $3, $4, 'manual', $1, $5, $6)`,
      [product_id, resolvedLocationId, Math.abs(diff), movementType, `${reason}${notes ? ` — ${notes}` : ''}`, req.user!.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'inventory_adjusted',
      entityType: 'inventory',
      entityId: product_id,
      beforeValue: { total_stock: prevTotal },
      afterValue: { total_stock: new_quantity },
      details: `Manual adjustment: ${reason}`,
    });

    return res.json({ success: true, data: { product_id, location_id: resolvedLocationId, new_quantity } });
  } catch (error) {
    return next(error);
  }
});

const addStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity_to_add: z.number().int().positive(),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

// POST /inventory/add-stock — warehouse_manager only
inventoryRouter.post('/add-stock', rolesAllowed(['warehouse_manager']), async (req, res, next) => {
  try {
    const parsed = addStockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'Validation failed', details: parsed.error.flatten() });
    }
    const { product_id, quantity_to_add, reason, notes } = parsed.data;

    const locationId = req.user!.location_id;
    if (!locationId) {
      return res.status(400).json({ code: 'NO_LOCATION', message: 'User has no location assigned' });
    }

    const locResult = await pool.query(
      `SELECT id FROM locations WHERE id::text = $1 OR location_code = $1 LIMIT 1`,
      [locationId],
    );
    if (!locResult.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Location not found' });
    }
    const resolvedLocationId = locResult.rows[0].id as string;

    const result = await pool.query(
      `INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (product_id, location_id)
       DO UPDATE SET total_stock = inventory.total_stock + $3, updated_at = NOW()
       RETURNING *`,
      [product_id, resolvedLocationId, quantity_to_add],
    );

    await pool.query(
      `INSERT INTO stock_movements (product_id, from_location_id, to_location_id, quantity, movement_type, reference_type, reference_id, reason, created_by)
       VALUES ($1, NULL, $2, $3, 'manual_add', 'manual', $1, $4, $5)`,
      [product_id, resolvedLocationId, quantity_to_add, `${reason}${notes ? ` — ${notes}` : ''}`, req.user!.id],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'inventory_stock_added',
      entityType: 'inventory',
      entityId: product_id,
      afterValue: { quantity_added: quantity_to_add, reason },
      details: `Added ${quantity_to_add} units: ${reason}`,
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

// GET /inventory/movements
inventoryRouter.get('/movements', async (req, res, next) => {
  try {
    const isSuperadmin = req.user?.role === 'superadmin';
    const locationId = isSuperadmin
      ? (String(req.query.location_id ?? '').trim() || undefined)
      : (req.user?.location_id ?? undefined);
    const productId = String(req.query.product_id ?? '').trim() || undefined;
    const movementType = String(req.query.movement_type ?? '').trim() || undefined;
    const referenceType = String(req.query.reference_type ?? '').trim() || undefined;
    const dateFrom = String(req.query.date_from ?? '').trim() || undefined;
    const dateTo = String(req.query.date_to ?? '').trim() || undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? env.defaultPageSize)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [];
    const values: (string | number)[] = [];

    if (locationId) {
      values.push(locationId);
      clauses.push(`(fl.location_code = $${values.length} OR tl.location_code = $${values.length} OR sm.from_location_id::text = $${values.length} OR sm.to_location_id::text = $${values.length})`);
    }
    if (productId) {
      values.push(productId);
      clauses.push(`sm.product_id::text = $${values.length}`);
    }
    if (movementType) {
      values.push(movementType);
      clauses.push(`sm.movement_type = $${values.length}`);
    }
    if (referenceType) {
      values.push(referenceType);
      clauses.push(`sm.reference_type = $${values.length}`);
    }
    if (dateFrom) {
      values.push(dateFrom);
      clauses.push(`sm.created_at >= $${values.length}::timestamp`);
    }
    if (dateTo) {
      values.push(dateTo);
      clauses.push(`sm.created_at <= $${values.length}::timestamp`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM stock_movements sm
       LEFT JOIN locations fl ON fl.id = sm.from_location_id
       LEFT JOIN locations tl ON tl.id = sm.to_location_id
       ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const rows = await pool.query(
      `SELECT
         sm.*,
         p.sku, p.title as product_title,
         fl.name as from_location_name, fl.location_code as from_location_code,
         tl.name as to_location_name, tl.location_code as to_location_code
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       LEFT JOIN locations fl ON fl.id = sm.from_location_id
       LEFT JOIN locations tl ON tl.id = sm.to_location_id
       ${where}
       ORDER BY sm.created_at DESC
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
