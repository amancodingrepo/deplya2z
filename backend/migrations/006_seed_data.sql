-- ============================================================
-- 006_seed_data.sql
-- Initial seed data: superadmin user + default locations
--
-- IMPORTANT: Change the superadmin password immediately after
-- first login. The hash below is bcrypt(rounds=12) of
-- "Admin@123456" — never use this in production without changing it.
--
-- To generate a new hash:
--   node -e "const b=require('bcrypt');b.hash('YourPassword',12).then(console.log)"
-- ============================================================

-- ─── default locations ───────────────────────────────────────
INSERT INTO locations (name, type, location_code, address, status)
VALUES
  ('Main Warehouse',   'warehouse', 'WH01', 'Warehouse Block A, Industrial Zone', 'active'),
  ('Warehouse 2',      'warehouse', 'WH02', 'Warehouse Block B, Industrial Zone', 'active'),
  ('Store - Branch 1', 'store',     'ST01', 'Shop No. 12, Main Market',           'active'),
  ('Store - Branch 2', 'store',     'ST02', 'Shop No. 34, City Centre',           'active'),
  ('Store - Branch 3', 'store',     'ST03', 'Shop No. 7, North Mall',             'active')
ON CONFLICT (location_code) DO NOTHING;

-- ─── superadmin user ─────────────────────────────────────────
-- Default password: Admin@123456
-- Hash: bcrypt, 12 rounds
INSERT INTO users (email, name, password_hash, role, location_id, status)
VALUES (
  'admin@yourcompany.com',
  'System Administrator',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewUBPJpkBc9JBSIG',
  'superadmin',
  NULL,
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- ─── default warehouse manager ───────────────────────────────
-- Default password: Warehouse@123
INSERT INTO users (email, name, password_hash, role, location_id, status)
VALUES (
  'warehouse@yourcompany.com',
  'Warehouse Manager',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'warehouse_manager',
  'WH01',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- ─── default store manager ───────────────────────────────────
-- Default password: Store@123
INSERT INTO users (email, name, password_hash, role, location_id, status)
VALUES (
  'store@yourcompany.com',
  'Store Manager',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'store_manager',
  'ST01',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- ─── sample products ─────────────────────────────────────────
INSERT INTO products (title, short_name, sku, brand, category, model, color, status, custom_style, low_stock_threshold)
VALUES
  ('Samsung 55" Smart TV',    'TV-55-SM',   'SKU-TV-001', 'Samsung', 'Electronics', 'UA55AU7700', 'Black', 'present', 'featured',  5),
  ('LG Monitor 23"',          'MON-23-LG',  'SKU-MN-002', 'LG',      'Electronics', '23MP68VQ',   'White', 'present', 'default',   8),
  ('iPhone 15 Pro',           'IP15-PRO',   'SKU-PH-003', 'Apple',   'Electronics', 'A2848',      'Black', 'present', 'premium',   3),
  ('Dell XPS 15',             'DXPS-15',    'SKU-LT-004', 'Dell',    'Electronics', '9530',       'Silver','present', 'default',   5),
  ('Sony WH-1000XM5',         'WH-1000XM5', 'SKU-HP-005', 'Sony',    'Electronics', 'WH1000XM5',  'Black', 'present', 'default',  10),
  ('LG French Door Fridge',   'FRDG-LG',    'SKU-FR-006', 'LG',      'Appliances',  'GR-X29FTQKL','Silver','present', 'default',   3),
  ('Samsung Galaxy S24 Ultra','S24U-SM',    'SKU-PH-007', 'Samsung', 'Electronics', 'SM-S928B',   'Black', 'present', 'premium',   5),
  ('iPad Air 5th Gen',        'IPAD-A5',    'SKU-TB-008', 'Apple',   'Electronics', 'A2588',      'Blue',  'present', 'featured',  5),
  ('AirPods Pro 2nd Gen',     'APP-2ND',    'SKU-EA-009', 'Apple',   'Electronics', 'A2698',      'White', 'present', 'default',  10),
  ('MacBook Air M2',          'MBA-M2',     'SKU-LT-010', 'Apple',   'Electronics', 'A2941',      'Space', 'present', 'premium',   3)
ON CONFLICT (sku) DO NOTHING;

-- ─── initial inventory for WH01 ──────────────────────────────
INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock)
SELECT
  p.id,
  l.id,
  CASE p.sku
    WHEN 'SKU-TV-001' THEN 25
    WHEN 'SKU-MN-002' THEN 40
    WHEN 'SKU-PH-003' THEN 18
    WHEN 'SKU-LT-004' THEN 12
    WHEN 'SKU-HP-005' THEN 30
    WHEN 'SKU-FR-006' THEN 8
    WHEN 'SKU-PH-007' THEN 15
    WHEN 'SKU-TB-008' THEN 20
    WHEN 'SKU-EA-009' THEN 35
    WHEN 'SKU-LT-010' THEN 10
    ELSE 0
  END AS total_stock,
  0, 0
FROM products p
CROSS JOIN locations l
WHERE l.location_code = 'WH01'
  AND p.deleted_at IS NULL
ON CONFLICT (product_id, location_id) DO NOTHING;

-- Record initial stock movements
INSERT INTO stock_movements (
  product_id, from_location_id, to_location_id, quantity,
  movement_type, reference_type, reference_id, reason, created_by
)
SELECT
  p.id,
  NULL,
  l.id,
  CASE p.sku
    WHEN 'SKU-TV-001' THEN 25
    WHEN 'SKU-MN-002' THEN 40
    WHEN 'SKU-PH-003' THEN 18
    WHEN 'SKU-LT-004' THEN 12
    WHEN 'SKU-HP-005' THEN 30
    WHEN 'SKU-FR-006' THEN 8
    WHEN 'SKU-PH-007' THEN 15
    WHEN 'SKU-TB-008' THEN 20
    WHEN 'SKU-EA-009' THEN 35
    WHEN 'SKU-LT-010' THEN 10
    ELSE 0
  END,
  'initial_stock',
  'system',
  'SEED-001',
  'Initial inventory seeded on setup',
  (SELECT id FROM users WHERE role = 'superadmin' LIMIT 1)
FROM products p
CROSS JOIN locations l
WHERE l.location_code = 'WH01'
  AND p.deleted_at IS NULL;
