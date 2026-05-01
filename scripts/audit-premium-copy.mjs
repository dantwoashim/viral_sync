import { readFileSync } from 'node:fs';

const primaryUiFiles = [
  'app/src/app/page.tsx',
  'app/src/app/demo/page.tsx',
  'app/src/app/invite/page.tsx',
  'app/src/app/offer/[token]/page.tsx',
  'app/src/app/redeem/page.tsx',
  'app/src/app/merchant/scan/page.tsx',
  'app/src/app/receipts/[id]/page.tsx',
  'app/src/app/causal-graph/page.tsx',
  'app/src/app/merchant/today/page.tsx',
  'app/src/app/merchant/campaigns/page.tsx',
  'app/src/app/merchant/ledger/page.tsx',
  'app/src/app/admin/relayer/page.tsx',
  'app/src/app/developer/page.tsx',
  'app/src/app/example-receipt-graph/page.tsx',
  'app/src/components/premium/PremiumWorkspace.tsx',
];

const bannedVisibleCopy = [
  /\bWeek\s+\d+\b/i,
  /judge-visible/i,
  /Judge script/i,
  /hackathon/i,
  /student project/i,
  /basic SaaS/i,
  /good enough/i,
];

const failures = [];

for (const file of primaryUiFiles) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of bannedVisibleCopy) {
    const match = source.match(pattern);
    if (match) {
      failures.push(`${file} contains banned product-screen copy: ${match[0]}`);
    }
  }
}

console.log(JSON.stringify({
  ok: failures.length === 0,
  checkedFiles: primaryUiFiles.length,
  bannedPatterns: bannedVisibleCopy.map((pattern) => pattern.source),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
