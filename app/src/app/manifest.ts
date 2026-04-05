import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Viral Sync Nepal',
    short_name: 'Viral Sync',
    description: 'QR-first referral and reward passbook for Nepal-first merchant pilots.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4efe6',
    theme_color: '#f4efe6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
