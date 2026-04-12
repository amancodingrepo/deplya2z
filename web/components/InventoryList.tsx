import type { InventoryItem } from '../lib/api';

type Props = {
  title: string;
  rows: InventoryItem[];
};

export function InventoryList({ title, rows }: Props) {
  return (
    <section style={{ border: '1px solid #d4d4d8', borderRadius: 8, padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">SKU</th>
            <th align="left">Title</th>
            <th align="right">Available</th>
            <th align="right">Reserved</th>
            <th align="right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={`${item.location_id}-${item.product_id}`}>
              <td>{item.sku}</td>
              <td>{item.title}</td>
              <td align="right">{item.available_stock}</td>
              <td align="right">{item.reserved_stock}</td>
              <td align="right">{item.total_stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
