import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  title: 'POS MH Tiendita',
  description: 'Punto de venta para tienditas y abarrotes en México.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

// Layout raíz. Los providers globales (Theme + Query + Auth + Toaster) se montan
// en <Providers>. `suppressHydrationWarning` es necesario porque next-themes
// inyecta la clase de tema en <html> antes de la hidratación.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
