import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'A2Z Supply Management',
  description: 'Store & Warehouse Supply Management System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
