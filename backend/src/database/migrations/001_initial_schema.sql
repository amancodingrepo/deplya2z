-- Store & Warehouse Supply Management System - Initial Schema
-- Version: 2.0 Production

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'warehouse_manager', 'store_manager')),
  location_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location_id ON users(location_id);
CREATE INDEX idx_users_status ON users(status);

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('warehouse', 'store')),
  address TEXT NOT NULL,
  geo_lat DECIMAL(10, 8),
  geo_lng DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 100 CHECK (geofence_radius > 0),
  location_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_status ON locations(status);
CREATE INDEX idx_locations_location_code ON locations(location_code);

-- Add foreign key after locations table exists
ALTER TABLE users ADD CONSTRAINT fk_users_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  brand VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  color VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'inactive', 'discontinued')),
  custom_style VARCHAR(50) DEFAULT 'default' CHECK (custom_style IN ('default', 'premium', 'featured', 'sale', 'catalogue_ready')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_products_title ON products(title);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_model ON products(model);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  total_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
  issued_stock INTEGER NOT NULL DEFAULT 0 CHECK (issued_stock >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (product_id, location_id),
  CONSTRAINT chk_reserved_lte_total CHECK (reserved_stock <= total_stock)
);

CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_location_id ON inventory(location_id);
CREATE INDEX idx_inventory_updated_at ON inventory(updated_at);

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  to_location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('order_reserved', 'order_deducted', 'order_issued', 'transfer', 'manual_adjustment')),
  reference_type VARCHAR(50) CHECK (reference_type IN ('store_order', 'bulk_order', 'transfer_request', 'manual', 'system')),
  reference_id VARCHAR(255),
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_from_location_id ON stock_movements(from_location_id);
CREATE INDEX idx_stock_movements_to_location_id ON stock_movements(to_location_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_reference_type ON stock_movements(reference_type);

-- Store Orders Table
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id VARCHAR(100) UNIQUE NOT NULL,
  store_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'packed', 'dispatched', 'store_received', 'completed', 'cancelled')),
  items JSONB NOT NULL,
  reserved_amount INTEGER DEFAULT 0 CHECK (reserved_amount >= 0),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  dispatch_notes TEXT,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_store_warehouse_different CHECK (store_id != warehouse_id)
);

CREATE INDEX idx_store_orders_order_id ON store_orders(order_id);
CREATE INDEX idx_store_orders_store_id ON store_orders(store_id);
CREATE INDEX idx_store_orders_warehouse_id ON store_orders(warehouse_id);
CREATE INDEX idx_store_orders_status ON store_orders(status);
CREATE INDEX idx_store_orders_created_at ON store_orders(created_at);

-- Client Stores Table
CREATE TABLE IF NOT EXISTS client_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  gst_number VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_stores_store_name ON client_stores(store_name);
CREATE INDEX idx_client_stores_status ON client_stores(status);
CREATE INDEX idx_client_stores_created_at ON client_stores(created_at);

-- Bulk Orders Table
CREATE TABLE IF NOT EXISTS bulk_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id VARCHAR(100) UNIQUE NOT NULL,
  client_store_id UUID NOT NULL REFERENCES client_stores(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'packed', 'dispatched', 'completed', 'cancelled')),
  items JSONB NOT NULL,
  reserved_amount INTEGER DEFAULT 0 CHECK (reserved_amount >= 0),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dispatch_notes TEXT,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bulk_orders_order_id ON bulk_orders(order_id);
CREATE INDEX idx_bulk_orders_client_store_id ON bulk_orders(client_store_id);
CREATE INDEX idx_bulk_orders_warehouse_id ON bulk_orders(warehouse_id);
CREATE INDEX idx_bulk_orders_status ON bulk_orders(status);
CREATE INDEX idx_bulk_orders_created_at ON bulk_orders(created_at);

-- Transfer Requests Table
CREATE TABLE IF NOT EXISTS transfer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id VARCHAR(100) UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_from_to_different CHECK (from_location_id != to_location_id)
);

CREATE INDEX idx_transfer_requests_transfer_id ON transfer_requests(transfer_id);
CREATE INDEX idx_transfer_requests_from_location_id ON transfer_requests(from_location_id);
CREATE INDEX idx_transfer_requests_to_location_id ON transfer_requests(to_location_id);
CREATE INDEX idx_transfer_requests_status ON transfer_requests(status);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'dispatch', 'confirm_receive', 'cancel', 'error')),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('user', 'product', 'order', 'inventory', 'transfer', 'system', 'store_order', 'bulk_order')),
  entity_id UUID,
  before_value JSONB,
  after_value JSONB,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);

-- Idempotency Keys Table (for preventing duplicate requests)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  response JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_orders_updated_at BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bulk_orders_updated_at BEFORE UPDATE ON bulk_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_stores_updated_at BEFORE UPDATE ON client_stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_requests_updated_at BEFORE UPDATE ON transfer_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
