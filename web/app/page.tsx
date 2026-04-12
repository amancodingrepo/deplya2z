import Link from 'next/link';

import { AppHeader } from '../components/AppHeader';

export default function HomePage() {
  return (
    <main>
      <AppHeader />
      <h1>Store & Warehouse Web Console</h1>
      <p>Single backend and shared database model with mobile app roles.</p>
      <ul>
        <li>
          <Link href="/warehouse">Warehouse inventory list</Link>
        </li>
        <li>
          <Link href="/store">Store inventory + request form</Link>
        </li>
        <li>
          <Link href="/bulk-orders">Bulk order management</Link>
        </li>
        <li>
          <Link href="/store-request">Warehouse list + Store request demo</Link>
        </li>
      </ul>
    </main>
  );
}
