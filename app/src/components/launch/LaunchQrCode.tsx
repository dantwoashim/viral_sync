'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function LaunchQrCode({
  value,
  className = '',
  label,
}: {
  value: string | null;
  className?: string;
  label?: string;
}) {
  const [rendered, setRendered] = useState<{ value: string; svg: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!value) {
      return;
    }

    void QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#1d140f',
        light: '#0000',
      },
    }).then((next) => {
      if (!cancelled) {
        setRendered({ value, svg: next });
      }
    }).catch(() => {
      if (!cancelled) {
        setRendered(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  const svg = rendered?.value === value ? rendered.svg : null;

  return (
    <div className={`launch-qr ${className}`.trim()} aria-label={label}>
      {svg ? (
        <div className="launch-qr-art" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="launch-qr-fallback">QR pending</div>
      )}
    </div>
  );
}
