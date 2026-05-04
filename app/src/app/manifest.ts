import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Viral Sync',
    short_name: 'Viral Sync',
    description: 'Outcome settlement infrastructure for receipt-backed Solana payouts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4efe6',
    theme_color: '#f4efe6',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
