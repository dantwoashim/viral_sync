import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';

const root = process.cwd();

const requiredFiles = [
  'app/src/app/page.tsx',
  'app/src/app/loading.tsx',
  'app/src/app/demo/page.tsx',
  'app/src/app/receipt/[id]/page.tsx',
  'app/src/app/market/[slug]/page.tsx',
  'app/src/app/participate/[slug]/page.tsx',
  'app/src/app/verify/[slug]/page.tsx',
  'app/src/app/ledger/page.tsx',
  'app/src/app/for-sponsors/page.tsx',
  'app/src/app/how-it-works/page.tsx',
  'app/src/app/api/civic/markets/route.ts',
  'app/src/app/api/civic/market/[slug]/route.ts',
  'app/src/app/api/civic/participation/[slug]/route.ts',
  'app/src/app/api/civic/participation-pass/route.ts',
  'app/src/app/api/civic/conviction-signal/route.ts',
  'app/src/app/api/civic/verifier/confirm/route.ts',
  'app/src/app/api/civic/replay-proof/route.ts',
  'app/src/app/api/civic/markets/[slug]/route.ts',
  'app/src/app/api/civic/verifier/[slug]/route.ts',
  'app/src/app/api/civic/ledger/route.ts',
  'app/src/components/civic/CivicExperience.tsx',
  'app/src/components/civic/CivicParticipationFlow.tsx',
  'app/src/components/civic/VerifierStationFlow.tsx',
  'app/src/components/civic/ReplayRejectionPanel.tsx',
  'app/src/lib/civic/civicMarket.ts',
  'app/src/lib/civic/participationPass.ts',
  'app/src/lib/civic/types.ts',
  'scripts/verify-civic-receipt.mjs',
];

const failures = [];

for (const file of requiredFiles) {
  const absolute = path.join(root, file);
  if (!existsSync(absolute)) failures.push({ file, reason: 'missing' });
  else if (statSync(absolute).size === 0) failures.push({ file, reason: 'empty' });
}

function includes(file, text) {
  return readFileSync(path.join(root, file), 'utf8').includes(text);
}

const layout = readFileSync(path.join(root, 'app/src/app/layout.tsx'), 'utf8');
if (layout.includes('Playfair_Display')) failures.push({ file: 'app/src/app/layout.tsx', reason: 'legacy display font remains' });
if (layout.includes('maximumScale') || layout.includes('userScalable')) failures.push({ file: 'app/src/app/layout.tsx', reason: 'viewport zoom restriction remains' });
if (layout.includes('h-[100dvh] overflow-hidden')) failures.push({ file: 'app/src/app/layout.tsx', reason: 'fixed-height body shell remains' });

const routeChecks = [
  ['app/src/lib/demo-mode.ts', '/market/'],
  ['app/src/lib/demo-mode.ts', '/participate/'],
  ['app/src/lib/demo-mode.ts', '/verify/'],
  ['app/src/lib/demo-mode.ts', '/api/civic/'],
  ['app/next.config.ts', 'destination: "/for-sponsors"'],
  ['app/next.config.ts', 'destination: "/market/ward12-water-repair"'],
  ['app/next.config.ts', 'destination: "/participate/ward12-water-repair"'],
  ['app/next.config.ts', 'destination: "/verify/ward12-water-repair"'],
  ['app/next.config.ts', 'source: "/proof"'],
  ['app/src/components/product/EdgeSwipeNavigation.tsx', '/market/ward12-water-repair'],
  ['app/src/components/premium/PremiumUi.tsx', '/participate/ward12-water-repair'],
  ['app/src/components/premium/PremiumUi.tsx', 'Civic Impact Markets'],
  ['app/src/app/api/civic/participation-pass/route.ts', 'issueCivicParticipationPass'],
  ['app/src/app/api/civic/conviction-signal/route.ts', 'buildCivicConvictionSignal'],
  ['app/src/lib/civic/convictionSignal.ts', 'deriveCivicConvictionSignalPda'],
  ['app/src/components/civic/CivicParticipationFlow.tsx', '/api/civic/conviction-signal'],
  ['package.json', 'civic:conviction-artifact'],
  ['app/src/app/api/civic/verifier/confirm/route.ts', 'verifyCivicParticipationPass'],
  ['app/src/app/api/civic/replay-proof/route.ts', 'buildReplayRejectionProof'],
  ['app/src/components/civic/CivicParticipationFlow.tsx', '/api/civic/participation-pass'],
  ['app/src/components/civic/VerifierStationFlow.tsx', '/api/civic/verifier/confirm'],
  ['app/src/components/civic/ReplayRejectionPanel.tsx', 'civic-fraud-gauntlet.json'],
  ['app/src/components/civic/CivicExperience.tsx', 'npm run civic:verify-receipt'],
  ['app/src/components/civic/CivicExperience.tsx', 'civic-proof-sidecar.json'],
  ['package.json', 'civic:verify-receipt'],
  ['sdk/src/index.ts', 'verifyCivicReceiptArtifacts'],
  ['app/src/components/premium/PremiumUi.tsx', '/verify/ward12-water-repair'],
];

for (const [file, text] of routeChecks) {
  if (!includes(file, text)) failures.push({ file, reason: `missing ${text}` });
}

const primaryFiles = [
  'app/src/app/page.tsx',
  'app/src/app/loading.tsx',
  'app/src/app/demo/page.tsx',
  'app/src/app/receipt/[id]/page.tsx',
  'app/src/components/civic/CivicExperience.tsx',
  'app/src/components/product/EdgeSwipeNavigation.tsx',
  'app/src/components/premium/PremiumUi.tsx',
];

for (const file of primaryFiles) {
  const text = readFileSync(path.join(root, file), 'utf8');
  if (/\/merchant\//i.test(text)) failures.push({ file, reason: 'primary navigation links to legacy merchant route' });
  if (/for-merchants/i.test(text)) failures.push({ file, reason: 'primary navigation links to legacy merchant page' });
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checkedFiles: requiredFiles.length, failures: [] }, null, 2));
