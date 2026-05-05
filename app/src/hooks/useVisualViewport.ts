"use client";

import { useEffect, useState } from "react";

export function useVisualViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    offsetTop: 0,
    keyboardOpen: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const baseHeight = window.innerHeight;

    const onResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      const isKeyboardOpen = vv.height < baseHeight * 0.8; // Rough heuristic

      setViewport({
        width: vv.width,
        height: vv.height,
        offsetTop: vv.offsetTop,
        keyboardOpen: isKeyboardOpen,
      });
    };

    window.visualViewport.addEventListener("resize", onResize);
    window.visualViewport.addEventListener("scroll", onResize);
    onResize();

    return () => {
      if (!window.visualViewport) return;
      window.visualViewport.removeEventListener("resize", onResize);
      window.visualViewport.removeEventListener("scroll", onResize);
    };
  }, []);

  return viewport;
}
