import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const manifestPath = process.argv[2] || 'tmp/premium-screenshots/manifest.json';
const requireFinalViewports = process.argv.includes('--require-final-viewports');
const resolvedManifest = path.resolve(manifestPath);

if (!existsSync(resolvedManifest)) {
  console.error(JSON.stringify({
    ok: false,
    failure: `Missing screenshot manifest: ${manifestPath}`,
  }, null, 2));
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolvedManifest, 'utf8'));
const results = Array.isArray(manifest.results) ? manifest.results : [];
const failures = [];
const finalViewportWidths = [320, 390, 430, 1024, 1440, 1728];

for (const result of results) {
  const label = `${result.route}:${result.viewport?.width}`;
  if (result.overflow) failures.push(`${label} has horizontal overflow.`);
  if (result.oldChrome) failures.push(`${label} shows old consumer/passbook chrome.`);
  if (!result.h1 || result.h1.trim().length < 6) failures.push(`${label} has no meaningful h1.`);
  if (Number(result.textLength ?? 0) < 80) failures.push(`${label} appears blank or under-rendered.`);
  if (result.bannedCopy?.length) failures.push(`${label} contains banned copy: ${result.bannedCopy.join(', ')}`);
  if (result.missingFocusStyles) failures.push(`${label} did not load focus-visible styles.`);
}

if (requireFinalViewports) {
  const routes = new Map();
  for (const result of results) {
    if (!routes.has(result.route)) routes.set(result.route, new Set());
    routes.get(result.route).add(Number(result.viewport?.width));
  }

  for (const [route, widths] of routes) {
    for (const requiredWidth of finalViewportWidths) {
      if (!widths.has(requiredWidth)) {
        failures.push(`${route} is missing final viewport width ${requiredWidth}.`);
      }
    }
  }

  if (routes.size === 0) {
    failures.push('No routes were captured for final viewport validation.');
  }
}

console.log(JSON.stringify({
  ok: failures.length === 0,
  manifest: resolvedManifest,
  screenshots: results.length,
  finalViewportGate: requireFinalViewports,
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
