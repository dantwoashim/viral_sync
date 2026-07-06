"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const ROUTES = [
  "/",
  "/market/ward12-water-repair",
  "/participate/ward12-water-repair",
  "/verify/ward12-water-repair",
  "/ledger"
];

export function EdgeSwipeNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let startX = 0;
    let startY = 0;
    let isEdgeSwipe = false;
    const threshold = 100; // minimum horizontal distance to trigger navigation

    const onTouchStart = (e: TouchEvent) => {
      // Only trigger if started near the physical edges (e.g. left 30px or right 30px)
      // or we can allow global swipes if we want, but edge swiping is safer.
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      if (startX < 40 || startX > window.innerWidth - 40) {
        isEdgeSwipe = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe) return;
      isEdgeSwipe = false;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Ensure it's a strongly horizontal swipe
      if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        const currentIndex = ROUTES.indexOf(pathname);
        if (currentIndex === -1) return;

        if (deltaX > 0) {
          // Swipe Right -> Go to previous tab
          if (currentIndex > 0) {
            router.push(ROUTES[currentIndex - 1]);
          }
        } else {
          // Swipe Left -> Go to next tab
          if (currentIndex < ROUTES.length - 1) {
            router.push(ROUTES[currentIndex + 1]);
          }
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);

  return null;
}
