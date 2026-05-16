export type UserRole = 'superadmin' | 'warehouse_manager' | 'store_manager' | 'staff';
export type UserStatus = 'active' | 'inactive' | 'blocked';

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'packed'
  | 'dispatched'
  | 'store_received'
  | 'completed'
  | 'cancelled';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  location_id: string | null;
  status: UserStatus;
};

export type EmployeeUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  location_id: string | null;
  location_name: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  location_code: string;
  name: string;
  type: 'warehouse' | 'store';
  status: 'active' | 'inactive';
};

export type Product = {
  id: string;
  sku: string;
  title: string;
  brand: string;
  status: 'present' | 'inactive' | 'discontinued';
};

export type InventoryRow = {
  product_id: string;
  sku: string;
  title: string;
  location_id: string;
  available_stock: number;
  reserved_stock: number;
  total_stock: number;
  issued_stock: number;
};

export type OrderItem = {
  product_id: string;
  title: string;
  sku: string;
  qty: number;
};

export type StoreOrder = {
  id: string;
  order_id: string;
  store_id: string;
  warehouse_id: string;
  status: OrderStatus;
  items: OrderItem[];
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BulkOrderStatus = 'confirmed' | 'packed' | 'dispatched' | 'completed' | 'cancelled';

export type BulkOrder = {
  id: string;
  order_id: string;
  client_store_id: string;
  warehouse_id: string;
  status: BulkOrderStatus;
  items: Array<{ product_id: string; qty: number }>;
  reserved_amount: number;
  created_by: string;
  dispatched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  product_id: string;
  from_location_id: string | null;
  to_location_id: string;
  quantity: number;
  movement_type: 'order_reserved' | 'order_deducted' | 'order_issued' | 'transfer' | 'manual_adjustment';
  reference_type: 'store_order' | 'bulk_order' | 'transfer_request' | 'manual' | 'system';
  reference_id: string;
  reason?: string | null;
  created_by: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: 'store_order' | 'inventory' | 'auth';
  entity_id: string;
  success: boolean;
  details: string;
  created_at: string;
};
