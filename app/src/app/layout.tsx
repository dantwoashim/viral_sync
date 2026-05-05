import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';
import { PremiumMobileNav } from '@/components/premium/PremiumUi';
import { EdgeSwipeNavigation } from '@/components/product/EdgeSwipeNavigation';

const sans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const serif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Viral Sync | Verified Traffic',
    template: '%s - Viral Sync',
  },
  description: 'Outcome settlement infrastructure for receipt-backed Solana payouts.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Viral Sync',
  },
  manifest: '/manifest.json', // We'll assume a manifest exists or browsers will ignore it gracefully
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Disable input zoom
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable} scroll-smooth antialiased overflow-x-hidden`}>
      <body className="h-[100dvh] overflow-hidden overflow-x-hidden text-gray-900 bg-white font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
        <EdgeSwipeNavigation />
        {children}
        <PremiumMobileNav />
      </body>
    </html>
  );
}
