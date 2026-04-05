import type { Metadata, Viewport } from 'next';
import { Anek_Devanagari, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import MerchantShell from '@/components/MerchantShell';

const sans = Anek_Devanagari({
  subsets: ['latin', 'devanagari'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Viral Sync Nepal',
    template: '%s · Viral Sync Nepal',
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          <MerchantShell>{children}</MerchantShell>
        </AuthProvider>
      </body>
    </html>
  );
}
