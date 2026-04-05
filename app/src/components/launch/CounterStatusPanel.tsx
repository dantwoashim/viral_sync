'use client';

import { CheckCircle, QrCode, WarningCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface CounterStatusPanelProps {
  status: 'idle' | 'confirmed' | 'blocked';
}

export default function CounterStatusPanel({ status }: CounterStatusPanelProps) {
  const headline = status === 'confirmed' ? 'OK' : status === 'blocked' ? 'NO' : 'SCAN';
  const copy = status === 'confirmed'
    ? 'Reward confirmed'
    : status === 'blocked'
      ? 'Check code again'
      : 'Manual or QR input';

  return (
    <div className={`scan-stage ${status !== 'idle' ? `is-${status}` : ''}`}>
      <motion.div
        className="scan-orb"
        animate={{
          scale: [1, 1.04, 1],
          opacity: [0.92, 1, 0.92],
        }}
        transition={{
          duration: 2.6,
          ease: 'easeInOut',
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <div className="scan-grid">
          <div className="scan-grid-inner" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="scan-stage-copy"
      >
        <div className="eyebrow">
          <QrCode size={18} />
          Waiting for customer code
        </div>
        <div className="scan-headline">{headline}</div>
        <div className="code-pill">
          {status === 'confirmed' ? <CheckCircle size={18} /> : <WarningCircle size={18} />}
          {copy}
        </div>
      </motion.div>
    </div>
  );
}
