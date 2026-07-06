import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const root = process.cwd();

const scanTargets = [
  'README.md',
  'docs/why-non-wager.md',
  'docs/civic-threat-model.md',
  'docs/known-limitations.md',
  'docs/independent-verification.md',
  'docs/demo-script.md',
  'docs/submission-checklist.md',
  'app/src/app/page.tsx',
  'app/src/app/loading.tsx',
  'app/src/app/demo/page.tsx',
  'app/src/app/receipt',
  'app/src/app/market',
  'app/src/app/participate',
  'app/src/app/verify',
  'app/src/app/ledger',
  'app/src/app/for-sponsors',
  'app/src/app/how-it-works',
  'app/src/app/api/civic',
  'app/src/components/civic',
  'app/src/lib/civic',
  'app/public/proofs/civic-market-ward12-water-repair.json',
  'app/public/proofs/civic-ledger.json',
  'app/public/proofs/civic-receipt-latest.json',
  'app/public/proofs/civic-verifier.json',
  'app/public/proofs/civic-fraud-gauntlet.json',
  'app/public/proofs/civic-readiness.json',
  'app/public/proofs/civic-conviction-signal.json',
  'app/public/proofs/janamat-compatibility.json',
  'app/public/proofs/zk-identity-adapter.json',
];

const visibleProductTargets = [
  'app/src/app/page.tsx',
  'app/src/app/loading.tsx',
  'app/src/app/demo/page.tsx',
  'app/src/app/receipt',
  'app/src/app/market',
  'app/src/app/participate',
  'app/src/app/verify',
  'app/src/app/ledger',
  'app/src/app/for-sponsors',
  'app/src/app/how-it-works',
  'app/src/components/civic',
];

const maskedPhrases = [
  /non-wager/gi,
  /nonWager/g,
  /wagerless/gi,
  /not production ready/gi,
  /not_ready/gi,
];

const bannedClaimPatterns = [
  { name: 'wagering language', pattern: /\bwagers?\b|\bwagering\b|\bbet\b|\bbets\b|\bbetting\b|\bodds\b|\bcasino\b|\bgambling\b/i },
  { name: 'unsupported guarantee', pattern: /\bguaranteed\b|\brisk-free\b|\bsure winner\b|\b100%\s+(?:safe|ready|accurate|private|verified)\b/i },
  { name: 'unsupported civic integration', pattern: /\bofficial\s+(?:government|municipal|janamat)\s+(?:integration|feed|verification)\b/i },
  { name: 'unsupported privacy proof', pattern: /\bzkpassport verified\b|\bprivate identity verified\b|\bidentity proof live\b/i },
  { name: 'unsupported production claim', pattern: /\bmainnet ready\b|\bproduction-ready\b|\bproduction ready\b/i },
];

const primaryLeakPatterns = [
  { name: 'merchant-first language', pattern: /\bmerchants?\b/i },
  { name: 'adtech traffic language', pattern: /\btraffic\b|\bconversion\b|\breferrers?\b|\bcustomers?\b/i },
];

function walk(target) {
  const absolute = path.join(root, target);
  if (!existsSync(absolute)) return [];
  const stat = statSync(absolute);
  if (stat.isFile()) return [target];
  return readdirSync(absolute).flatMap((entry) => walk(path.join(target, entry)));
}

function maskAllowed(text) {
  return maskedPhrases.reduce((current, phrase) => current.replace(phrase, 'allowed_claim_boundary'), text);
}

const files = [...new Set(scanTargets.flatMap(walk))]
  .filter((file) => /\.(?:tsx?|jsx?|md|json)$/.test(file))
  .filter((file) => !file.endsWith('claims.ts'));

const visibleFiles = new Set(visibleProductTargets.flatMap(walk));
const failures = [];

for (const file of files) {
  const text = readFileSync(path.join(root, file), 'utf8');
  const masked = maskAllowed(text);
  for (const banned of bannedClaimPatterns) {
    if (banned.pattern.test(masked)) {
      failures.push({ file, rule: banned.name });
    }
  }
  if (visibleFiles.has(file)) {
    for (const leak of primaryLeakPatterns) {
      if (leak.pattern.test(masked)) {
        failures.push({ file, rule: leak.name });
      }
    }
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, scannedFiles: files.length, failures: [] }, null, 2));
