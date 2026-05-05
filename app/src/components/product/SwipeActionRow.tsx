"use client";

import { useRef } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";

export function SwipeActionRow({ children, onBlock, onRefund }: { children: React.ReactNode; onBlock: () => void; onRefund: () => void }) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const actionWidth = 160; // Total width of hidden actions

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -actionWidth / 2 || velocity < -500) {
      controls.start({ x: -actionWidth, transition: { type: "spring", stiffness: 400, damping: 30 } });
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  const handleReset = () => {
    controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
  };

  return (
    <div className="relative overflow-hidden w-full" ref={containerRef}>
      {/* Hidden Action Buttons behind the row */}
      <div className="absolute inset-y-0 right-0 flex max-w-full z-0 h-[full] my-1 mr-1 rounded-r-xl overflow-hidden shadow-inner bg-[#1A1A1A] w-[160px]">
         <button
           onClick={() => { onBlock(); handleReset(); }}
           className="flex-1 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs flex flex-col items-center justify-center transition-colors shadow-inner"
         >
           <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
           </svg>
           Block
         </button>
         <button
           onClick={() => { onRefund(); handleReset(); }}
           className="flex-1 bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-xs flex flex-col items-center justify-center transition-colors shadow-inner"
         >
           <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
           </svg>
           Refund
         </button>
      </div>

      {/* Swipeable Foreground */}
      <motion.div
        className="relative z-10 w-full"
        drag="x"
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ x: 0 }}
        onTap={handleReset} // tapping foreground puts it back if open
      >
        <div className="pointer-events-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
