'use client';

import { motion } from 'framer-motion';

interface RouteAtlasItem {
  title: string;
  meta: string;
  complete: boolean;
}

interface RouteAtlasProps {
  routes: RouteAtlasItem[];
}

const nodePositions = [
  { x: 18, y: 22 },
  { x: 48, y: 48 },
  { x: 68, y: 72 },
  { x: 62, y: 20 },
];

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return '';
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const controlX = (previous.x + current.x) / 2;
    path += ` Q ${controlX} ${previous.y}, ${current.x} ${current.y}`;
  }

  return path;
}

export default function RouteAtlas({ routes }: RouteAtlasProps) {
  const positionedRoutes = routes.map((route, index) => ({
    ...route,
    position: nodePositions[index % nodePositions.length],
  }));
  const path = buildPath(positionedRoutes.map((route) => route.position));

  return (
    <div className="route-atlas-board" aria-hidden="true">
      <svg className="route-atlas-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          className="route-atlas-path"
          d={path}
          initial={{ pathLength: 0.2, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: [0.45, 0.8, 0.45] }}
          transition={{
            pathLength: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
          }}
        />
      </svg>

      {positionedRoutes.map((route, index) => (
        <motion.div
          key={route.title}
          className={`route-atlas-node ${route.complete ? 'is-complete' : ''}`}
          initial={{ opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
          transition={{
            opacity: { duration: 0.45, delay: 0.1 * index },
            y: { duration: 0.45, delay: 0.1 * index, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 2.8, delay: 0.1 * index, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
          }}
          style={{
            left: `${route.position.x}%`,
            top: `${route.position.y}%`,
          }}
        >
          <span className="route-atlas-dot" />
          <div className="route-atlas-label">
            <strong>{route.title}</strong>
            <span>{route.meta}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
