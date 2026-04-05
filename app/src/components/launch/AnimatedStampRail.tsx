'use client';

import { motion } from 'framer-motion';

interface AnimatedStampRailProps {
  progressCurrent: number;
  progressTotal: number;
  stamps: string[];
}

export default function AnimatedStampRail({
  progressCurrent,
  progressTotal,
  stamps,
}: AnimatedStampRailProps) {
  const width = progressTotal > 0 ? `${(progressCurrent / progressTotal) * 100}%` : '0%';

  return (
    <div className="stamp-rail">
      <div className="progress-bar">
        <motion.span
          initial={{ width: '0%' }}
          animate={{ width }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="stamp-track">
        {stamps.map((stamp, index) => (
          <motion.div
            key={stamp}
            className={`stamp ${index < progressCurrent ? 'is-complete' : ''}`}
            initial={{ opacity: 0, y: 20, rotate: index % 2 === 0 ? -4 : 4 }}
            animate={{ opacity: 1, y: 0, rotate: index < progressCurrent ? -2 : 0 }}
            transition={{
              duration: 0.55,
              delay: 0.12 * index,
              type: 'spring',
              stiffness: 110,
              damping: 18,
            }}
          >
            {stamp}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
