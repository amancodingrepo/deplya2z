import { Router } from 'express';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const reportsRouter = Router();

reportsRouter.use(authRequired);

// GET /reports/dashboard
reportsRouter.get('/dashboard', async (req, res, next) => {
  try {
    const role = req.user!.role;
    const locationId = req.user!.location_id;

    if (role === 'superadmin') {
      const [pendingOrders, lowStockItems, dispatchedToday, activeStores, activeWarehouses, recentDrafts, topLowStock, recentActivity] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM store_orders WHERE status = 'draft'`),
        pool.query(
          `SELECT COUNT(*) as count FROM inventory i JOIN products p ON p.id = i.product_id
           WHERE (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1)`,
          [env.defaultLowStockThreshold],
        ),
        pool.query(`SELECT COUNT(*) as count FROM store_orders WHERE status = 'dispatched' AND dispatched_at::date = current_date`),
        pool.query(`SELECT COUNT(*) as count FROM locations WHERE type = 'store' AND status = 'active'`),
        pool.query(`SELECT COUNT(*) as count FROM locations WHERE type = 'warehouse' AND status = 'active'`),
        pool.query(
          `SELECT so.*, sl.name as store_name, wl.name as warehouse_name
           FROM store_orders so
           LEFT JOIN locations sl ON sl.id = so.store_id
           LEFT JOIN locations wl ON wl.id = so.warehouse_id
           WHERE so.status = 'draft'
           ORDER BY so.created_at DESC LIMIT 5`,
        ),
        pool.query(
          `SELECT i.product_id, p.sku, p.title, p.brand, l.name as location_name, l.location_code,
                  i.total_stock, i.reserved_stock, (i.total_stock - i.reserved_stock) as available_stock,
                  p.low_stock_threshold
           FROM inventory i
           JOIN products p ON p.id = i.product_id
           JOIN locations l ON l.id = i.location_id
           WHERE (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1)
           ORDER BY available_stock ASC LIMIT 10`,
          [env.defaultLowStockThreshold],
        ),
        pool.query(
          `SELECT al.*, u.name as actor_name
           FROM audit_logs al
           LEFT JOIN users u ON u.id = al.actor_user_id
           ORDER BY al.created_at DESC LIMIT 20`,
        ),
      ]);

      return res.json({
        success: true,
        data: {
          kpi: {
            pending_approvals: Number(pendingOrders.rows[0]?.count ?? 0),
            low_stock_items: Number(lowStockItems.rows[0]?.count ?? 0),
            dispatched_today: Number(dispatchedToday.rows[0]?.count ?? 0),
            active_stores: Number(activeStores.rows[0]?.count ?? 0),
            active_warehouses: Number(activeWarehouses.rows[0]?.count ?? 0),
          },
          pending_orders: recentDrafts.rows,
          low_stock_alerts: topLowStock.rows,
          recent_activity: recentActivity.rows,
        },
      });
    }

    if (role === 'warehouse_manager') {
      const resolvedLocationId = locationId
        ? (await pool.query(`SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`, [locationId])).rows[0]?.id
        : null;

      const locFilter = resolvedLocationId
        ? `AND (so.warehouse_id = '${resolvedLocationId}')`
        : '';

      const [ordersToPack, ordersToDispatch, lowStockCount, dispatchedToday, packQueue, dispatchQueue, lowStockAlerts] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM store_orders WHERE status = 'confirmed' ${locFilter}`),
        pool.query(`SELECT COUNT(*) as count FROM store_orders WHERE status = 'packed' ${locFilter}`),
        pool.query(
          `SELECT COUNT(*) as count FROM inventory i JOIN products p ON p.id = i.product_id
           WHERE (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1)
           ${resolvedLocationId ? `AND i.location_id = '${resolvedLocationId}'` : ''}`,
          [env.defaultLowStockThreshold],
        ),
        pool.query(
          `SELECT COUNT(*) as count FROM store_orders
           WHERE status = 'dispatched' AND dispatched_at::date = current_date ${locFilter}`,
        ),
        pool.query(
          `SELECT so.*, sl.name as store_name FROM store_orders so
           LEFT JOIN locations sl ON sl.id = so.store_id
           WHERE so.status = 'confirmed' ${locFilter}
           ORDER BY so.created_at ASC LIMIT 20`,
        ),
        pool.query(
          `SELECT so.*, sl.name as store_name FROM store_orders so
           LEFT JOIN locations sl ON sl.id = so.store_id
           WHERE so.status = 'packed' ${locFilter}
           ORDER BY so.created_at ASC LIMIT 20`,
        ),
        pool.query(
          `SELECT i.product_id, p.sku, p.title, (i.total_stock - i.reserved_stock) as available_stock, p.low_stock_threshold
           FROM inventory i JOIN products p ON p.id = i.product_id
           WHERE (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1)
           ${resolvedLocationId ? `AND i.location_id = '${resolvedLocationId}'` : ''}
           ORDER BY available_stock ASC LIMIT 10`,
          [env.defaultLowStockThreshold],
        ),
      ]);

      return res.json({
        success: true,
        data: {
          kpi: {
            orders_to_pack: Number(ordersToPack.rows[0]?.count ?? 0),
            orders_to_dispatch: Number(ordersToDispatch.rows[0]?.count ?? 0),
            low_stock_items: Number(lowStockCount.rows[0]?.count ?? 0),
            dispatched_today: Number(dispatchedToday.rows[0]?.count ?? 0),
          },
          pack_queue: packQueue.rows,
          dispatch_queue: dispatchQueue.rows,
          low_stock_alerts: lowStockAlerts.rows,
        },
      });
    }

    // store_manager
    const resolvedLocationId = locationId
      ? (await pool.query(`SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`, [locationId])).rows[0]?.id
      : null;

    const storeFilter = resolvedLocationId
      ? `AND so.store_id = '${resolvedLocationId}'`
      : '';

    const [pendingOrders, arrivingSoon, inventoryProducts, lowStockCount, dispatchedOrders, recentOrders, inventoryHealth, lowStockAlerts] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM store_orders WHERE status IN ('draft','confirmed','packed') ${storeFilter}`),
      pool.query(`SELECT COUNT(*) as count FROM store_orders WHERE status = 'dispatched' ${storeFilter}`),
      pool.query(
        `SELECT COUNT(DISTINCT product_id) as count FROM inventory
         WHERE ${resolvedLocationId ? `location_id = '${resolvedLocationId}'` : `1=1`}`,
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM inventory i JOIN products p ON p.id = i.product_id
         WHERE (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1)
         ${resolvedLocationId ? `AND i.location_id = '${resolvedLocationId}'` : ''}`,
        [env.defaultLowStockThreshold],
      ),
      pool.query(
        `SELECT so.*, wl.name as warehouse_name FROM store_orders so
         LEFT JOIN locations wl ON wl.id = so.warehouse_id
         WHERE so.status = 'dispatched' ${storeFilter}
         ORDER BY so.dispatched_at DESC LIMIT 10`,
      ),
      pool.query(
        `SELECT so.*, wl.name as warehouse_name FROM store_orders so
         LEFT JOIN locations wl ON wl.id = so.warehouse_id
         WHERE 1=1 ${storeFilter}
         ORDER BY so.created_at DESC LIMIT 10`,
      ),
      pool.query(
        `SELECT
           COUNT(CASE WHEN (i.total_stock - i.reserved_stock) > COALESCE(p.low_stock_threshold, $1) THEN 1 END) as in_stock,
           COUNT(CASE WHEN (i.total_stock - i.reserved_stock) > 0 AND (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1) THEN 1 END) as low_stock,
           COUNT(CASE WHEN (i.total_stock - i.reserved_stock) = 0 THEN 1 END) as out_of_stock
         FROM inventory i JOIN products p ON p.id = i.product_id
         WHERE ${resolvedLocationId ? `i.location_id = '${resolvedLocationId}'` : `1=1`}`,
        [env.defaultLowStockThreshold],
      ),
      pool.query(
        `SELECT i.product_id, p.sku, p.title, (i.total_stock - i.reserved_stock) as available_stock, p.low_stock_threshold
         FROM inventory i JOIN products p ON p.id = i.product_id
         WHERE (i.total_stock - i.reserved_stock) <= COALESCE(p.low_stock_threshold, $1)
         ${resolvedLocationId ? `AND i.location_id = '${resolvedLocationId}'` : ''}
         ORDER BY available_stock ASC LIMIT 10`,
        [env.defaultLowStockThreshold],
      ),
    ]);

    return res.json({
      success: true,
      data: {
        kpi: {
          pending_orders: Number(pendingOrders.rows[0]?.count ?? 0),
          arriving_soon: Number(arrivingSoon.rows[0]?.count ?? 0),
          inventory_products: Number(inventoryProducts.rows[0]?.count ?? 0),
          low_stock_items: Number(lowStockCount.rows[0]?.count ?? 0),
        },
        dispatched_orders: dispatchedOrders.rows,
        recent_orders: recentOrders.rows,
        inventory_health: inventoryHealth.rows[0] ?? { in_stock: 0, low_stock: 0, out_of_stock: 0 },
        low_stock_alerts: lowStockAlerts.rows,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /reports/analytics — superadmin only
reportsRouter.get('/analytics', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const dateFrom = String(req.query.date_from ?? '').trim() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = String(req.query.date_to ?? '').trim() || new Date().toISOString().split('T')[0];

    const [
      ordersOverTime,
      ordersByStatus,
      topProducts,
      stockMovementsByType,
      revenueByStore,
      bulkOrderTrend,
      summary,
    ] = await Promise.all([
      // Orders over time (by day)
      pool.query(
        `SELECT created_at::date as date, COUNT(*) as order_count, status
         FROM store_orders
         WHERE created_at >= $1::date AND created_at <= $2::date + interval '1 day'
         GROUP BY date, status
         ORDER BY date ASC`,
        [dateFrom, dateTo],
      ),
      // Orders by status
      pool.query(
        `SELECT status, COUNT(*) as count
         FROM store_orders
         WHERE created_at >= $1::date AND created_at <= $2::date + interval '1 day'
         GROUP BY status`,
        [dateFrom, dateTo],
      ),
      // Top products by order quantity
      pool.query(
        `SELECT p.sku, p.title, p.brand,
                SUM((oi->>'qty')::int) as total_qty,
                COUNT(DISTINCT so.id) as order_count
         FROM store_orders so,
              jsonb_array_elements(so.items::jsonb) as oi
         JOIN products p ON p.id = (oi->>'product_id')::uuid
         WHERE so.created_at >= $1::date AND so.created_at <= $2::date + interval '1 day'
           AND so.status NOT IN ('cancelled')
         GROUP BY p.id, p.sku, p.title, p.brand
         ORDER BY total_qty DESC LIMIT 10`,
        [dateFrom, dateTo],
      ),
      // Stock movements by type
      pool.query(
        `SELECT movement_type, COUNT(*) as count, SUM(quantity) as total_quantity
         FROM stock_movements
         WHERE created_at >= $1::date AND created_at <= $2::date + interval '1 day'
         GROUP BY movement_type`,
        [dateFrom, dateTo],
      ),
      // Orders per store
      pool.query(
        `SELECT l.name as store_name, l.location_code, COUNT(so.id) as order_count
         FROM store_orders so
         JOIN locations l ON l.id = so.store_id
         WHERE so.created_at >= $1::date AND so.created_at <= $2::date + interval '1 day'
           AND so.status NOT IN ('cancelled')
         GROUP BY l.id, l.name, l.location_code
         ORDER BY order_count DESC`,
        [dateFrom, dateTo],
      ),
      // Bulk order trend by day
      pool.query(
        `SELECT created_at::date as date, COUNT(*) as count
         FROM bulk_orders
         WHERE created_at >= $1::date AND created_at <= $2::date + interval '1 day'
         GROUP BY date
         ORDER BY date ASC`,
        [dateFrom, dateTo],
      ),
      // Summary totals
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE created_at >= $1::date AND created_at <= $2::date + interval '1 day') as total_orders,
           COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= $1::date AND created_at <= $2::date + interval '1 day') as completed_orders,
           COUNT(*) FILTER (WHERE status = 'cancelled' AND created_at >= $1::date AND created_at <= $2::date + interval '1 day') as cancelled_orders,
           COUNT(DISTINCT store_id) FILTER (WHERE created_at >= $1::date AND created_at <= $2::date + interval '1 day') as active_stores
         FROM store_orders`,
        [dateFrom, dateTo],
      ),
    ]);

    return res.json({
      success: true,
      data: {
        date_range: { from: dateFrom, to: dateTo },
        charts: {
          orders_over_time: ordersOverTime.rows,
          orders_by_status: ordersByStatus.rows,
          top_products: topProducts.rows,
          stock_movements_by_type: stockMovementsByType.rows,
          orders_by_store: revenueByStore.rows,
          bulk_order_trend: bulkOrderTrend.rows,
        },
        summary: summary.rows[0] ?? {},
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /reports/audit — superadmin only
reportsRouter.get('/audit', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const action = String(req.query.action ?? '').trim() || undefined;
    const entityType = String(req.query.entity_type ?? '').trim() || undefined;
    const actorUserId = String(req.query.actor_user_id ?? '').trim() || undefined;
    const successParam = req.query.success;
    const dateFrom = String(req.query.date_from ?? '').trim() || undefined;
    const dateTo = String(req.query.date_to ?? '').trim() || undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? env.defaultPageSize)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (action) {
      values.push(`%${action}%`);
      clauses.push(`al.action ILIKE $${values.length}`);
    }
    if (entityType) {
      values.push(entityType);
      clauses.push(`al.entity_type = $${values.length}`);
    }
    if (actorUserId) {
      values.push(actorUserId);
      clauses.push(`al.actor_user_id::text = $${values.length}`);
    }
    if (successParam !== undefined && successParam !== '') {
      values.push(successParam === 'true');
      clauses.push(`al.success = $${values.length}`);
    }
    if (dateFrom) {
      values.push(dateFrom);
      clauses.push(`al.created_at >= $${values.length}::timestamp`);
    }
    if (dateTo) {
      values.push(dateTo);
      clauses.push(`al.created_at <= $${values.length}::timestamp`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs al ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const rows = await pool.query(
      `SELECT al.*, u.name as actor_name, u.email as actor_email, u.role as actor_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ${where}
       ORDER BY al.created_at DESC
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
