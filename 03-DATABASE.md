# Store & Warehouse Supply Management System - Database Guide

**Version:** 2.0  
**Database:** PostgreSQL 14+ (Neon)  
**Status:** Production-Specification

---

## Database Architecture

```
┌────────────────────────────────────────┐
│  PostgreSQL (Neon)                      │
│  ┌──────────────────────────────────┐  │
│  │  Core Tables                     │  │
│  │  - users                         │  │
│  │  - locations                     │  │
│  │  - products                      │  │
│  │  - inventory                     │  │
│  │  - stock_movements (immutable)   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Orders                          │  │
│  │  - store_orders                  │  │
│  │  - order_items                   │  │
│  │  - bulk_orders                   │  │
│  │  - bulk_order_items              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Operations                      │  │
│  │  - transfer_requests             │  │
│  │  - client_stores                 │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Audit & Security                │  │
│  │  - audit_logs (immutable)        │  │
│  │  - idempotency_logs              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Indexes (for performance)       │  │
│  │  - B-tree indexes on foreign keys│  │
│  │  - Hash indexes on search fields │  │
│  │  - Partial indexes on status     │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Row-Level Security (RLS)        │  │
│  │  - Location-based isolation      │  │
│  │  - Role-based access control     │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## Core Tables

### **users**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'warehouse_manager', 'store_manager')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Constraints
ALTER TABLE users 
ADD CONSTRAINT superadmin_no_location CHECK (
  (role = 'superadmin' AND location_id IS NULL) OR 
  (role != 'superadmin' AND location_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location_id ON users(location_id);
CREATE INDEX idx_users_status ON users(status);

-- Row-Level Security (enabled below)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### **locations**

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('warehouse', 'store')),
  address TEXT,
  geo_lat DECIMAL(10, 8),
  geo_lng DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 100,
  location_code VARCHAR(10) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Constraints
ALTER TABLE locations
ADD CONSTRAINT check_geofence_radius CHECK (geofence_radius > 0),
ADD CONSTRAINT check_location_code CHECK (length(location_code) >= 2);

-- Indexes
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_status ON locations(status);
CREATE INDEX idx_locations_location_code ON locations(location_code);

-- Row-Level Security (enabled below)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
```

### **products**

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  brand VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  model VARCHAR(100),
  color VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'inactive', 'discontinued')),
  custom_style VARCHAR(50) DEFAULT 'default' CHECK (custom_style IN ('default', 'premium', 'featured', 'sale', 'catalogue_ready')),
  image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_title ON products USING GIN(to_tsvector('english', title)); -- Full-text search
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- Row-Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### **inventory**

```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  total_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  issued_stock INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_product_location UNIQUE (product_id, location_id),
  CONSTRAINT check_total_stock CHECK (total_stock >= 0),
  CONSTRAINT check_reserved_stock CHECK (reserved_stock >= 0),
  CONSTRAINT check_issued_stock CHECK (issued_stock >= 0),
  CONSTRAINT check_reserved_not_exceeds_total CHECK (reserved_stock <= total_stock)
);

-- Computed column (available_stock)
CREATE OR REPLACE FUNCTION inventory_available_stock(inventory)
RETURNS INTEGER AS $$
  SELECT $1.total_stock - $1.reserved_stock;
$$ LANGUAGE SQL IMMUTABLE;

-- Indexes
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_location_id ON inventory(location_id);
CREATE INDEX idx_inventory_updated_at ON inventory(updated_at);

-- Row-Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
```

### **stock_movements** (Immutable)

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  from_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN 
    ('order_reserved', 'order_deducted', 'order_issued', 'transfer', 'manual_adjustment')),
  reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN 
    ('store_order', 'bulk_order', 'transfer_request', 'manual', 'system')),
  reference_id VARCHAR(50),
  reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_quantity CHECK (quantity > 0)
);

-- Immutability: Prevent updates and deletes
CREATE OR REPLACE FUNCTION prevent_stock_movement_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Stock movements are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movements_immutable_update
BEFORE UPDATE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION prevent_stock_movement_update();

CREATE TRIGGER stock_movements_immutable_delete
BEFORE DELETE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION prevent_stock_movement_update();

-- Indexes
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_from_location_id ON stock_movements(from_location_id);
CREATE INDEX idx_stock_movements_to_location_id ON stock_movements(to_location_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_reference_type ON stock_movements(reference_type);

-- Row-Level Security
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
```

---

## Order Tables

### **store_orders**

```sql
CREATE TABLE store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN 
    ('draft', 'confirmed', 'packed', 'dispatched', 'store_received', 'completed', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]',
  reserved_amount INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  dispatch_notes TEXT,
  dispatched_at TIMESTAMP,
  received_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_store_not_warehouse CHECK (store_id != warehouse_id),
  CONSTRAINT check_reserved_amount CHECK (reserved_amount >= 0)
);

-- Indexes
CREATE INDEX idx_store_orders_order_id ON store_orders(order_id);
CREATE INDEX idx_store_orders_store_id ON store_orders(store_id);
CREATE INDEX idx_store_orders_warehouse_id ON store_orders(warehouse_id);
CREATE INDEX idx_store_orders_status ON store_orders(status);
CREATE INDEX idx_store_orders_created_at ON store_orders(created_at);
CREATE INDEX idx_store_orders_created_by ON store_orders(created_by);

-- Row-Level Security
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
```

### **order_items**

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN 
    ('pending', 'packed', 'dispatched', 'received', 'cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_status ON order_items(status);

-- Row-Level Security
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
```

### **bulk_orders**

```sql
CREATE TABLE bulk_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL UNIQUE,
  client_store_id UUID NOT NULL REFERENCES client_stores(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN 
    ('confirmed', 'packed', 'dispatched', 'completed', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]',
  reserved_amount INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  dispatch_notes TEXT,
  dispatched_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_reserved_amount CHECK (reserved_amount >= 0)
);

-- Indexes
CREATE INDEX idx_bulk_orders_order_id ON bulk_orders(order_id);
CREATE INDEX idx_bulk_orders_client_store_id ON bulk_orders(client_store_id);
CREATE INDEX idx_bulk_orders_warehouse_id ON bulk_orders(warehouse_id);
CREATE INDEX idx_bulk_orders_status ON bulk_orders(status);
CREATE INDEX idx_bulk_orders_created_at ON bulk_orders(created_at);

-- Row-Level Security
ALTER TABLE bulk_orders ENABLE ROW LEVEL SECURITY;
```

### **bulk_order_items**

```sql
CREATE TABLE bulk_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_order_id UUID NOT NULL REFERENCES bulk_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_bulk_order_items_bulk_order_id ON bulk_order_items(bulk_order_id);
CREATE INDEX idx_bulk_order_items_product_id ON bulk_order_items(product_id);
```

---

## Other Tables

### **transfer_requests**

```sql
CREATE TABLE transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id VARCHAR(50) NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN 
    ('pending', 'in_transit', 'completed', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_quantity CHECK (quantity > 0),
  CONSTRAINT check_different_locations CHECK (from_location_id != to_location_id)
);

-- Indexes
CREATE INDEX idx_transfer_requests_transfer_id ON transfer_requests(transfer_id);
CREATE INDEX idx_transfer_requests_from_location_id ON transfer_requests(from_location_id);
CREATE INDEX idx_transfer_requests_to_location_id ON transfer_requests(to_location_id);
CREATE INDEX idx_transfer_requests_status ON transfer_requests(status);
CREATE INDEX idx_transfer_requests_created_at ON transfer_requests(created_at);
```

### **client_stores**

```sql
CREATE TABLE client_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  address TEXT,
  gst_number VARCHAR(20),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_client_stores_store_name ON client_stores(store_name);
CREATE INDEX idx_client_stores_status ON client_stores(status);
CREATE INDEX idx_client_stores_email ON client_stores(email);
CREATE INDEX idx_client_stores_phone ON client_stores(phone);
```

### **audit_logs** (Immutable)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  before_value JSONB,
  after_value JSONB,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(50),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Immutability
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_update();

CREATE TRIGGER audit_logs_immutable_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_update();

-- Indexes
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);
```

### **idempotency_logs**

```sql
CREATE TABLE idempotency_logs (
  idempotency_key VARCHAR(50) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  result JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

-- Cleanup old records (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_logs WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX idx_idempotency_logs_expires_at ON idempotency_logs(expires_at);
```

---

## Row-Level Security (RLS) Policies

### **users RLS**

```sql
-- Superadmins can see all users
CREATE POLICY users_superadmin ON users
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'superadmin'
);

-- Warehouse/Store managers can see users in their location
CREATE POLICY users_location_based ON users
FOR SELECT
USING (
  (auth.jwt() ->> 'role' IN ('warehouse_manager', 'store_manager')) AND
  location_id = (auth.jwt() ->> 'location_id')::UUID
);

-- Users can see themselves
CREATE POLICY users_self ON users
FOR SELECT
USING (
  id = (auth.jwt() ->> 'user_id')::UUID
);
```

### **inventory RLS**

```sql
-- Superadmins can see all inventory
CREATE POLICY inventory_superadmin ON inventory
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'superadmin'
);

-- Warehouse managers can see their warehouse inventory
CREATE POLICY inventory_warehouse_manager ON inventory
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'warehouse_manager') AND
  location_id = (auth.jwt() ->> 'location_id')::UUID
);

-- Store managers can see their store inventory
CREATE POLICY inventory_store_manager ON inventory
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'store_manager') AND
  location_id = (auth.jwt() ->> 'location_id')::UUID
);
```

### **store_orders RLS**

```sql
-- Superadmins can see all orders
CREATE POLICY store_orders_superadmin ON store_orders
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'superadmin'
);

-- Warehouse managers can see orders for their warehouse
CREATE POLICY store_orders_warehouse_manager ON store_orders
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'warehouse_manager') AND
  warehouse_id = (auth.jwt() ->> 'location_id')::UUID
);

-- Store managers can see only their store's orders
CREATE POLICY store_orders_store_manager ON store_orders
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'store_manager') AND
  store_id = (auth.jwt() ->> 'location_id')::UUID
);
```

### **stock_movements RLS**

```sql
-- Superadmins can see all movements
CREATE POLICY stock_movements_superadmin ON stock_movements
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'superadmin'
);

-- Warehouse managers can see movements for their warehouse
CREATE POLICY stock_movements_warehouse_manager ON stock_movements
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'warehouse_manager') AND
  (from_location_id = (auth.jwt() ->> 'location_id')::UUID OR
   to_location_id = (auth.jwt() ->> 'location_id')::UUID)
);

-- Store managers can see movements for their store
CREATE POLICY stock_movements_store_manager ON stock_movements
FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'store_manager') AND
  to_location_id = (auth.jwt() ->> 'location_id')::UUID
);
```

---

## Migrations

### **Migration 001: Initial Schema**

```sql
-- migrations/001_initial_schema.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run all table creation scripts above
-- Then run RLS policies above
```

### **Running Migrations**

```bash
# Using Flyway
flyway -locations=filesystem:./migrations -url=jdbc:postgresql://... migrate

# Using Knex.js
npx knex migrate:latest

# Manual with psql
psql -h localhost -U postgres -d store_warehouse -f migrations/001_initial_schema.sql
```

---

## Database Optimization

### **Connection Pooling (PgBouncer)**

```
# pgbouncer.ini
[databases]
store_warehouse = host=neon.postgres.vercel-storage.com dbname=store_warehouse

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
max_idle = 600
```

### **Query Performance**

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM store_orders 
WHERE status = 'draft' 
ORDER BY created_at DESC 
LIMIT 10;

-- Vacuum and analyze
VACUUM ANALYZE;

-- Monitor slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- View slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

---

## Backup & Recovery

### **Neon Automated Backups**

Neon provides:
- Continuous backups (every 24 hours minimum)
- Point-in-time recovery (up to 7 days)
- On-demand backups

### **Custom Backup Script**

```bash
#!/bin/bash
# backup.sh

DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_NAME=$DB_NAME
BACKUP_DIR="/backups"

# Full backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Keep only last 7 days
find $BACKUP_DIR -type f -name "backup-*.sql.gz" -mtime +7 -delete
```

**Cron job:**
```
0 2 * * * /scripts/backup.sh
```

### **Recovery**

```bash
# Restore from backup
psql -h localhost -U postgres -d store_warehouse < backup-20260412.sql

# Or stream from Neon
pg_restore -h neon.postgres.vercel-storage.com -U postgres -d store_warehouse backup.dump
```

---

## Monitoring & Maintenance

### **Key Metrics to Monitor**

```sql
-- Active connections
SELECT count(*) as active_connections FROM pg_stat_activity;

-- Index size
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) 
FROM pg_stat_user_indexes ORDER BY pg_relation_size(indexrelid) DESC;

-- Table size
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cache hit ratio
SELECT 
  sum(heap_blks_read) as heap_read, 
  sum(heap_blks_hit) as heap_hit,
  (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) as hit_ratio
FROM pg_statio_user_tables;
```

### **Maintenance Jobs**

```sql
-- Weekly vacuum and analyze
VACUUM ANALYZE;

-- Monthly: Reindex large tables
REINDEX TABLE store_orders;
REINDEX TABLE stock_movements;
REINDEX TABLE audit_logs;

-- Monthly: Check constraint violations
SELECT * FROM pg_constraints WHERE contype = 'c';

-- Clean up old idempotency logs (daily)
DELETE FROM idempotency_logs WHERE expires_at < CURRENT_TIMESTAMP;
```

---

## Production Checklist

- [ ] All tables created with constraints enforced
- [ ] All indexes created (especially on foreign keys, status, created_at)
- [ ] Row-level security enabled and policies tested
- [ ] Immutability triggers on audit_logs and stock_movements
- [ ] Backups configured (automated + manual)
- [ ] Connection pooling configured (PgBouncer)
- [ ] Monitoring alerts set up (slow queries, connection pool)
- [ ] Performance baseline established (query times, table sizes)
- [ ] Test data loaded for development/staging
- [ ] Explain analysis run on critical queries
- [ ] Vacuum and analyze scheduled
- [ ] Encryption at rest verified (Neon handles this)

---

## Troubleshooting

### **Issue: Order approval fails with "insufficient stock"**

```sql
-- Debug: Check inventory state
SELECT 
  p.sku, p.title,
  i.total_stock, i.reserved_stock, i.total_stock - i.reserved_stock as available
FROM store_orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN inventory i ON p.id = i.product_id AND i.location_id = o.warehouse_id
WHERE o.order_id = 'ORD-ST01-20260412-0001';

-- Manual fix: Adjust inventory if data corruption
UPDATE inventory 
SET total_stock = 100 
WHERE product_id = 'uuid' AND location_id = 'uuid';
```

### **Issue: Slow query on store_orders list**

```sql
-- Analyze
EXPLAIN ANALYZE
SELECT * FROM store_orders 
WHERE warehouse_id = 'uuid' AND status IN ('confirmed', 'packed')
ORDER BY created_at DESC;

-- Add index if missing
CREATE INDEX idx_store_orders_warehouse_status 
ON store_orders(warehouse_id, status, created_at DESC);
```

### **Issue: RLS policy blocking valid access**

```sql
-- Test policy
SELECT current_user, current_setting('app.user_role'), current_setting('app.location_id');

-- Set variables for testing
SET app.user_role = 'warehouse_manager';
SET app.location_id = 'uuid';

-- Query should work if policy is correct
SELECT * FROM inventory WHERE location_id = current_setting('app.location_id')::UUID;
```

---

## Future Enhancements

- [ ] Partitioning stock_movements table by date (archive old movements)
- [ ] Materialized views for reporting (inventory snapshots, order metrics)
- [ ] Full-text search on products (already indexed)
- [ ] Time-series tables for inventory trending
- [ ] Data warehousing layer (separate OLAP database)
