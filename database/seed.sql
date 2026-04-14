-- Seed data for local development matching PRD flows

INSERT INTO locations (id, location_code, name, type, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'WH01', 'Main Warehouse', 'warehouse', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'ST01', 'Store 01', 'store', 'active')
ON CONFLICT (location_code) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, role, location_id, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@storewarehouse.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeWZL.HlYigu', 'System Admin', 'superadmin', NULL, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'warehouse@storewarehouse.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeWZL.HlYigu', 'Warehouse Manager', 'warehouse_manager', '11111111-1111-1111-1111-111111111111', 'active'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'store1@storewarehouse.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeWZL.HlYigu', 'Store Manager', 'store_manager', '22222222-2222-2222-2222-222222222222', 'active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (id, title, sku, brand, status)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Samsung 55in TV', 'SKU-TV-001', 'Samsung', 'present'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'LG Double Door Fridge', 'SKU-FRD-001', 'LG', 'present')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO client_stores (id, store_name, owner_name, phone, email, address, gst_number, status)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'ABC Retail Store', 'Amit Kumar', '+919999999999', 'contact@abcretail.example', 'MG Road, Bengaluru', '29ABCDE1234F1Z5', 'active')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 17, 2, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 9, 1, 0),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 3, 0, 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 1, 0, 0)
ON CONFLICT (product_id, location_id) DO NOTHING;
