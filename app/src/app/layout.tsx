import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import MerchantShell from '@/components/MerchantShell';

export const metadata: Metadata = {
  title: {
    default: 'Viral Sync Nepal',
    template: '%s | Viral Sync Nepal',
  },
  description: 'Share places you love and unlock rewards with your people.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4efe6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <MerchantShell>{children}</MerchantShell>
        </AuthProvider>
      </body>
    </html>
  );
}
