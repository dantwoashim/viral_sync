import { existsSync, readFileSync } from 'fs';
import path from 'path';

const requiredDocs = [
  'docs/premium-execution-contract.md',
  'docs/premium-redesign-year-plan.md',
  'docs/premium-product-narrative.md',
  'docs/premium-ux-route-inventory.md',
  'docs/premium-information-architecture.md',
  'docs/premium-benchmark-board.md',
  'docs/week-1-4-premium-redesign-completion.md',
  'docs/premium-design-system.md',
  'docs/week-5-12-premium-redesign-completion.md',
  'docs/week-13-20-premium-redesign-completion.md',
  'docs/week-21-28-premium-redesign-completion.md',
  'docs/week-29-38-premium-redesign-completion.md',
  'docs/premium-visual-regression-checklist.md',
  'docs/week-39-52-premium-redesign-completion.md',
  'docs/premium-demo-rehearsal.md',
  'docs/premium-backup-package.md',
  'docs/premium-user-test-log.md',
  'docs/premium-final-scorecard.md',
  'docs/premium-release-candidate.md',
  'scripts/audit-premium-copy.mjs',
  'scripts/capture-premium-screenshots.mjs',
  'scripts/audit-premium-visuals.mjs',
  'scripts/audit-premium-accessibility.mjs',
  'scripts/audit-premium-performance.mjs',
  'scripts/prepare-premium-release-candidate.mjs',
  'scripts/run-premium-final-gate.mjs',
  'app/src/lib/premium/design-system.ts',
  'app/src/components/premium/PremiumUi.tsx',
  'app/src/components/premium/PremiumWorkspace.tsx',
  'app/src/components/premium/CopyValueButton.tsx',
  'app/src/app/design-system/page.tsx',
  'app/src/app/demo/page.tsx',
  'app/src/app/offer/[token]/page.tsx',
  'app/src/app/redeem/page.tsx',
  'app/src/app/merchant/scan/page.tsx',
  'app/src/app/merchant/today/page.tsx',
  'app/src/app/merchant/campaigns/page.tsx',
  'app/src/app/merchant/ledger/page.tsx',
  'app/src/app/admin/relayer/page.tsx',
  'app/src/app/developer/page.tsx',
  'app/src/app/example-receipt-graph/page.tsx',
  'app/src/app/premium-scorecard/page.tsx',
  'app/src/app/receipts/[id]/page.tsx',
  'app/src/app/causal-graph/page.tsx',
];

const requiredPhrases: Array<[string, string]> = [
  ['docs/premium-execution-contract.md', 'A week is not complete only because a document exists'],
  ['docs/premium-execution-contract.md', 'Starting week 5'],
  ['docs/premium-redesign-year-plan.md', 'From week 5 onward'],
  ['docs/premium-redesign-year-plan.md', 'Screenshot QA tooling'],
  ['docs/premium-redesign-year-plan.md', 'Final scorecard'],
  ['docs/premium-product-narrative.md', 'Pay rewards only after verified visits'],
  ['docs/premium-ux-route-inventory.md', 'Primary Demo Route Set'],
  ['docs/premium-information-architecture.md', 'One shell per audience'],
  ['docs/premium-benchmark-board.md', 'What does Viral Sync do?'],
  ['docs/premium-design-system.md', 'old broad beige/brown passbook dominance is deprecated'],
  ['docs/week-5-12-premium-redesign-completion.md', 'Weeks 5-12 are complete'],
  ['app/src/lib/premium/design-system.ts', 'proofLifecycleSteps'],
  ['app/src/components/premium/PremiumUi.tsx', 'PremiumTransactionPanel'],
  ['app/src/app/page.tsx', 'Pay rewards only after verified visits'],
  ['app/src/app/demo/page.tsx', 'readLocalnetProofSummary'],
  ['app/src/app/invite/page.tsx', 'Claim the visit. Keep the proof.'],
  ['docs/week-13-20-premium-redesign-completion.md', 'Weeks 13-20 complete'],
  ['app/src/app/offer/[token]/page.tsx', 'Claim the reward. Prove the visit.'],
  ['app/src/app/redeem/page.tsx', 'Show one code. Get one receipt.'],
  ['app/src/app/merchant/scan/page.tsx', 'Confirm the visit at the counter.'],
  ['app/src/app/receipts/[id]/page.tsx', 'This visit has a receipt.'],
  ['app/src/app/causal-graph/page.tsx', 'A visit graph anyone can inspect.'],
  ['app/src/app/demo/page.tsx', 'Replay proof'],
  ['app/src/app/demo/page.tsx', 'PremiumTransactionStatus'],
  ['app/src/app/demo/page.tsx', 'PremiumCompletionMoment'],
  ['docs/week-21-28-premium-redesign-completion.md', 'Weeks 21-28 complete'],
  ['app/src/components/premium/PremiumWorkspace.tsx', 'No consumer passbook chrome'],
  ['app/src/app/merchant/today/page.tsx', 'Today shows vault, visits, settlements, risk, and the next action.'],
  ['app/src/app/merchant/campaigns/page.tsx', 'Campaigns make funding, cap, and close states explicit.'],
  ['app/src/app/merchant/ledger/page.tsx', 'Merchant ledger rows include signatures, status, amount, and copy action.'],
  ['app/src/app/admin/relayer/page.tsx', 'Relayer control room for caps, replay, and failure states.'],
  ['app/src/app/admin/relayer/page.tsx', 'No passbook visual metaphor in ops.'],
  ['app/src/app/developer/page.tsx', 'Developers can verify receipts without touching the Viral Sync app.'],
  ['app/src/app/developer/page.tsx', 'fetchGraph'],
  ['app/src/app/example-receipt-graph/page.tsx', 'A third-party developer can verify receipt from docs.'],
  ['docs/week-29-38-premium-redesign-completion.md', 'Weeks 29-38 complete'],
  ['docs/premium-visual-regression-checklist.md', 'npm run premium:screenshots'],
  ['scripts/audit-premium-copy.mjs', 'bannedVisibleCopy'],
  ['scripts/capture-premium-screenshots.mjs', 'missingFocusStyles'],
  ['scripts/audit-premium-visuals.mjs', 'appears blank or under-rendered'],
  ['app/src/components/premium/PremiumUi.tsx', 'PremiumAsyncState'],
  ['app/src/components/premium/PremiumUi.tsx', 'PremiumTransactionStatus'],
  ['app/src/components/premium/PremiumUi.tsx', 'PremiumCompletionMoment'],
  ['app/src/app/globals.css', 'prefers-reduced-motion: reduce'],
  ['app/src/app/globals.css', ':focus-visible'],
  ['docs/week-39-52-premium-redesign-completion.md', 'Weeks 39-52 complete'],
  ['docs/premium-demo-rehearsal.md', 'Target duration: 1:52'],
  ['docs/premium-backup-package.md', 'The final demo cannot depend on one live network moment'],
  ['docs/premium-user-test-log.md', 'zero-budget log'],
  ['docs/premium-final-scorecard.md', 'Premium Final Scorecard'],
  ['docs/premium-release-candidate.md', 'Premium Release Candidate'],
  ['scripts/capture-premium-screenshots.mjs', 'PREMIUM_VIEWPORT_SET'],
  ['scripts/capture-premium-screenshots.mjs', 'mobile-320'],
  ['scripts/capture-premium-screenshots.mjs', 'wide-1728'],
  ['scripts/audit-premium-visuals.mjs', '--require-final-viewports'],
  ['scripts/audit-premium-accessibility.mjs', 'prefers-reduced-motion: reduce'],
  ['scripts/audit-premium-performance.mjs', 'routeLoadMs'],
  ['scripts/prepare-premium-release-candidate.mjs', 'Release candidate frozen'],
  ['scripts/run-premium-final-gate.mjs', 'Final screenshot capture'],
  ['app/src/app/demo/page.tsx', 'Two-minute rehearsal'],
  ['app/src/app/demo/page.tsx', 'Backup path ready'],
  ['app/src/app/premium-scorecard/page.tsx', 'Premium readiness scorecard'],
];

function read(filePath: string) {
  return readFileSync(path.resolve(filePath), 'utf8');
}

function main() {
  const failures: string[] = [];

  for (const filePath of requiredDocs) {
    if (!existsSync(path.resolve(filePath))) {
      failures.push(`Missing ${filePath}`);
    }
  }

  for (const [filePath, phrase] of requiredPhrases) {
    if (existsSync(path.resolve(filePath)) && !read(filePath).includes(phrase)) {
      failures.push(`${filePath} must include: ${phrase}`);
    }
  }

  const yearPlan = existsSync(path.resolve('docs/premium-redesign-year-plan.md'))
    ? read('docs/premium-redesign-year-plan.md')
    : '';
  const weekMatches = yearPlan.match(/\|\s*\d+\s*\|/g) ?? [];
  const uniqueWeeks = new Set(weekMatches.map((match) => match.match(/\d+/)?.[0]).filter(Boolean));
  if (uniqueWeeks.size !== 52) {
    failures.push(`Premium year plan must define exactly 52 weeks; found ${uniqueWeeks.size}.`);
  }

  const docsIndex = existsSync(path.resolve('docs/README.md')) ? read('docs/README.md') : '';
  for (const label of [
    'Premium product narrative',
    'Premium UX route inventory',
    'Premium information architecture',
    'Premium benchmark board',
    'Premium design system',
    'Week 5-12 premium redesign completion',
    'Week 13-20 premium redesign completion',
    'Week 21-28 premium redesign completion',
    'Week 29-38 premium redesign completion',
    'Premium visual regression checklist',
    'Week 39-52 premium redesign completion',
    'Premium demo rehearsal',
    'Premium backup package',
    'Premium user test log',
    'Premium final scorecard',
    'Premium release candidate',
  ]) {
    if (!docsIndex.includes(label)) {
      failures.push(`docs/README.md must link ${label}.`);
    }
  }

  console.log(JSON.stringify({
    ok: failures.length === 0,
    weeksDefined: uniqueWeeks.size,
    requiredDocs: requiredDocs.length,
    failures,
  }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
