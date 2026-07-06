import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: {
    default: 'Civic Impact Markets | Viral Sync',
    template: '%s - Civic Impact Markets',
  },
  description: 'Verified civic forecasting and sponsor-funded action rewards settled with Solana receipt evidence.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Civic Markets',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fafaf6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} scroll-smooth antialiased overflow-x-hidden`}>
      <body className="min-h-dvh overflow-x-hidden bg-[var(--civic-paper)] text-[var(--civic-ink)] font-sans selection:bg-[var(--civic-green)] selection:text-white">
        <EdgeSwipeNavigation />
        {children}
        <PremiumMobileNav />
      </body>
    </html>
  );
}
