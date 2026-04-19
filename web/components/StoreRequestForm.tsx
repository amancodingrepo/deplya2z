'use client';

import { FormEvent, useMemo, useState } from 'react';

import type { Product } from '../lib/api';
import { createStoreOrder as createStoreOrderLegacy } from '../lib/api';

type Props = {
  token: string;
  storeId: string;
  warehouseId: string;
  products: Product[];
};

export function StoreRequestForm({ token, storeId, warehouseId, products }: Props) {
  const [productId, setProductId] = useState(products[0]?.id ?? 'P001');
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');

  const productOptions = useMemo(() => {
    return products.map((product) => ({
      value: product.id,
      label: `${product.title} (${product.sku})`,
    }));
  }, [products]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('Submitting...');

    try {
      const result = await createStoreOrderLegacy({ token, storeId, warehouseId, productId, qty });
      setMessage(`Created ${result.order_id} (${result.status})`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ border: '1px solid #d4d4d8', borderRadius: 8, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Store Request Items</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        <label>
          Product ID
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
        Submit Request
      </button>
      <p>{message}</p>
    </form>
  );
}
