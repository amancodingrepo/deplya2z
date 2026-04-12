import Link from 'next/link';

export function AppHeader() {
  return (
    <header
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: '1px solid #d4d4d8',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>Store & Warehouse Web Console</h1>
      <nav style={{ display: 'flex', gap: 14 }}>
        <Link href="/">Home</Link>
        <Link href="/warehouse">Warehouse</Link>
        <Link href="/store">Store</Link>
        <Link href="/bulk-orders">Bulk Orders</Link>
        <Link href="/store-request">Combined Demo</Link>
      </nav>
    </header>
  );
}
