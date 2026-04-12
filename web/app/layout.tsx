import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Segoe UI, sans-serif', background: '#f7f7f8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>{children}</div>
      </body>
    </html>
  );
}
