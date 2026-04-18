-- ============================================================
-- 005_schema_alignment.sql
-- Aligns existing schema with the v2.0 functional specification.
-- All changes are additive (new columns, relaxed constraints, new
-- check values) — no existing columns are renamed or dropped, so
-- application code continues to work without modification.
-- ============================================================

-- ─── locations: add geo + geofence fields ────────────────────
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS geo_lat         DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS geo_lng         DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 100;

-- Enforce geofence_radius > 0 when it has been explicitly set
ALTER TABLE locations
  DROP CONSTRAINT IF EXISTS locations_geofence_radius_check;
ALTER TABLE locations
  ADD CONSTRAINT locations_geofence_radius_check
    CHECK (geofence_radius IS NULL OR geofence_radius > 0);

-- ─── users: add phone field + superadmin constraint ──────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
  ON users(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Superadmin must have no location; managers must have one.
-- (users.location_id stores a location_code as VARCHAR — null for superadmin)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS superadmin_no_location;
ALTER TABLE users
  ADD CONSTRAINT superadmin_no_location CHECK (
    (role = 'superadmin'      AND location_id IS NULL)
    OR
    (role != 'superadmin'     AND location_id IS NOT NULL)
  );

-- ─── products: enforce custom_style values ───────────────────
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_custom_style_check;
ALTER TABLE products
  ADD CONSTRAINT products_custom_style_check CHECK (
    custom_style IS NULL OR custom_style IN (
      'default', 'premium', 'featured', 'sale', 'catalogue_ready'
    )
  );

-- Ensure low_stock_threshold is non-negative
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_low_stock_threshold_check;
ALTER TABLE products
  ADD CONSTRAINT products_low_stock_threshold_check
    CHECK (low_stock_threshold >= 0);

-- ─── inventory: enforce reserved ≤ total ─────────────────────
ALTER TABLE inventory
  DROP CONSTRAINT IF EXISTS reserved_not_exceeds_total;
ALTER TABLE inventory
  ADD CONSTRAINT reserved_not_exceeds_total
    CHECK (reserved_stock <= total_stock);

-- ─── stock_movements: make to_location_id nullable ───────────
-- The spec allows null when stock leaves the system permanently
-- (e.g., damage removal with no destination location).
ALTER TABLE stock_movements
  ALTER COLUMN to_location_id DROP NOT NULL;

-- Expand movement_type to include all spec values
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;
ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check CHECK (
    movement_type IN (
      'order_reserved', 'order_deducted', 'order_issued',
      'transfer_out',   'transfer_in',
      'manual_add',     'manual_remove', 'manual_adjustment',
      'initial_stock',  'transfer'
    )
  );

-- Make reference_id and created_by nullable (system-generated movements)
ALTER TABLE stock_movements
  ALTER COLUMN reference_id DROP NOT NULL;
ALTER TABLE stock_movements
  ALTER COLUMN created_by   DROP NOT NULL;

-- ─── store_orders: add actor tracking + dispatch notes ───────
ALTER TABLE store_orders
  ADD COLUMN IF NOT EXISTS dispatched_by   UUID,
  ADD COLUMN IF NOT EXISTS received_by     UUID,
  ADD COLUMN IF NOT EXISTS dispatch_notes  TEXT;

-- ─── order_items: add per-item status tracking ───────────────
-- Column named 'qty' is kept as-is (existing code references it).
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','packed','dispatched','received','cancelled'));

-- ─── bulk_orders: add actor tracking + metadata ──────────────
ALTER TABLE bulk_orders
  ADD COLUMN IF NOT EXISTS dispatched_by   UUID,
  ADD COLUMN IF NOT EXISTS dispatch_notes  TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason   TEXT;

-- ─── bulk_order_items: alias column for compatibility ─────────
-- qty is the working name; the spec calls it quantity.
-- We add a generated column so both names work in queries.
-- (Skip if your PG version < 12 — generated columns require PG 12+)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bulk_order_items' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE bulk_order_items ADD COLUMN quantity INTEGER
      GENERATED ALWAYS AS (qty) STORED;
  END IF;
END $$;

-- Same for order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE order_items ADD COLUMN quantity INTEGER
      GENERATED ALWAYS AS (qty) STORED;
  END IF;
END $$;

-- ─── transfer_requests: add human-readable ID + actor + status ─
ALTER TABLE transfer_requests
  ADD COLUMN IF NOT EXISTS transfer_id  VARCHAR(60) UNIQUE,
  ADD COLUMN IF NOT EXISTS completed_by UUID;

-- Expand status to include 'cancelled'
ALTER TABLE transfer_requests
  DROP CONSTRAINT IF EXISTS transfer_requests_status_check;
ALTER TABLE transfer_requests
  ADD CONSTRAINT transfer_requests_status_check CHECK (
    status IN ('pending', 'in_transit', 'completed', 'rejected', 'cancelled')
  );

-- ─── client_stores: align field names + add missing fields ───
-- We keep existing columns (name, code, contact_name, etc.) and
-- add spec columns alongside them for compatibility.
ALTER TABLE client_stores
  ADD COLUMN IF NOT EXISTS store_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS owner_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gst_number  VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_stores_phone_unique
  ON client_stores(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_stores_email_unique
  ON client_stores(email) WHERE email IS NOT NULL;

-- Add 'blocked' to allowed status values
ALTER TABLE client_stores
  DROP CONSTRAINT IF EXISTS client_stores_status_check;
ALTER TABLE client_stores
  ADD CONSTRAINT client_stores_status_check
    CHECK (status IN ('active', 'inactive', 'blocked'));

-- ─── audit_logs: make actor_user_id nullable + add denorm fields
ALTER TABLE audit_logs
  ALTER COLUMN actor_user_id DROP NOT NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(30);

-- ─── notifications: add entity navigation fields ──────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entity_id   VARCHAR(60),
  ADD COLUMN IF NOT EXISTS read        BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill read from is_read for any existing rows
UPDATE notifications SET read = is_read WHERE read IS DISTINCT FROM is_read;

-- ─── products: full-text search GIN index ────────────────────
-- Enables fast keyword search across title + brand + model.
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products
  USING GIN (
    to_tsvector(
      'english',
      COALESCE(title, '') || ' ' ||
      COALESCE(brand, '') || ' '  ||
      COALESCE(model, '')
    )
  );

-- ─── store_orders: partial index for active orders ───────────
CREATE INDEX IF NOT EXISTS idx_store_orders_active
  ON store_orders(status, created_at DESC)
  WHERE status NOT IN ('completed', 'cancelled');

-- ─── notifications: composite index (user + read + date) ─────
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_date
  ON notifications(user_id, is_read, created_at DESC);
