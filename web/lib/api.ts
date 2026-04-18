// Full API client

import type { AuthUser } from './auth';

/* ─── Base URL ──────────────────────────────────── */
const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/v1`;

/* ─── Interfaces ────────────────────────────────── */
export type { AuthUser };

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  shortName: string;
  brand: string;
  vendor: string;
  category: string;
  model: string;
  color: string;
  status: 'present' | 'inactive' | 'discontinued';
  customTag?: string;
  customCode?: string;
  image?: string;
  description?: string;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryRow {
  id: string;
  product_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  sku: string;
  product_title: string;
  quantity: number;
  reserved: number;
  available: number;
  threshold: number;
  updated_at: string;
}

export interface LowStockAlert {
  sku: string;
  product_title: string;
  location_code: string;
  available: number;
  threshold: number;
}

export interface LocationInventory {
  location_id: string;
  location_code: string;
  location_name: string;
  items: InventoryRow[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  qty: number;
  available?: number;
}

export interface TimelineEvent {
  step: string;
  actor: string;
  timestamp: string;
  note?: string;
}

export interface StoreOrder {
  id: string;
  store: string;
  store_id: string;
  warehouse: string;
  warehouse_id: string;
  by: string;
  created: string;
  status: 'draft' | 'confirmed' | 'packed' | 'dispatched' | 'store_received' | 'completed' | 'cancelled';
  items: OrderItem[];
  timeline?: TimelineEvent[];
  notes?: string;
}

export interface BulkOrder {
  id: string;
  client_id: string;
  client_name: string;
  warehouse_id: string;
  warehouse: string;
  status: 'draft' | 'confirmed' | 'packed' | 'dispatched' | 'completed' | 'cancelled';
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: AuthUser['role'];
  location_id: string | null;
  location_name: string | null;
  location_code: string | null;
  location_type: 'warehouse' | 'store' | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  type: 'warehouse' | 'store';
  address?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ClientStore {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  sku: string;
  product_title: string;
  location_id: string;
  location_code: string;
  type: 'adjustment' | 'add' | 'order_reserve' | 'order_release' | 'transfer_in' | 'transfer_out';
  quantity: number;
  note?: string;
  actor: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  entity_id?: string;
  entity_type?: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  from_location_id: string;
  from_location_code: string;
  to_location_id: string;
  to_location_code: string;
  product_id: string;
  sku: string;
  product_title: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  actor: string;
  created_at: string;
  completed_at?: string;
}

/* ─── ApiError ──────────────────────────────────── */
export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, status: number, code = 'UNKNOWN', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* ─── Core fetch ────────────────────────────────── */
async function apiFetch<T>(
  path: string,
  token?: string | null,
  options: RequestInit & { extraHeaders?: Record<string, string> } = {}
): Promise<T> {
  const { extraHeaders, ...init } = options;

  const headers: Record<string, string> = { ...extraHeaders };

  // Only set Content-Type to JSON if body is not FormData
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  if (!res.ok) {
    let errBody: { message?: string; code?: string; details?: unknown } = {};
    try { errBody = await res.json(); } catch { /* ignore */ }
    throw new ApiError(
      errBody.message ?? `HTTP ${res.status}`,
      res.status,
      errBody.code ?? String(res.status),
      errBody.details
    );
  }

  return res.json() as Promise<T>;
}

/* ─── Response wrappers ─────────────────────────── */
interface ListResponse<T> { data: T[]; meta: Meta; }
interface DataResponse<T> { data: T; }
interface MessageResponse { message: string; }

/* ─── AUTH ──────────────────────────────────────── */
export const apiLogin = (email: string, password: string) =>
  apiFetch<{ token: string; user: AuthUser }>('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const apiMe = (token: string) =>
  apiFetch<DataResponse<AuthUser>>('/auth/me', token);

export const apiLogout = (token: string) =>
  apiFetch<MessageResponse>('/auth/logout', token, { method: 'POST' });

/* ─── DASHBOARD ─────────────────────────────────── */
export const apiDashboard = (token: string) =>
  apiFetch<DataResponse<Record<string, unknown>>>('/reports/dashboard', token);

/* ─── PRODUCTS ──────────────────────────────────── */
export const apiProducts = (token: string, params?: {
  search?: string; category?: string; brand?: string;
  status?: string; page?: number; limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.category) q.set('category', params.category);
  if (params?.brand) q.set('brand', params.brand);
  if (params?.status) q.set('status', params.status);
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<Product>>(`/products${qs ? `?${qs}` : ''}`, token);
};

export const apiProduct = (token: string, id: string) =>
  apiFetch<DataResponse<Product>>(`/products/${id}`, token);

export const apiCreateProduct = (token: string, body: Partial<Product>) =>
  apiFetch<DataResponse<Product>>('/products', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const apiUpdateProduct = (token: string, id: string, body: Partial<Product>) =>
  apiFetch<DataResponse<Product>>(`/products/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const apiDeleteProduct = (token: string, id: string) =>
  apiFetch<MessageResponse>(`/products/${id}`, token, { method: 'DELETE' });

export const apiProductCategories = (token: string) =>
  apiFetch<DataResponse<string[]>>('/products/categories', token);

export const apiProductBrands = (token: string) =>
  apiFetch<DataResponse<string[]>>('/products/brands', token);

export const apiSkuCheck = (token: string, sku: string) =>
  apiFetch<DataResponse<{ available: boolean }>>(`/products/sku-check?sku=${encodeURIComponent(sku)}`, token);

export const apiUploadProductImage = (token: string, id: string, file: File) => {
  const form = new FormData();
  form.append('image', file);
  return apiFetch<DataResponse<{ url: string }>>(`/products/${id}/image`, token, {
    method: 'POST',
    body: form,
  });
};

/* ─── INVENTORY ─────────────────────────────────── */
export const apiInventory = (token: string, params?: {
  location_id?: string; search?: string; low_stock?: boolean;
  page?: number; limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.location_id) q.set('location_id', params.location_id);
  if (params?.search) q.set('search', params.search);
  if (params?.low_stock) q.set('low_stock', 'true');
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<InventoryRow>>(`/inventory${qs ? `?${qs}` : ''}`, token);
};

export const apiInventoryByLocation = (token: string, locationId: string) =>
  apiFetch<DataResponse<LocationInventory>>(`/inventory/location/${locationId}`, token);

export const apiInventoryLowStock = (token: string) =>
  apiFetch<ListResponse<LowStockAlert>>('/inventory/low-stock', token);

export const apiInventoryAdjust = (token: string, body: {
  product_id: string; location_id: string; quantity: number; note?: string;
}) =>
  apiFetch<MessageResponse>('/inventory/adjust', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const apiInventoryAddStock = (token: string, body: {
  product_id: string; location_id: string; quantity: number; note?: string;
}) =>
  apiFetch<MessageResponse>('/inventory/add', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const apiInventoryMovements = (token: string, params?: {
  product_id?: string; location_id?: string; page?: number; limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.product_id) q.set('product_id', params.product_id);
  if (params?.location_id) q.set('location_id', params.location_id);
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<StockMovement>>(`/inventory/movements${qs ? `?${qs}` : ''}`, token);
};

/* ─── ORDERS ────────────────────────────────────── */
export const apiOrders = (token: string, params?: {
  status?: string; store_id?: string; warehouse_id?: string;
  page?: number; limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.store_id) q.set('store_id', params.store_id);
  if (params?.warehouse_id) q.set('warehouse_id', params.warehouse_id);
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<StoreOrder>>(`/orders${qs ? `?${qs}` : ''}`, token);
};

export const apiOrder = (token: string, id: string) =>
  apiFetch<DataResponse<StoreOrder>>(`/orders/${id}`, token);

export const apiCreateOrder = (token: string, body: {
  store_id: string; warehouse_id: string; items: { product_id: string; qty: number }[]; notes?: string;
}) =>
  apiFetch<DataResponse<StoreOrder>>('/orders', token, {
    method: 'POST',
    body: JSON.stringify(body),
    extraHeaders: { 'X-Idempotency-Key': crypto.randomUUID() },
  });

export const apiApproveOrder = (token: string, id: string) =>
  apiFetch<DataResponse<StoreOrder>>(`/orders/${id}/approve`, token, { method: 'POST' });

export const apiRejectOrder = (token: string, id: string, reason: string) =>
  apiFetch<DataResponse<StoreOrder>>(`/orders/${id}/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const apiPackOrder = (token: string, id: string) =>
  apiFetch<DataResponse<StoreOrder>>(`/orders/${id}/pack`, token, { method: 'POST' });

export const apiDispatchOrder = (token: string, id: string) =>
  apiFetch<DataResponse<StoreOrder>>(`/orders/${id}/dispatch`, token, { method: 'POST' });

export const apiConfirmReceive = (token: string, id: string) =>
  apiFetch<DataResponse<StoreOrder>>(`/orders/${id}/receive`, token, { method: 'POST' });

export const apiCancelOrder = (token: string, id: string, reason?: string) =>
  apiFetch<DataResponse<StoreOrder>>(`/orders/${id}/cancel`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

/* ─── BULK ORDERS ───────────────────────────────── */
export const apiBulkOrders = (token: string, params?: {
  status?: string; page?: number; limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<BulkOrder>>(`/bulk-orders${qs ? `?${qs}` : ''}`, token);
};

export const apiCreateBulkOrder = (token: string, body: {
  client_id: string; warehouse_id: string; items: { product_id: string; qty: number }[];
}) =>
  apiFetch<DataResponse<BulkOrder>>('/bulk-orders', token, {
    method: 'POST',
    body: JSON.stringify(body),
    extraHeaders: { 'X-Idempotency-Key': crypto.randomUUID() },
  });

export const apiPackBulkOrder = (token: string, id: string) =>
  apiFetch<DataResponse<BulkOrder>>(`/bulk-orders/${id}/pack`, token, { method: 'POST' });

export const apiDispatchBulkOrder = (token: string, id: string) =>
  apiFetch<DataResponse<BulkOrder>>(`/bulk-orders/${id}/dispatch`, token, { method: 'POST' });

export const apiCancelBulkOrder = (token: string, id: string, reason?: string) =>
  apiFetch<DataResponse<BulkOrder>>(`/bulk-orders/${id}/cancel`, token, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

/* ─── USERS ─────────────────────────────────────── */
export const apiUsers = (token: string, params?: { page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<User>>(`/users${qs ? `?${qs}` : ''}`, token);
};

export const apiCreateUser = (token: string, body: {
  name: string; email: string; password: string;
  role: AuthUser['role']; location_id?: string;
}) =>
  apiFetch<DataResponse<User>>('/users', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const apiUpdateUser = (token: string, id: string, body: Partial<User & { password?: string }>) =>
  apiFetch<DataResponse<User>>(`/users/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const apiUserStatus = (token: string, id: string, status: 'active' | 'inactive') =>
  apiFetch<DataResponse<User>>(`/users/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

/* ─── LOCATIONS ─────────────────────────────────── */
export const apiLocations = (token: string, params?: { type?: 'warehouse' | 'store' }) => {
  const q = new URLSearchParams();
  if (params?.type) q.set('type', params.type);
  const qs = q.toString();
  return apiFetch<ListResponse<Location>>(`/locations${qs ? `?${qs}` : ''}`, token);
};

export const apiCreateLocation = (token: string, body: {
  code: string; name: string; type: 'warehouse' | 'store'; address?: string;
}) =>
  apiFetch<DataResponse<Location>>('/locations', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const apiUpdateLocation = (token: string, id: string, body: Partial<Location>) =>
  apiFetch<DataResponse<Location>>(`/locations/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

/* ─── CLIENTS ───────────────────────────────────── */
export const apiClients = (token: string, params?: { page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<ClientStore>>(`/clients${qs ? `?${qs}` : ''}`, token);
};

export const apiCreateClient = (token: string, body: {
  name: string; contact_name: string; contact_email: string;
  contact_phone?: string; address?: string;
}) =>
  apiFetch<DataResponse<ClientStore>>('/clients', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const apiUpdateClient = (token: string, id: string, body: Partial<ClientStore>) =>
  apiFetch<DataResponse<ClientStore>>(`/clients/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const apiClientStatus = (token: string, id: string, status: 'active' | 'inactive') =>
  apiFetch<DataResponse<ClientStore>>(`/clients/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

/* ─── REPORTS ───────────────────────────────────── */
export const apiAnalytics = (token: string, params?: { date_from?: string; date_to?: string }) => {
  const q = new URLSearchParams();
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to) q.set('date_to', params.date_to);
  const qs = q.toString();
  return apiFetch<DataResponse<Record<string, unknown>>>(`/reports/analytics${qs ? `?${qs}` : ''}`, token);
};

export const apiAuditLog = (token: string, params?: {
  actor?: string; entity_type?: string; page?: number; limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.actor) q.set('actor', params.actor);
  if (params?.entity_type) q.set('entity_type', params.entity_type);
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<Record<string, unknown>>>(`/reports/audit-log${qs ? `?${qs}` : ''}`, token);
};

/* ─── NOTIFICATIONS ─────────────────────────────── */
export const apiNotifications = (token: string) =>
  apiFetch<ListResponse<Notification>>('/notifications', token);

export const apiMarkNotificationRead = (token: string, id: string) =>
  apiFetch<MessageResponse>(`/notifications/${id}/read`, token, { method: 'PATCH' });

export const apiMarkAllNotificationsRead = (token: string) =>
  apiFetch<MessageResponse>('/notifications/read-all', token, { method: 'PATCH' });

/* ─── TRANSFERS ─────────────────────────────────── */
export const apiTransfers = (token: string, params?: { page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<ListResponse<Transfer>>(`/transfers${qs ? `?${qs}` : ''}`, token);
};

export const apiCreateTransfer = (token: string, body: {
  from_location_id: string; to_location_id: string;
  product_id: string; quantity: number; note?: string;
}) =>
  apiFetch<DataResponse<Transfer>>('/transfers', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

/* ─── Legacy type aliases ───────────────────────── */
/** @deprecated Use InventoryRow instead */
export type InventoryItem = InventoryRow & {
  title: string;
  available_stock: number;
  reserved_stock: number;
  total_stock: number;
};

/* ─── Legacy compatibility shims (for old prototype pages) ─ */
/** @deprecated Use apiLogin instead */
export async function loginForRole(email: string, password: string): Promise<string> {
  const r = await apiLogin(email, password);
  return r.token;
}

/** @deprecated Use apiProducts instead */
export async function getProducts(token: string): Promise<Product[]> {
  const r = await apiProducts(token, { limit: 100 });
  return r.data;
}

/** @deprecated Use apiBulkOrders instead */
export async function getBulkOrders(token: string): Promise<BulkOrder[]> {
  const r = await apiBulkOrders(token, { limit: 100 });
  return r.data;
}

/** @deprecated Use apiClients instead */
export async function getClients(token: string): Promise<(ClientStore & { store_name: string })[]> {
  const r = await apiClients(token, { limit: 100 });
  return r.data.map(c => ({ ...c, store_name: c.name }));
}

/** @deprecated Use apiInventory instead */
export async function getInventory(token: string, _locationCode: string): Promise<InventoryItem[]> {
  const r = await apiInventory(token, { limit: 100 });
  return r.data.map(row => ({
    ...row,
    title: row.product_title,
    available_stock: row.available,
    reserved_stock: row.reserved,
    total_stock: row.quantity,
  }));
}

/** @deprecated Use apiCreateBulkOrder instead */
export async function createBulkOrder(args: {
  token: string; clientStoreId: string; warehouseId: string; productId: string; qty: number;
}): Promise<{ id: string; order_id: string; status: string; created_at: string }> {
  const r = await apiCreateBulkOrder(args.token, {
    client_id: args.clientStoreId,
    warehouse_id: args.warehouseId,
    items: [{ product_id: args.productId, qty: args.qty }],
  });
  return { id: r.data.id, order_id: r.data.id, status: r.data.status, created_at: r.data.created_at };
}

/** @deprecated Use apiCreateOrder instead */
export async function createStoreOrder(args: {
  token: string; storeId: string; warehouseId: string; productId: string; qty: number;
}): Promise<{ order_id: string; status: string }> {
  const r = await apiCreateOrder(args.token, {
    store_id: args.storeId,
    warehouse_id: args.warehouseId,
    items: [{ product_id: args.productId, qty: args.qty }],
  });
  return { order_id: r.data.id, status: r.data.status };
}
