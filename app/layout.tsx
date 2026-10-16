import './globals.css';
import type { Metadata, Viewport } from 'next';
import { StoreProvider } from '@/lib/store';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Chothia Bros VAT',
  description: 'Supplier invoice VAT capture for Johannesburg Zips CC t/a Chothia Bros',
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = { themeColor: '#1E88C7', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <body>
        <StoreProvider><Shell>{children}</Shell></StoreProvider>
      </body>
    </html>
  );
}
