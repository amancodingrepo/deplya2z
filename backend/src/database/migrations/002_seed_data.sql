-- Seed Data for Store & Warehouse Supply Management System
-- This file contains initial data for development and testing

-- Insert sample locations (1 warehouse, 2 stores)
INSERT INTO locations (id, name, type, address, geo_lat, geo_lng, geofence_radius, location_code, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Main Warehouse', 'warehouse', '123 Warehouse Street, Industrial Area', 28.6139, 77.2090, 100, 'WH01', 'active'),
('22222222-2222-2222-2222-222222222222', 'Store 01 - Downtown', 'store', '456 Main Street, Downtown', 28.6200, 77.2100, 50, 'ST01', 'active'),
('33333333-3333-3333-3333-333333333333', 'Store 02 - Uptown', 'store', '789 High Street, Uptown', 28.6300, 77.2200, 50, 'ST02', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample users (password: "password123" hashed with bcrypt)
-- Note: In production, passwords should be set via secure means
INSERT INTO users (id, email, password_hash, name, phone, role, location_id, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@storewarehouse.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeWZL.HlYigu', 'Super Admin', '+911234567890', 'superadmin', NULL, 'active'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'warehouse@storewarehouse.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeWZL.HlYigu', 'Warehouse Manager', '+911234567891', 'warehouse_manager', '11111111-1111-1111-1111-111111111111', 'active'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'store1@storewarehouse.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeWZL.HlYigu', 'Store 01 Manager', '+911234567892', 'store_manager', '22222222-2222-2222-2222-222222222222', 'active'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'store2@storewarehouse.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5aeWZL.HlYigu', 'Store 02 Manager', '+911234567893', 'store_manager', '33333333-3333-3333-3333-333333333333', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO products (id, title, short_name, sku, brand, category, model, color, status, custom_style, image_url) VALUES
('11111111-aaaa-4aaa-8aaa-111111111111', 'Samsung 55-inch Smart TV', 'TV-55-SM', 'SKU-TV-001', 'Samsung', 'Electronics', 'QN55Q80C', 'Black', 'present', 'featured', 'https://via.placeholder.com/300'),
('22222222-bbbb-4bbb-8bbb-222222222222', 'LG French Door Refrigerator', 'FRIDGE-LG', 'SKU-FR-001', 'LG', 'Appliances', 'LFXS26973S', 'Stainless Steel', 'present', 'default', 'https://via.placeholder.com/300'),
('33333333-cccc-4ccc-8ccc-333333333333', 'Sony Wireless Headphones', 'HP-WH-SN', 'SKU-HP-001', 'Sony', 'Electronics', 'WH-1000XM5', 'Black', 'present', 'premium', 'https://via.placeholder.com/300'),
('44444444-dddd-4ddd-8ddd-444444444444', 'Whirlpool Washing Machine', 'WM-WH', 'SKU-WM-001', 'Whirlpool', 'Appliances', 'WFW9620HC', 'White', 'present', 'default', 'https://via.placeholder.com/300'),
('55555555-eeee-4eee-8eee-555555555555', 'Dell Laptop 15 inch', 'LAPTOP-DL', 'SKU-LP-001', 'Dell', 'Computers', 'Inspiron 15', 'Silver', 'present', 'catalogue_ready', 'https://via.placeholder.com/300')
ON CONFLICT (id) DO NOTHING;

-- Insert sample inventory for warehouse
INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock) VALUES
('11111111-aaaa-4aaa-8aaa-111111111111', '11111111-1111-1111-1111-111111111111', 50, 0, 0),
('22222222-bbbb-4bbb-8bbb-222222222222', '11111111-1111-1111-1111-111111111111', 30, 0, 0),
('33333333-cccc-4ccc-8ccc-333333333333', '11111111-1111-1111-1111-111111111111', 100, 0, 0),
('44444444-dddd-4ddd-8ddd-444444444444', '11111111-1111-1111-1111-111111111111', 25, 0, 0),
('55555555-eeee-4eee-8eee-555555555555', '11111111-1111-1111-1111-111111111111', 40, 0, 0)
ON CONFLICT (product_id, location_id) DO NOTHING;

-- Insert sample inventory for stores (initially low or zero stock)
INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock) VALUES
('11111111-aaaa-4aaa-8aaa-111111111111', '22222222-2222-2222-2222-222222222222', 2, 0, 0),
('22222222-bbbb-4bbb-8bbb-222222222222', '22222222-2222-2222-2222-222222222222', 1, 0, 0),
('33333333-cccc-4ccc-8ccc-333333333333', '22222222-2222-2222-2222-222222222222', 5, 0, 0),
('11111111-aaaa-4aaa-8aaa-111111111111', '33333333-3333-3333-3333-333333333333', 3, 0, 0),
('44444444-dddd-4ddd-8ddd-444444444444', '33333333-3333-3333-3333-333333333333', 1, 0, 0)
ON CONFLICT (product_id, location_id) DO NOTHING;

-- Insert sample client stores
INSERT INTO client_stores (id, store_name, owner_name, phone, email, address, gst_number, status) VALUES
('aaaaaaaa-1111-4111-8111-aaaaaaaa1111', 'ABC Retail Store', 'John Doe', '+919876543210', 'john@abcretail.com', '123 Retail Avenue, City Center', '29ABCDE1234F1Z5', 'active'),
('bbbbbbbb-2222-4222-8222-bbbbbbbb2222', 'XYZ Electronics', 'Jane Smith', '+919876543211', 'jane@xyzelectronics.com', '456 Tech Park, IT Hub', '27XYZAB5678G2W6', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert audit log entries for seed data creation
INSERT INTO audit_logs (actor_user_id, action, entity_type, details, success) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'create', 'system', 'Initial seed data loaded', true);
