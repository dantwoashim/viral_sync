'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';

export default function MouseTilt({
  children,
  className = "",
  perspective = 2000,
  maxTilt = 5,
  scale = 1
}: {
  children: ReactNode,
  className?: string,
  perspective?: number,
  maxTilt?: number,
  scale?: number
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({
    transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
    transition: 'transform 0.5s var(--spring-bouncy)'
  });

  useEffect(() => {
    // Enable gyroscope on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile || typeof window === 'undefined' || !window.DeviceOrientationEvent) return;

    let initialGamma: number | null = null;
    let initialBeta: number | null = null;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // Must be running in a secure context, and the user must have given permission where applicable
      if (e.gamma === null || e.beta === null) return;

      if (initialGamma === null) initialGamma = e.gamma;
      if (initialBeta === null) initialBeta = e.beta;

      const deltaGamma = e.gamma - initialGamma;
      const deltaBeta = e.beta - initialBeta;

      const clamp = (val: number, max: number) => Math.max(Math.min(val, max), -max);

      const maxAngle = 30;
      const tiltY = clamp(deltaGamma / maxAngle, 1) * maxTilt * 2;
      const tiltX = clamp(deltaBeta / maxAngle, 1) * maxTilt * 2;

      setStyle({
        transform: `perspective(${perspective}px) rotateX(${-tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`,
        transition: 'transform 0.2s linear'
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [perspective, maxTilt, scale]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate mouse position relative to the center of the element (-1 to 1)
    const mouseX = (e.clientX - rect.left) / width;
    const mouseY = (e.clientY - rect.top) / height;

    const tiltX = (0.5 - mouseY) * maxTilt * 2;
    const tiltY = (mouseX - 0.5) * maxTilt * 2;

    setStyle({
      transform: `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`,
      transition: 'transform 0.1s linear'
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
      transition: 'transform 0.8s var(--spring-bouncy)'
    });
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, willChange: 'transform' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
