-- ============================================================
-- 001_initial_schema.sql
-- All core tables for store-warehouse-backend
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── locations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code   VARCHAR(20) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('warehouse','store')),
  status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  address         TEXT,
  city            VARCHAR(100),
  phone           VARCHAR(30),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(30) NOT NULL CHECK (role IN ('superadmin','warehouse_manager','store_manager')),
  location_id     VARCHAR(30),   -- stores location_code or null for superadmin
  status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
  last_login_at   TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── products ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                   VARCHAR(100) UNIQUE NOT NULL,
  title                 VARCHAR(255) NOT NULL,
  short_name            VARCHAR(100),
  brand                 VARCHAR(100) NOT NULL,
  category              VARCHAR(100),
  model                 VARCHAR(100),
  color                 VARCHAR(50),
  status                VARCHAR(30) NOT NULL DEFAULT 'present' CHECK (status IN ('present','inactive','discontinued')),
  custom_style          VARCHAR(100),
  image_url             TEXT,
  thumbnail_url         TEXT,
  low_stock_threshold   INTEGER NOT NULL DEFAULT 10,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── inventory ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id),
  location_id     UUID NOT NULL REFERENCES locations(id),
  total_stock     INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  reserved_stock  INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  issued_stock    INTEGER NOT NULL DEFAULT 0 CHECK (issued_stock >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, location_id)
);

-- ─── stock_movements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id),
  from_location_id  UUID REFERENCES locations(id),
  to_location_id    UUID NOT NULL REFERENCES locations(id),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  movement_type     VARCHAR(30) NOT NULL CHECK (movement_type IN (
                      'order_reserved','order_deducted','order_issued',
                      'transfer','manual_add','manual_remove','manual_adjustment'
                    )),
  reference_type    VARCHAR(30) NOT NULL CHECK (reference_type IN (
                      'store_order','bulk_order','transfer_request','manual','system'
                    )),
  reference_id      TEXT NOT NULL,
  reason            TEXT,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── store_orders ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        VARCHAR(50) UNIQUE NOT NULL,
  store_id        UUID NOT NULL REFERENCES locations(id),
  warehouse_id    UUID NOT NULL REFERENCES locations(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
                    'draft','confirmed','packed','dispatched',
                    'store_received','completed','cancelled'
                  )),
  items           JSONB NOT NULL DEFAULT '[]',
  reserved_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cancel_reason   TEXT,
  approved_by     UUID,
  dispatched_at   TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── order_items (normalised, optional) ──────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── bulk_orders ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bulk_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          VARCHAR(50) UNIQUE NOT NULL,
  client_store_id   UUID NOT NULL,
  warehouse_id      UUID NOT NULL REFERENCES locations(id),
  status            VARCHAR(30) NOT NULL DEFAULT 'confirmed' CHECK (status IN (
                      'confirmed','packed','dispatched','completed','cancelled'
                    )),
  items             JSONB NOT NULL DEFAULT '[]',
  reserved_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  dispatched_at     TIMESTAMPTZ,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── bulk_order_items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bulk_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_order_id UUID NOT NULL REFERENCES bulk_orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  qty           INTEGER NOT NULL CHECK (qty > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── client_stores ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(50) UNIQUE NOT NULL,
  contact_name  VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(30),
  address       TEXT,
  city          VARCHAR(100),
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── transfer_requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id),
  from_location_id  UUID NOT NULL REFERENCES locations(id),
  to_location_id    UUID NOT NULL REFERENCES locations(id),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  status            VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
                      'pending','in_transit','completed','rejected'
                    )),
  notes             TEXT,
  completed_at      TIMESTAMPTZ,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── audit_logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID NOT NULL,
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       TEXT,
  before_value    JSONB,
  after_value     JSONB,
  details         TEXT,
  ip_address      INET,
  user_agent      TEXT,
  request_id      TEXT,
  success         BOOLEAN NOT NULL DEFAULT TRUE,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── idempotency_logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  user_id         UUID NOT NULL,
  endpoint        VARCHAR(255) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ─── notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  type        VARCHAR(100) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  payload     JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
