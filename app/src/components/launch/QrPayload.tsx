'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrPayload({ payload, label }: { payload: string; label: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 6,
      color: { dark: '#11100f', light: '#fff7ec' },
    }).then((dataUrl) => {
      if (!cancelled) {
        setSrc(dataUrl);
      }
    }).catch(() => {
      if (!cancelled) {
        setSrc('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!src) {
    return <div className="ref-qr is-loading" aria-label={`${label} loading`} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img className="ref-qr-image" src={src} alt={label} />;
}
