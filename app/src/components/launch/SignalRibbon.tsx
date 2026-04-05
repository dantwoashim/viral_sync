'use client';

import { motion } from 'framer-motion';

interface SignalRibbonProps {
  items: string[];
}

export default function SignalRibbon({ items }: SignalRibbonProps) {
  const trackItems = [...items, ...items];

  return (
    <div className="signal-ribbon" aria-hidden="true">
      <motion.div
        className="signal-track"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 18,
          ease: 'linear',
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {trackItems.map((item, index) => (
          <span key={`${item}-${index}`} className="signal-pill">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
