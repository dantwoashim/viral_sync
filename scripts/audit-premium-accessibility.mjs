import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const checks = [
  {
    name: 'Global focus-visible style',
    file: 'app/src/app/globals.css',
    pattern: ':focus-visible',
    reason: 'Keyboard users need a visible focus indicator on every premium route.',
  },
  {
    name: 'Reduced motion support',
    file: 'app/src/app/globals.css',
    pattern: 'prefers-reduced-motion: reduce',
    reason: 'Motion must support users who request reduced animation.',
  },
  {
    name: 'Async live regions',
    file: 'app/src/components/premium/PremiumUi.tsx',
    pattern: 'aria-live="polite"',
    reason: 'Transaction and async state changes must be announced without stealing focus.',
  },
  {
    name: 'Error alert state',
    file: 'app/src/components/premium/PremiumUi.tsx',
    pattern: "role={tone === 'error' ? 'alert' : 'status'}",
    reason: 'Blocking errors need alert semantics.',
  },
  {
    name: 'Primary navigation label',
    file: 'app/src/components/premium/PremiumUi.tsx',
    pattern: 'aria-label="Primary navigation"',
    reason: 'Screen reader navigation landmarks must be named.',
  },
  {
    name: 'Demo proof quality label',
    file: 'app/src/app/demo/page.tsx',
    pattern: 'aria-label="Demo proof quality"',
    reason: 'Metric groups need accessible names.',
  },
  {
    name: 'Demo rehearsal label',
    file: 'app/src/app/demo/page.tsx',
    pattern: 'aria-label="Demo rehearsal readiness"',
    reason: 'The final rehearsal module must be discoverable by assistive tech.',
  },
  {
    name: 'Scorecard metrics label',
    file: 'app/src/app/premium-scorecard/page.tsx',
    pattern: 'aria-label="Premium readiness metrics"',
    reason: 'The final scorecard metrics need a named section.',
  },
];

const failures = [];
const passed = [];

for (const check of checks) {
  const resolved = path.resolve(check.file);
  if (!existsSync(resolved)) {
    failures.push({ ...check, failure: 'missing file' });
    continue;
  }

  const source = readFileSync(resolved, 'utf8');
  if (!source.includes(check.pattern)) {
    failures.push({ ...check, failure: `missing pattern: ${check.pattern}` });
    continue;
  }

  passed.push(check.name);
}

const css = existsSync(path.resolve('app/src/app/globals.css'))
  ? readFileSync(path.resolve('app/src/app/globals.css'), 'utf8')
  : '';
if (/font-size:\s*calc\([^;]*vw/i.test(css)) {
  failures.push({
    name: 'Viewport-scaled text audit',
    file: 'app/src/app/globals.css',
    failure: 'found calc-based viewport text sizing',
    reason: 'Text should use stable clamp scales, not direct viewport-width formulas.',
  });
}

const result = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  checks: checks.length + 1,
  passed,
  failures,
};

mkdirSync(path.resolve('tmp'), { recursive: true });
writeFileSync(path.resolve('tmp/premium-accessibility-audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
