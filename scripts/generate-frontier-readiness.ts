import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { computeProofHashes, writeJson } from './proof-artifact-utils';

type Gate = { id: string; label: string; status: 'PASS' | 'FAIL' | 'PENDING'; detail: string };
function json(file: string): any | null { const p = path.resolve(file); if (!existsSync(p)) return null; try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }
function has(file: string) { return existsSync(path.resolve(file)); }
function isStale(value?: string) { return /needs|stale|unsafe|missing|no-go/i.test(value ?? ''); }
function allFeedVerified(feed: any) { const entries = Array.isArray(feed?.entries) ? feed.entries : []; return entries.length >= 5 && entries.every((entry: any) => entry.status === 'verified'); }
function allPassportFacts(passport: any) { const facts = passport?.verifiedFacts ?? {}; return ['campaignFunded','receiptRecorded','rewardSettled','nullifierRecorded','intentManifestCommitted','verifierOk','terminalVerified','visitorVerified','lineageVerified','settlementVerified','nullifierVerified'].every((key) => facts[key] === true); }

const manifest = json('app/public/proofs/devnet-causal-commerce.json');
const verifier = json('tmp/devnet-causal-commerce-verifier.json') ?? json('app/public/proofs/devnet-causal-commerce-verifier.json');
const gauntlet = json('app/public/proofs/fraud-gauntlet.json');
const passport = json('app/public/proofs/merchant-passport.json');
const orderbook = json('app/public/proofs/conversion-orderbook.json');
const campaignLinks = json('app/public/proofs/campaign-links.json');
const proofFeed = json('app/public/proofs/proof-feed.json');
const merchantValidation = json('app/public/proofs/merchant-validation-kit.json');
const programIdConsistency = json('app/public/proofs/program-id-consistency.json');
const currentHashes = computeProofHashes();

const manifestReady = manifest?.proofLevel === 'counter_attested' && manifest?.attestationModel === 'merchant_terminal_visitor_signed' && manifest?.terminalVerified === true && manifest?.visitorVerified === true && manifest?.lineageVerified === true && !isStale(manifest?.proofStatus);
const verifierReady = verifier?.ok === true && verifier?.terminalVerified === true && verifier?.visitorVerified === true && verifier?.lineageVerified === true && verifier?.settlementVerified === true && verifier?.nullifierVerified === true;
const gauntletReady = (gauntlet?.summary?.totalCases ?? 0) >= 16 && gauntlet?.summary?.blocked === gauntlet?.summary?.totalCases && gauntlet?.summary?.missing === 0 && gauntlet?.summary?.failed === 0 && (gauntlet?.cases ?? []).every((item: any) => item.observed === 'rejected' && item.expectedErrorMatched === true && item.accountsMutated === false && item.accountsMutationVerified === true);
const passportReady = passport?.proofStatus === 'ready' && !isStale(passport?.proofStatus) && allPassportFacts(passport);
const proofBackedCampaign = (orderbook?.campaigns ?? []).find((campaign: any) => campaign.proofBacked === true);
const orderbookReady = Boolean(proofBackedCampaign && orderbook?.proofStatus !== 'needs_fresh_proof' && proofBackedCampaign.proofLevel === 'counter_attested' && proofBackedCampaign.verification?.terminalVerified === true && proofBackedCampaign.verification?.visitorVerified === true && proofBackedCampaign.verification?.lineageVerified === true && proofBackedCampaign.verification?.settlementVerified === true);
const proofBackedLink = (campaignLinks?.links ?? []).find((link: any) => link.proofBacked === true);
const campaignLinksReady = Boolean(proofBackedLink && proofBackedLink.status === 'verified' && (proofBackedLink.proofLevel === 'counter_attested' || proofBackedLink.campaignProofLevel === 'counter_attested') && proofBackedLink.terminalVerified === true && proofBackedLink.visitorVerified === true && proofBackedLink.lineageVerified === true && proofBackedLink.settlementVerified === true);
const feedReady = allFeedVerified(proofFeed);
const hashKeys = ['programSourceHash', 'idlHash', 'proofGeneratorHash', 'verifierHash', 'rawVerifierHash', 'publishedVerifierHash'];
const hashArtifacts = [
  'app/public/proofs/devnet-causal-commerce.json',
  'app/public/proofs/devnet-causal-commerce-verifier.json',
  'app/public/proofs/fraud-gauntlet.json',
  'app/public/proofs/merchant-passport.json',
  'app/public/proofs/conversion-orderbook.json',
  'app/public/proofs/campaign-links.json',
  'app/public/proofs/proof-feed.json',
  'app/public/proofs/frontier-readiness.json',
  'app/public/proofs/program-id-consistency.json',
];
const hashFailures: string[] = [];
for (const file of hashArtifacts) {
  const artifact = json(file);
  if (!artifact) continue;
  for (const key of hashKeys) {
    if (!(key in artifact)) continue;
    if (artifact[key] !== (currentHashes as Record<string, string | null>)[key]) {
      hashFailures.push(`${file}:${key}`);
    }
  }
}
const hashesVerified = hashFailures.length === 0 && Boolean(currentHashes.programSourceHash && currentHashes.idlHash && currentHashes.proofGeneratorHash && currentHashes.verifierHash);

const gates: Gate[] = [
  { id: 'program-build-command', label: 'Program build command', status: has('programs/viral_sync/src/lib.rs') ? 'PASS' : 'FAIL', detail: 'Anchor program source present.' },
  { id: 'program-id-consistency', label: 'Program ID consistency', status: programIdConsistency?.ok === true ? 'PASS' : programIdConsistency ? 'FAIL' : 'PENDING', detail: programIdConsistency?.ok === true ? 'Anchor.toml, declare_id!, and deploy keypair match.' : 'Run npm run proof:program-id-check before the final proof.' },
  { id: 'artifact-schema-gate', label: 'Artifact schema gate', status: has('schemas/poc1.schema.json') ? 'PASS' : 'FAIL', detail: 'POC-1 schema exists.' },
  { id: 'counter-attestation-manifest', label: 'Counter-attestation manifest', status: manifestReady ? 'PASS' : manifest ? 'PENDING' : 'FAIL', detail: manifestReady ? 'Manifest is fresh and counter-attested.' : 'Pending fresh final counter-attested proof manifest.' },
  { id: 'verifier-output', label: 'Verifier output', status: verifierReady ? 'PASS' : verifier ? 'PENDING' : 'FAIL', detail: verifierReady ? 'Verifier ok=true with terminal/visitor/lineage/settlement/nullifier flags.' : 'Pending final verifier output with strict flags.' },
  { id: 'fraud-gauntlet', label: 'Negative-path suite', status: gauntletReady ? 'PASS' : gauntlet ? 'PENDING' : 'FAIL', detail: gauntletReady ? `${gauntlet?.summary?.blocked ?? 0}/${gauntlet?.summary?.totalCases ?? 0} invalid flows rejected with expected error evidence.` : `${gauntlet?.summary?.blocked ?? 0}/${gauntlet?.summary?.totalCases ?? 0} cases currently rejected.` },
  { id: 'merchant-passport', label: 'Merchant Passport', status: passportReady ? 'PASS' : passport ? 'PENDING' : 'FAIL', detail: passportReady ? 'Passport facts are all verified.' : 'Passport pending strict counter-attestation facts.' },
  { id: 'orderbook-proof-slot', label: 'Orderbook proof-backed slot', status: orderbookReady ? 'PASS' : orderbook ? 'PENDING' : 'FAIL', detail: orderbookReady ? 'Orderbook has verified proof-backed campaign.' : 'Orderbook proof-backed slot is not fully verified.' },
  { id: 'campaign-links', label: 'Campaign links', status: campaignLinksReady ? 'PASS' : campaignLinks ? 'PENDING' : 'FAIL', detail: campaignLinksReady ? 'At least one campaign link is proof-backed and verified.' : 'Campaign link proof flags are incomplete.' },
  { id: 'proof-feed', label: 'Proof Feed', status: feedReady ? 'PASS' : proofFeed ? 'PENDING' : 'FAIL', detail: feedReady ? 'Every proof feed entry is verified.' : 'Proof feed contains pending/attention entries.' },
  { id: 'hash-binding', label: 'Source and artifact hash binding', status: hashesVerified ? 'PASS' : 'FAIL', detail: hashesVerified ? 'Proof hashes match the current repository state.' : `Hash binding failed for: ${hashFailures.join(', ') || 'missing hash source'}.` },
  { id: 'merchant-validation-kit', label: 'Merchant validation kit', status: merchantValidation?.type ? 'PASS' : 'PENDING', detail: 'Validation kit present; real traction is intentionally not claimed unless evidence slots are filled.' },
  { id: 'submission-generator', label: 'Submission packet generator', status: has('scripts/prepare-frontier-submission.ts') ? 'PASS' : 'FAIL', detail: 'frontier:submission script exists.' },
  { id: 'final-command', label: 'Final command prepared', status: has('scripts/assert-no-stale-artifacts.ts') ? 'PASS' : 'FAIL', detail: 'frontier:final includes final artifact assertion.' },
];
const failures = gates.filter((g) => g.status === 'FAIL');
const pending = gates.filter((g) => g.status === 'PENDING');
const status = failures.length ? 'BLOCKED' : pending.length ? 'READY_FOR_FINAL_PROOF_RUN' : 'GO';
const md = `# Frontier Final Run Readiness\n\nStatus: **${status}**\n\n${gates.map((g) => `- ${g.status} — ${g.label}: ${g.detail}`).join('\n')}\n\nFinal command:\n\n\`npm run frontier:final\`\n`;
writeFileSync(path.resolve('docs/frontier-final-run-readiness.md'), md);
writeJson('app/public/proofs/frontier-readiness.json', { type: 'viral-sync-frontier-readiness', generatedAt: new Date().toISOString(), status, gates, hashesVerified, hashFailures, programIdConsistency: programIdConsistency?.programIdConsistency ?? null });
console.log(JSON.stringify({ ok: status !== 'BLOCKED', status, failures: failures.length, pending: pending.length }, null, 2));
