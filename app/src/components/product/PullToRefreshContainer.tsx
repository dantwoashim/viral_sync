"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "@phosphor-icons/react";

export function PullToRefreshContainer({ children, onRefresh }: { children: React.ReactNode, onRefresh?: () => Promise<void> }) {
  const [pullProgress, setPullProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isPullingUi, setIsPullingUi] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    const threshold = 80; // px
    const maxPull = 120; // px

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
        setIsPullingUi(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling || refreshing) return;
      currentY = e.touches[0].clientY;
      const pull = Math.max(0, currentY - startY);

      if (pull > 0 && el.scrollTop === 0) {
        e.preventDefault(); // prevent native pull to refresh
        const resistancePull = pull * 0.4; // rubber band effect
        setPullProgress(Math.min(resistancePull, maxPull) / threshold);
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling || refreshing) return;
      isPulling = false;
      setIsPullingUi(false);

      if (pullProgress >= 1) {
        setRefreshing(true);
        if (onRefresh) {
          await onRefresh();
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
        setRefreshing(false);
      }
      setPullProgress(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [refreshing, pullProgress, onRefresh]);

  const yOffset = refreshing ? 60 : Math.min(pullProgress * 60, 60);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col bg-[#0A0A0A]">
      <div
        className="absolute top-0 left-0 w-full flex items-center justify-center pointer-events-none z-10 transition-transform duration-200"
        style={{ transform: `translateY(${refreshing ? 16 : Math.max(0, yOffset - 32)}px)` }}
      >
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white shadow-xl ${refreshing ? "animate-spin" : ""}`}
          style={{
            opacity: Math.min(pullProgress * 1.5, 1),
            transform: refreshing ? "scale(1)" : `rotate(${pullProgress * 180}deg) scale(${Math.min(pullProgress + 0.2, 1)})`
          }}
        >
          {refreshing ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56M21 12V3m0 9h-9" /></svg>
          ) : (
            <ArrowDown size={20} weight="bold" />
          )}
        </div>
      </div>

      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto w-full relative z-20"
        style={{
          WebkitOverflowScrolling: "touch",
          transform: `translateY(${yOffset}px)`,
          transition: isPullingUi ? "none" : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {children}
      </main>
    </div>
  );
}
