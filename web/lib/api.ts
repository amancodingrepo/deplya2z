export type InventoryItem = {
  product_id: string;
  sku: string;
  title: string;
  location_id: string;
  available_stock: number;
  reserved_stock: number;
  total_stock: number;
};

export type StoreOrderResponse = {
  id: string;
  order_id: string;
  status: string;
};

export type BulkOrder = {
  id: string;
  order_id: string;
  status: string;
  client_store_id: string;
  warehouse_id: string;
  items: Array<{ product_id: string; qty: number }>;
  created_at: string;
};

export type ClientStore = {
  id: string;
  store_name: string;
  owner_name: string | null;
  status: string;
};

type LoginResponse = {
  token: string;
};

export type Product = {
  id: string;
  sku: string;
  title: string;
  brand: string;
  status: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/v1';

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ code: 'REQUEST_FAILED' }));
    throw new Error(payload.code ?? `HTTP_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getInventory(token: string, locationId: string) {
  return request<InventoryItem[]>(`/inventory?location_id=${encodeURIComponent(locationId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getProducts(token: string, q = '') {
  return request<Product[]>(`/products?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createStoreOrder(input: {
  token: string;
  storeId: string;
  warehouseId: string;
  productId: string;
  qty: number;
}) {
  const idempotencyKey = crypto.randomUUID();

  return request<StoreOrderResponse>('/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      store_id: input.storeId,
      warehouse_id: input.warehouseId,
      items: [{ product_id: input.productId, qty: input.qty }],
    }),
  });
}

export async function loginForRole(email: string, password: string) {
  const response = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return response.token;
}

export async function getClients(token: string) {
  return request<ClientStore[]>('/clients', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getBulkOrders(token: string) {
  return request<BulkOrder[]>('/bulk-orders', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createBulkOrder(input: {
  token: string;
  clientStoreId: string;
  warehouseId: string;
  productId: string;
  qty: number;
}) {
  const idempotencyKey = crypto.randomUUID();
  return request<{ id: string; order_id: string; status: string }>('/bulk-orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      client_store_id: input.clientStoreId,
      warehouse_id: input.warehouseId,
      items: [{ product_id: input.productId, qty: input.qty }],
    }),
  });
}
