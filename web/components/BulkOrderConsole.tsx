'use client';

import { FormEvent, useMemo, useState } from 'react';

import type { BulkOrder, ClientStore, Product } from '../lib/api';
import { createBulkOrder as createBulkOrderLegacy } from '../lib/api';

type Props = {
  token: string;
  warehouseId: string;
  clients: ClientStore[];
  products: Product[];
  initialOrders: BulkOrder[];
};

export function BulkOrderConsole({ token, warehouseId, clients, products, initialOrders }: Props) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [orders, setOrders] = useState(initialOrders);
  const [message, setMessage] = useState('');

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: client.id,
        label: (client as ClientStore & { store_name?: string }).store_name ?? client.name,
      })),
    [clients],
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: `${product.title} (${product.sku})`,
      })),
    [products],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clientId || !productId || qty <= 0) {
      setMessage('Select a client, product, and valid quantity.');
      return;
    }

    setMessage('Submitting bulk order...');
    try {
      const created = await createBulkOrderLegacy({
        token,
        clientStoreId: clientId,
        warehouseId,
        productId,
        qty,
      });

      setOrders((prev) => [
        {
          id: created.id,
          status: created.status as BulkOrder['status'],
          client_id: clientId,
          client_name: '',
          warehouse_id: warehouseId,
          warehouse: warehouseId,
          items: [{ id: '', product_id: productId, sku: '', name: '', qty }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setMessage(`Created ${created.id} (${created.status})`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <form onSubmit={onSubmit} style={{ border: '1px solid #d4d4d8', borderRadius: 8, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Create Bulk Order</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label>
            Client Store
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: '100%' }}>
              {clientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product
            <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: '100%' }}>
              {productOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
        </div>
        <button type="submit" style={{ marginTop: 12 }}>
          Create Bulk Order
        </button>
        <p>{message}</p>
      </form>

      <div style={{ border: '1px solid #d4d4d8', borderRadius: 8, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Recent Bulk Orders</h2>
        {orders.length === 0 ? <p>No bulk orders yet.</p> : null}
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          {orders.map((order) => (
            <li key={order.id}>
              <strong>{order.id}</strong> - {order.status} - {new Date(order.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
