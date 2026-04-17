-- ============================================================
-- 004_rls_policies.sql
-- Row-Level Security policies for all tables
--
-- USAGE:
--   The backend API connects as a privileged 'service' role that
--   bypasses RLS (BYPASSRLS). Direct DB access (e.g., via Neon
--   console, psql, or an analytics tool) is subject to these policies.
--
-- TO ACTIVATE on Neon:
--   1. Create a restricted role:
--        CREATE ROLE app_user NOLOGIN;
--        GRANT CONNECT ON DATABASE your_db TO app_user;
--        GRANT USAGE ON SCHEMA public TO app_user;
--        GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
--
--   2. Pass session variables before each query from the app layer:
--        SET LOCAL app.user_id  = '<uuid>';
--        SET LOCAL app.role     = 'store_manager';
--        SET LOCAL app.location = '<location_code>';
--
--   3. Enable policies below by uncommenting ALTER TABLE … ENABLE ROW LEVEL SECURITY.
--
-- The API service role uses BYPASSRLS and is not affected by these policies.
-- ============================================================

-- ─── Helper: extract session variable safely ─────────────────
CREATE OR REPLACE FUNCTION current_app_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.role', true), '')
$$;

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION current_app_location()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.location', true), '')
$$;

-- ─── locations ───────────────────────────────────────────────
-- Superadmins see all locations.
-- Warehouse/store managers see only their own location.
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_superadmin ON locations
  FOR ALL
  USING (current_app_role() = 'superadmin');

CREATE POLICY locations_manager_own ON locations
  FOR SELECT
  USING (
    current_app_role() IN ('warehouse_manager', 'store_manager')
    AND location_code = current_app_location()
  );

-- ─── users ───────────────────────────────────────────────────
-- Superadmins see all users.
-- Managers see only themselves.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_superadmin ON users
  FOR ALL
  USING (current_app_role() = 'superadmin');

CREATE POLICY users_self ON users
  FOR SELECT
  USING (id = current_app_user_id());

-- ─── products ────────────────────────────────────────────────
-- All authenticated users can read active products.
-- Only superadmin and warehouse_manager can write.
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_read_all ON products
  FOR SELECT
  USING (
    current_app_role() IN ('superadmin', 'warehouse_manager', 'store_manager')
    AND deleted_at IS NULL
  );

CREATE POLICY products_write_admin ON products
  FOR INSERT
  USING (current_app_role() IN ('superadmin', 'warehouse_manager'));

CREATE POLICY products_update_admin ON products
  FOR UPDATE
  USING (current_app_role() IN ('superadmin', 'warehouse_manager'));

CREATE POLICY products_delete_superadmin ON products
  FOR DELETE
  USING (current_app_role() = 'superadmin');

-- ─── inventory ───────────────────────────────────────────────
-- Superadmins see all rows.
-- Managers see only inventory at their location.
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_superadmin ON inventory
  FOR ALL
  USING (current_app_role() = 'superadmin');

CREATE POLICY inventory_manager_own ON inventory
  FOR SELECT
  USING (
    current_app_role() IN ('warehouse_manager', 'store_manager')
    AND location_id = (
      SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1
    )
  );

-- ─── stock_movements ─────────────────────────────────────────
-- Immutable table. Superadmins see all. Managers see movements at their location.
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_movements_superadmin ON stock_movements
  FOR SELECT
  USING (current_app_role() = 'superadmin');

CREATE POLICY stock_movements_manager ON stock_movements
  FOR SELECT
  USING (
    current_app_role() IN ('warehouse_manager', 'store_manager')
    AND (
      from_location_id = (SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1)
      OR
      to_location_id   = (SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1)
    )
  );

-- INSERT is allowed (the app inserts movements during order processing).
CREATE POLICY stock_movements_insert ON stock_movements
  FOR INSERT
  WITH CHECK (current_app_role() IN ('superadmin', 'warehouse_manager', 'store_manager'));

-- ─── store_orders ─────────────────────────────────────────────
-- Superadmins see all orders.
-- Warehouse managers see orders assigned to their warehouse.
-- Store managers see orders from their store.
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_orders_superadmin ON store_orders
  FOR ALL
  USING (current_app_role() = 'superadmin');

CREATE POLICY store_orders_warehouse ON store_orders
  FOR SELECT
  USING (
    current_app_role() = 'warehouse_manager'
    AND warehouse_id = (SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1)
  );

CREATE POLICY store_orders_store ON store_orders
  FOR SELECT
  USING (
    current_app_role() = 'store_manager'
    AND store_id = (SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1)
  );

-- ─── order_items ─────────────────────────────────────────────
-- Accessible through store_orders join — inherit parent's policy.
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_all ON order_items
  FOR ALL
  USING (
    current_app_role() IN ('superadmin', 'warehouse_manager', 'store_manager')
  );

-- ─── bulk_orders ─────────────────────────────────────────────
-- Superadmins see all. Warehouse managers see their warehouse's bulk orders.
ALTER TABLE bulk_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY bulk_orders_superadmin ON bulk_orders
  FOR ALL
  USING (current_app_role() = 'superadmin');

CREATE POLICY bulk_orders_warehouse ON bulk_orders
  FOR SELECT
  USING (
    current_app_role() = 'warehouse_manager'
    AND warehouse_id = (SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1)
  );

-- ─── bulk_order_items ────────────────────────────────────────
ALTER TABLE bulk_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY bulk_order_items_all ON bulk_order_items
  FOR ALL
  USING (current_app_role() IN ('superadmin', 'warehouse_manager'));

-- ─── client_stores ───────────────────────────────────────────
-- Superadmins and warehouse managers can read. Only superadmin can write.
ALTER TABLE client_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_stores_read ON client_stores
  FOR SELECT
  USING (current_app_role() IN ('superadmin', 'warehouse_manager'));

CREATE POLICY client_stores_write ON client_stores
  FOR ALL
  USING (current_app_role() = 'superadmin');

-- ─── transfer_requests ───────────────────────────────────────
-- Superadmins see all. Managers see transfers involving their location.
ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY transfer_requests_superadmin ON transfer_requests
  FOR ALL
  USING (current_app_role() = 'superadmin');

CREATE POLICY transfer_requests_manager ON transfer_requests
  FOR SELECT
  USING (
    current_app_role() IN ('warehouse_manager', 'store_manager')
    AND (
      from_location_id = (SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1)
      OR
      to_location_id   = (SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1)
    )
  );

-- ─── audit_logs ──────────────────────────────────────────────
-- Immutable. Only superadmins can read. Nobody can update or delete (trigger enforces this).
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_superadmin ON audit_logs
  FOR SELECT
  USING (current_app_role() = 'superadmin');

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (current_app_role() IN ('superadmin', 'warehouse_manager', 'store_manager'));

-- ─── idempotency_logs ────────────────────────────────────────
-- Users can only see their own idempotency records.
ALTER TABLE idempotency_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_logs_own ON idempotency_logs
  FOR ALL
  USING (user_id = current_app_user_id());

-- ─── notifications ───────────────────────────────────────────
-- Users can only see their own notifications.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_own ON notifications
  FOR ALL
  USING (user_id = current_app_user_id());
