import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

type ProofSignature = string | null | { signature?: string | null; reused?: boolean };

type Manifest = {
  kind?: string;
  cluster?: string;
  rpcUrl?: string;
  programId?: string;
  wallet?: string;
  generatedAt?: string;
  effectCheckedAt?: string;
  inputs?: {
    orgId?: string;
    campaignId?: string;
    receiptId?: string;
    fundAmount?: string;
    amountToFund?: string;
    alreadyFunded?: string;
    remainingCapacity?: string;
    maxCapacity?: string;
    rewardPerVisit?: string;
    replayCheck?: boolean;
    attackCheck?: boolean;
    closeCheck?: boolean;
  };
  hashes?: {
    intentManifestHash?: string;
    visitAttestationHash?: string;
    receiptIdHash?: string;
    claimerNullifierHash?: string;
  };
  pdas?: Record<string, string | number | undefined>;
  signatures?: Record<string, ProofSignature>;
  transactions?: Record<string, string | null | undefined>;
  explorerLinks?: {
    transactions?: Record<string, string | null | undefined>;
    accounts?: Record<string, string | null | undefined>;
  };
  replayChecks?: Array<{ label?: string; rejected?: boolean; message?: string }>;
  effectChecks?: Array<{ label?: string; ok?: boolean; reason?: string }>;
  tokenBalances?: {
    before?: Record<string, string>;
    after?: Record<string, string>;
    afterClose?: Record<string, string> | null;
  };
  limitation?: string;
  proofStatus?: string;
  proofStatusNote?: string;
  targetAttestationModel?: string;
  targetProofLevel?: string;
  attestationModel?: string;
  proofLevel?: string;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
};

type Verifier = {
  ok?: boolean;
  failures?: string[];
  tokenBalances?: Record<string, string>;
  attestationVerified?: boolean;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  nullifierVerified?: boolean;
  settlementVerified?: boolean;
};

type MerchantPassport = {
  type?: string;
  version?: string;
  merchantAlias?: string;
  network?: string;
  programId?: string;
  generatedAt?: string;
  sourceManifestGeneratedAt?: string;
  proofStatus?: string;
  proofStatusNote?: string;
  proofLevel?: string;
  attestationModel?: string;
  privacyModel?: string;
  verifiedFacts?: Record<string, boolean>;
  commerceSignals?: Record<string, string | number>;
  proofObjects?: Record<string, string | undefined>;
  explorerLinks?: Record<string, string | null | undefined>;
};


type FraudGauntlet = {
  proofStatus?: string;
  summary?: { totalCases?: number; blocked?: number; missing?: number; failed?: number };
  cases?: Array<{ status?: string; observed?: string; expectedErrorMatched?: boolean; accountsMutated?: boolean; accountsMutationVerified?: boolean }>;
};

type ProofFeed = {
  proofStatus?: string;
  entries?: Array<{ status?: string; id?: string }>;
};

type ConversionOrderbook = {
  proofStatus?: string;
  campaigns?: Array<{ proofBacked?: boolean; status?: string; proofLevel?: string; verification?: Record<string, boolean> }>;
};

type CampaignLinks = {
  links?: Array<{ proofBacked?: boolean; slug?: string; status?: string; proofLevel?: string; campaignProofLevel?: string; terminalVerified?: boolean; visitorVerified?: boolean; lineageVerified?: boolean; settlementVerified?: boolean }>;
};

type MerchantValidationKit = {
  validationStatus?: string;
  evidenceSlots?: Array<{ status?: string }>;
};

const DEFAULT_MANIFEST_PATH = path.join('app', 'public', 'proofs', 'devnet-causal-commerce.json');
const DEFAULT_VERIFIER_PATH = path.join('tmp', 'devnet-causal-commerce-verifier.json');
const DEFAULT_PASSPORT_PATH = path.join('app', 'public', 'proofs', 'merchant-passport.json');
const DEFAULT_GAUNTLET_PATH = path.join('app', 'public', 'proofs', 'fraud-gauntlet.json');
const DEFAULT_FEED_PATH = path.join('app', 'public', 'proofs', 'proof-feed.json');
const DEFAULT_ORDERBOOK_PATH = path.join('app', 'public', 'proofs', 'conversion-orderbook.json');
const DEFAULT_CAMPAIGN_LINKS_PATH = path.join('app', 'public', 'proofs', 'campaign-links.json');
const DEFAULT_VALIDATION_KIT_PATH = path.join('app', 'public', 'proofs', 'merchant-validation-kit.json');
const DEFAULT_PACKET_PATH = path.join('docs', 'frontier-submission-packet.md');
const DEFAULT_GO_NO_GO_PATH = path.join('docs', 'frontier-final-go-no-go.md');

function argValue(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage() {
  return `
Usage:
  npm run frontier:submission
  npm run frontier:submission -- --manifest app/public/proofs/devnet-causal-commerce.json --verifier tmp/devnet-causal-commerce-verifier.json --passport app/public/proofs/merchant-passport.json

Options:
  --manifest <path>   Devnet manifest from npm run devnet:causal-commerce. Default: ${DEFAULT_MANIFEST_PATH}
  --verifier <path>   REQUIRED verifier output from npm run devnet:verify-receipt -- --output <path>. Default: ${DEFAULT_VERIFIER_PATH}
  --passport <path>   REQUIRED Merchant Proof Passport from npm run merchant:passport. Default: ${DEFAULT_PASSPORT_PATH}
  --gauntlet <path>   REQUIRED fraud gauntlet from npm run fraud:gauntlet. Default: ${DEFAULT_GAUNTLET_PATH}
  --feed <path>       REQUIRED proof feed from npm run proof:feed. Default: ${DEFAULT_FEED_PATH}
  --orderbook <path>  REQUIRED conversion orderbook from npm run conversion:orderbook. Default: ${DEFAULT_ORDERBOOK_PATH}
  --links <path>      REQUIRED campaign links from npm run campaign:links. Default: ${DEFAULT_CAMPAIGN_LINKS_PATH}
  --validation <path> REQUIRED validation kit from npm run merchant:validation. Default: ${DEFAULT_VALIDATION_KIT_PATH}
  --packet <path>     Write the judge packet markdown. Default: ${DEFAULT_PACKET_PATH}
  --go-no-go <path>   Write the final go/no-go markdown. Default: ${DEFAULT_GO_NO_GO_PATH}
`;
}

function readText(filePath: string) {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Required file is missing: ${resolved}`);
  }
  return readFileSync(resolved, 'utf8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function writeOutput(filePath: string, value: string) {
  const resolved = path.resolve(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, value);
  return resolved;
}

function requireText(label: string, content: string, expected: string, failures: string[]) {
  if (!content.includes(expected)) failures.push(`${label} does not include ${expected}`);
}

function requireFile(filePath: string, failures: string[]) {
  if (!existsSync(path.resolve(filePath))) failures.push(`Missing required artifact ${filePath}`);
}

function tokenBalance(manifest: Manifest, phase: 'before' | 'after' | 'afterClose', account: string) {
  const balances = manifest.tokenBalances?.[phase];
  return balances?.[account] ?? 'missing';
}

function replayVerdict(manifest: Manifest) {
  const checks = manifest.replayChecks ?? [];
  if (checks.length === 0) return 'missing';
  return checks.every((check) => check.rejected) ? 'PASS' : 'FAIL';
}

function effectVerdict(manifest: Manifest) {
  const checks = manifest.effectChecks ?? [];
  if (checks.length === 0) return 'missing';
  const valid = checks.find((check) => check.label?.toLowerCase().includes('valid'));
  const malicious = checks.filter((check) => !check.label?.toLowerCase().includes('valid'));
  return valid?.ok === true && malicious.length > 0 && malicious.every((check) => check.ok === false) ? 'PASS' : 'FAIL';
}

function staleStatus(status?: string) {
  return /needs|stale|unsafe/i.test(status ?? '');
}

function signatureValue(value: ProofSignature | undefined) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.signature ?? null;
}

function signatureVerdict(manifest: Manifest, key: string) {
  return signatureValue(manifest.signatures?.[key]) ? 'PASS' : 'MISSING';
}

function txLink(manifest: Manifest, key: string) {
  return manifest.explorerLinks?.transactions?.[key] ?? null;
}

function boolVerdict(value?: boolean) {
  return value ? 'PASS' : 'FAIL';
}

function proofAttestationVerdict(manifest: Manifest, verifier?: Verifier) {
  return manifest.attestationModel === 'merchant_terminal_visitor_signed'
    && manifest.proofLevel === 'counter_attested'
    && manifest.terminalVerified === true
    && manifest.visitorVerified === true
    && manifest.lineageVerified === true
    && verifier?.terminalVerified === true
    && verifier?.visitorVerified === true
    && verifier?.lineageVerified === true
    ? 'PASS' : 'FAIL';
}

function passportVerdict(passport?: MerchantPassport) {
  if (!passport) return 'MISSING';
  if (staleStatus(passport.proofStatus)) return 'STALE';
  const facts = passport.verifiedFacts ?? {};
  const required = [
    'campaignFunded',
    'receiptRecorded',
    'rewardSettled',
    'nullifierRecorded',
    'intentManifestCommitted',
    'verifierOk',
  ];
  return required.every((key) => facts[key]) ? 'PASS' : 'FAIL';
}

function buildPacket(params: { manifest: Manifest; verifier?: Verifier; passport?: MerchantPassport; generatedAt: string }) {
  const { manifest, verifier, passport, generatedAt } = params;
  const verifierStatus = verifier ? (verifier.ok ? 'PASS' : 'FAIL') : 'MISSING';
  const proofLevel = manifest.proofLevel ?? manifest.targetProofLevel ?? passport?.proofLevel ?? 'counter-attested receipt';
  const attestationModel = manifest.attestationModel ?? manifest.targetAttestationModel ?? passport?.attestationModel ?? 'merchant_terminal_visitor_signed';

  return `# Frontier Submission Packet

Generated: ${generatedAt}

## One-Sentence Pitch

Viral Sync is the Solana settlement layer for outcome-based marketing: merchants escrow bounties, creators or agents route customers, and payouts only release when the customer actually converts.

## Submission Thesis

Every payout is backed by a POC-1 receipt: a PDA-based Solana proof signed by the merchant, an enrolled terminal, and the visitor, with nullifier replay protection and settlement-time intent checks.

## Merchant Proof Passport

The proof passport is a privacy-preserving merchant-owned packet built from the devnet proof manifest and verifier output. It publishes verifiable commerce facts without publishing customer names, phone numbers, emails, or GPS coordinates.

| Field | Value |
|---|---|
| Passport | ${passportVerdict(passport)} |
| Merchant | \`${passport?.merchantAlias ?? 'missing'}\` |
| Network | \`${passport?.network ?? manifest.cluster ?? 'missing'}\` |
| Proof level | \`${proofLevel}\` |
| Attestation model | \`${attestationModel}\` |
| Privacy model | ${passport?.privacyModel ?? 'missing'} |
| Passport artifact | \`app/public/proofs/merchant-passport.json\` |

## Proof-of-Conversion Orderbook

The orderbook demonstrates the broader primitive: merchants can publish conversion bounties, referrers/creators/agents can route demand, and Solana settlement remains blocked until a POC-1 receipt verifies.

Artifacts:

- \`app/public/proofs/conversion-orderbook.json\`
- \`app/public/proofs/campaign-links.json\`
- \`app/public/proofs/merchant-validation-kit.json\`

Routes:

- \`/conversion-orderbook\`
- \`/campaign/thamel-brew-counter-attested-visits\`
- \`/api/actions/campaign/thamel-brew-counter-attested-visits\`
- \`/merchant-validation\`

## Judge-Facing Proof Path

1. Merchant registers an outcome settlement config.
2. Merchant enrolls a terminal device for counter attestation.
3. Merchant creates and funds a Growth Bounty.
4. Visitor claim/lineage context is committed into the receipt path.
5. The program records a Causal Receipt with a campaign-scoped nullifier.
6. The receipt stores the \`intent_manifest_hash\` commitment.
7. The program settles exactly once from the SPL reward vault.
8. The passport exports privacy-preserving proof of outcome settlement.

## Devnet Evidence

| Field | Value |
|---|---|
| Cluster | \`${manifest.cluster ?? 'missing'}\` |
| Program | \`${manifest.programId ?? 'missing'}\` |
| RPC | \`${manifest.rpcUrl ?? 'missing'}\` |
| Generated | \`${manifest.generatedAt ?? 'missing'}\` |
| Intent checked | \`${manifest.effectCheckedAt ?? 'missing'}\` |
| Campaign | \`${manifest.pdas?.growthCampaign ?? 'missing'}\` |
| Reward escrow | \`${manifest.pdas?.rewardEscrow ?? 'missing'}\` |
| Reward vault | \`${manifest.pdas?.rewardVault ?? 'missing'}\` |
| Causal receipt | \`${manifest.pdas?.causalReceipt ?? 'missing'}\` |
| Nullifier | \`${manifest.pdas?.nullifierRecord ?? 'missing'}\` |
| Intent manifest hash | \`${manifest.hashes?.intentManifestHash ?? 'missing'}\` |
| Visit attestation hash | \`${manifest.hashes?.visitAttestationHash ?? 'missing'}\` |
| Replay checks | ${replayVerdict(manifest)} |
| Intent validation checks | ${effectVerdict(manifest)} |
| Required verifier | ${verifierStatus} |
| Attestation model | \`${manifest.attestationModel ?? 'missing'}\` |
| Proof level | \`${manifest.proofLevel ?? 'missing'}\` |
| Terminal verified | ${boolVerdict(manifest.terminalVerified)} |
| Visitor verified | ${boolVerdict(manifest.visitorVerified)} |
| Lineage verified | ${boolVerdict(manifest.lineageVerified)} |

## Core Transaction Links

| Step | Signature | Explorer |
|---|---|---|
| register_merchant | \`${signatureValue(manifest.signatures?.registerMerchant) ?? 'missing'}\` | ${txLink(manifest, 'registerMerchant') ?? 'missing'} |
| create_growth_campaign | \`${signatureValue(manifest.signatures?.createGrowthCampaign) ?? 'missing'}\` | ${txLink(manifest, 'createGrowthCampaign') ?? 'missing'} |
| enroll_terminal_device | \`${signatureValue(manifest.signatures?.enrollTerminalDevice) ?? 'missing'}\` | ${txLink(manifest, 'enrollTerminalDevice') ?? 'missing'} |
| issue_claim_pass | \`${signatureValue(manifest.signatures?.issueClaimPass) ?? 'missing'}\` | ${txLink(manifest, 'issueClaimPass') ?? 'missing'} |
| fund_growth_bounty | \`${signatureValue(manifest.signatures?.fundGrowthBounty) ?? 'missing'}\` | ${txLink(manifest, 'fundGrowthBounty') ?? 'missing'} |
| record_causal_receipt | \`${signatureValue(manifest.signatures?.recordCausalReceipt) ?? 'missing'}\` | ${txLink(manifest, 'recordCausalReceipt') ?? 'missing'} |
| settle_receipt_reward | \`${signatureValue(manifest.signatures?.settleReceiptReward) ?? 'missing'}\` | ${txLink(manifest, 'settleReceiptReward') ?? 'missing'} |

## SPL Custody Ledger

${manifest.inputs?.closeCheck ? 'This proof includes close-check evidence after expiry.' : 'This public proof focuses on record + settle; the script supports close-check with `--close-check`, but vault reclaim is not claimed as proven in this artifact.'}

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | \`${tokenBalance(manifest, 'before', 'merchantRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'merchantRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'merchantRewardAccount')}\` |
| Reward vault | \`${tokenBalance(manifest, 'before', 'rewardVault')}\` | \`${tokenBalance(manifest, 'after', 'rewardVault')}\` | \`${tokenBalance(manifest, 'afterClose', 'rewardVault')}\` |
| Referrer reward account | \`${tokenBalance(manifest, 'before', 'referrerRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'referrerRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'referrerRewardAccount')}\` |
| Visitor reward account | \`${tokenBalance(manifest, 'before', 'visitorRewardAccount')}\` | \`${tokenBalance(manifest, 'after', 'visitorRewardAccount')}\` | \`${tokenBalance(manifest, 'afterClose', 'visitorRewardAccount')}\` |

## Verifier Copies

\`tmp/devnet-causal-commerce-verifier.json\` is the raw verifier output from the local command.
\`app/public/proofs/devnet-causal-commerce-verifier.json\` is the published copy with publication metadata for the web app and auditor packet.

## Commands For Judges

\`\`\`bash
npm ci
npm run frontier:offline-preflight
npm run frontier:mock-final
# fund the configured devnet wallet first
npm run frontier:final
\`\`\`

## Hosted App Proof Surface

- Devnet proof page: \`/proof\`
- Receipt proof: \`/receipt/[id]\`
- Campaign action metadata: \`GET /api/actions/campaign/[slug]\`
- Receipt action metadata: \`GET|POST /api/actions/causal-receipt/[id]\`

## Honest Limitations

${manifest.limitation ?? 'Devnet pilot only. Mainnet funds require external audit, funded relayer operations, and production incident coverage.'}
`;
}

function buildGoNoGo(params: { manifest: Manifest; verifier?: Verifier; passport?: MerchantPassport; generatedAt: string; failures: string[]; allowPreproofDocs: boolean }) {
  const { manifest, verifier, passport, generatedAt, failures, allowPreproofDocs } = params;
  const go = failures.length === 0 && !allowPreproofDocs;
  const decision = go
    ? 'GO: submit this build for Frontier judging.'
    : allowPreproofDocs
      ? 'READY_FOR_FINAL_PROOF_RUN: NO-GO until the final devnet proof command passes.'
      : 'NO-GO: fix the blockers below before submission.';
  return `# Frontier Final Go/No-Go

Generated: ${generatedAt}

## Decision

${decision}

## Required Gates

| Gate | Status |
|---|---|
| Devnet proof manifest exists | ${existsSync(path.resolve(DEFAULT_MANIFEST_PATH)) ? 'PASS' : 'FAIL'} |
| record_causal_receipt signature | ${signatureVerdict(manifest, 'recordCausalReceipt')} |
| settle_receipt_reward signature | ${signatureVerdict(manifest, 'settleReceiptReward')} |
| intent_manifest_hash present | ${manifest.hashes?.intentManifestHash ? 'PASS' : 'FAIL'} |
| Replay rejection | ${replayVerdict(manifest)} |
| Intent validation | ${effectVerdict(manifest)} |
| Required verifier | ${verifier ? (verifier.ok ? 'PASS' : 'FAIL') : 'MISSING'} |
| Counter-attestation fields | ${proofAttestationVerdict(manifest, verifier)} |
| Merchant Proof Passport | ${passportVerdict(passport)} |
| Negative-path suite artifact | ${existsSync(path.resolve(DEFAULT_GAUNTLET_PATH)) ? 'PASS' : 'FAIL'} |
| Proof feed artifact | ${existsSync(path.resolve(DEFAULT_FEED_PATH)) ? 'PASS' : 'FAIL'} |
| Hosted receipt proof page | ${existsSync(path.resolve('app/src/app/receipt/[id]/page.tsx')) ? 'PASS' : 'FAIL'} |
| Hosted proof page | ${existsSync(path.resolve('app/src/app/proof/page.tsx')) ? 'PASS' : 'FAIL'} |

## Blockers

${failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- none'}

## Submission Stance

Lead with the devnet receipt proof and Merchant Proof Passport, not broad product surface area. The winning story is outcome settlement: funded SPL custody, counter-attested POC-1 receipt, exact-once settlement, nullifier replay rejection, on-chain \`intent_manifest_hash\` commitment, and a privacy-preserving merchant-owned proof packet.
`;
}

async function main() {
  const allowPreproofDocs = process.env.ALLOW_PREPROOF_DOCS === '1';
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage());
    return;
  }

  const manifestPath = argValue(args, '--manifest') ?? DEFAULT_MANIFEST_PATH;
  const verifierPath = argValue(args, '--verifier') ?? DEFAULT_VERIFIER_PATH;
  const passportPath = argValue(args, '--passport') ?? DEFAULT_PASSPORT_PATH;
  const gauntletPath = argValue(args, '--gauntlet') ?? DEFAULT_GAUNTLET_PATH;
  const feedPath = argValue(args, '--feed') ?? DEFAULT_FEED_PATH;
  const orderbookPath = argValue(args, '--orderbook') ?? DEFAULT_ORDERBOOK_PATH;
  const campaignLinksPath = argValue(args, '--links') ?? DEFAULT_CAMPAIGN_LINKS_PATH;
  const validationKitPath = argValue(args, '--validation') ?? DEFAULT_VALIDATION_KIT_PATH;
  const packetPath = argValue(args, '--packet') ?? DEFAULT_PACKET_PATH;
  const goNoGoPath = argValue(args, '--go-no-go') ?? DEFAULT_GO_NO_GO_PATH;

  const failures: string[] = [];
  [
    'README.md',
    'app/src/app/proof/page.tsx',
    'app/src/app/receipt/[id]/page.tsx',
    'app/src/app/api/actions/campaign/[slug]/route.ts',
    'app/src/app/api/actions/causal-receipt/[id]/route.ts',
    'programs/viral_sync/src/lib.rs',
    manifestPath,
    verifierPath,
    passportPath,
    gauntletPath,
    feedPath,
    orderbookPath,
    campaignLinksPath,
    validationKitPath,
  ].forEach((filePath) => requireFile(filePath, failures));

  const manifest = existsSync(path.resolve(manifestPath)) ? readJson<Manifest>(manifestPath) : {};
  const verifier = existsSync(path.resolve(verifierPath)) ? readJson<Verifier>(verifierPath) : undefined;
  const passport = existsSync(path.resolve(passportPath)) ? readJson<MerchantPassport>(passportPath) : undefined;
  const gauntlet = existsSync(path.resolve(gauntletPath)) ? readJson<FraudGauntlet>(gauntletPath) : undefined;
  const feed = existsSync(path.resolve(feedPath)) ? readJson<ProofFeed>(feedPath) : undefined;
  const orderbook = existsSync(path.resolve(orderbookPath)) ? readJson<ConversionOrderbook>(orderbookPath) : undefined;
  const campaignLinks = existsSync(path.resolve(campaignLinksPath)) ? readJson<CampaignLinks>(campaignLinksPath) : undefined;
  const validationKit = existsSync(path.resolve(validationKitPath)) ? readJson<MerchantValidationKit>(validationKitPath) : undefined;

  if (manifest.cluster && manifest.cluster !== 'devnet') failures.push(`Proof manifest cluster is ${manifest.cluster}, expected devnet`);
  if (staleStatus(manifest.proofStatus)) failures.push(`Proof manifest is marked stale: ${manifest.proofStatus}${manifest.proofStatusNote ? ` — ${manifest.proofStatusNote}` : ''}`);
  if (staleStatus(passport?.proofStatus)) failures.push(`Merchant Proof Passport is marked stale: ${passport?.proofStatus}${passport?.proofStatusNote ? ` — ${passport.proofStatusNote}` : ''}`);
  if (staleStatus(gauntlet?.proofStatus)) failures.push(`Negative-path suite is marked stale: ${gauntlet?.proofStatus}`);
  if (staleStatus(feed?.proofStatus)) failures.push(`Proof Feed is marked stale: ${feed?.proofStatus}`);
  if (staleStatus(orderbook?.proofStatus)) failures.push(`Conversion Orderbook is marked stale: ${orderbook?.proofStatus}`);

  if (manifest.attestationModel !== 'merchant_terminal_visitor_signed') failures.push(`Manifest attestationModel is ${manifest.attestationModel ?? 'missing'}, expected merchant_terminal_visitor_signed`);
  if (manifest.proofLevel !== 'counter_attested') failures.push(`Manifest proofLevel is ${manifest.proofLevel ?? 'missing'}, expected counter_attested`);
  if (manifest.terminalVerified !== true) failures.push('Manifest terminalVerified is not true');
  if (manifest.visitorVerified !== true) failures.push('Manifest visitorVerified is not true');
  if (manifest.lineageVerified !== true) failures.push('Manifest lineageVerified is not true');
  for (const key of ['programSourceHash', 'idlHash', 'proofGeneratorHash', 'verifierHash'] as const) {
    if (!(manifest as Record<string, unknown>)[key]) failures.push(`Manifest is missing ${key}`);
  }
  const structuredAttacks = (manifest as { attackEvidence?: unknown[] }).attackEvidence ?? [];
  if (structuredAttacks.length < 16) failures.push(`Manifest attackEvidence has ${structuredAttacks.length} cases, expected at least 16`);
  ['terminalDevice', 'terminalAuthority', 'visitorAuthority', 'claimPass'].forEach((key) => {
    if (!manifest.pdas?.[key]) failures.push(`Manifest pdas.${key} is missing`);
  });

  ['registerMerchant', 'createGrowthCampaign', 'enrollTerminalDevice', 'issueClaimPass', 'recordCausalReceipt', 'settleReceiptReward'].forEach((key) => {
    if (!signatureValue(manifest.signatures?.[key])) failures.push(`Manifest is missing signature for ${key}`);
  });
  if (!signatureValue(manifest.signatures?.fundGrowthBounty) && manifest.inputs?.amountToFund !== '0') {
    failures.push('Manifest is missing signature for fundGrowthBounty and inputs.amountToFund is not 0');
  }

  if (!manifest.hashes?.intentManifestHash) failures.push('Manifest is missing hashes.intentManifestHash');
  if (!manifest.hashes?.visitAttestationHash) failures.push('Manifest is missing hashes.visitAttestationHash');
  if (replayVerdict(manifest) !== 'PASS') failures.push('Replay checks are not all rejected');
  if (effectVerdict(manifest) !== 'PASS') failures.push('Intent validation checks do not show valid accepted and malicious rejected');
  if (!verifier) failures.push(`Required verifier output is missing: ${verifierPath}`);
  else if (!verifier.ok) failures.push(`Verifier is not passing: ${(verifier.failures ?? ['unknown failure']).join('; ')}`);
  if (verifier) {
    if (verifier.terminalVerified !== true) failures.push('Verifier terminalVerified is not true');
    if (verifier.visitorVerified !== true) failures.push('Verifier visitorVerified is not true');
    if (verifier.lineageVerified !== true) failures.push('Verifier lineageVerified is not true');
    if (verifier.settlementVerified !== true) failures.push('Verifier settlementVerified is not true');
    if (verifier.nullifierVerified !== true) failures.push('Verifier nullifierVerified is not true');
  }

  if (!passport) failures.push(`Required Merchant Proof Passport is missing: ${passportPath}`);
  else {
    const passportFacts = passport.verifiedFacts ?? {};
    ['campaignFunded', 'receiptRecorded', 'rewardSettled', 'nullifierRecorded', 'intentManifestCommitted', 'verifierOk', 'terminalVerified', 'visitorVerified', 'lineageVerified', 'settlementVerified', 'nullifierVerified'].forEach((key) => {
      if (!passportFacts[key]) failures.push(`Merchant Proof Passport verifiedFacts.${key} is not true`);
    });
    if (passport.programId && manifest.programId && passport.programId !== manifest.programId) {
      failures.push('Merchant Proof Passport programId does not match proof manifest');
    }
  }



  if (!gauntlet) failures.push(`Required negative-path suite is missing: ${gauntletPath}`);
  else {
    const total = gauntlet.summary?.totalCases ?? gauntlet.cases?.length ?? 0;
    const blocked = gauntlet.summary?.blocked ?? gauntlet.cases?.filter((item) => item.status === 'blocked').length ?? 0;
    if (total < 16) failures.push(`Negative-path suite has only ${total} cases, expected at least 16`);
    if (blocked !== total) failures.push(`Negative-path suite rejected ${blocked}/${total} cases`);
    if ((gauntlet.summary?.missing ?? 0) !== 0) failures.push(`Negative-path suite missing ${gauntlet.summary?.missing} cases`);
    if ((gauntlet.summary?.failed ?? 0) !== 0) failures.push(`Negative-path suite failed ${gauntlet.summary?.failed} cases`);
    (gauntlet.cases ?? []).forEach((item, index) => {
      if (item.observed !== 'rejected') failures.push(`Negative-path suite case ${index} observed ${item.observed}, expected rejected`);
      if (item.expectedErrorMatched !== true) failures.push(`Negative-path suite case ${index} did not match expected error`);
      if (item.accountsMutated !== false || item.accountsMutationVerified !== true) failures.push(`Negative-path suite case ${index} did not verify no account mutation`);
    });
  }

  if (!feed) failures.push(`Required Proof Feed is missing: ${feedPath}`);
  else {
    const entries = feed.entries ?? [];
    if (entries.length < 5) failures.push(`Proof Feed has only ${entries.length} entries, expected at least 5`);
    entries.forEach((entry, index) => { if (entry.status !== 'verified') failures.push(`Proof Feed entry ${entry.id ?? index} is ${entry.status}, expected verified`); });
  }

  if (!orderbook) failures.push(`Required Conversion Orderbook is missing: ${orderbookPath}`);
  else {
    const campaigns = orderbook.campaigns ?? [];
    const proofBacked = campaigns.find((campaign) => campaign.proofBacked === true);
    if (!proofBacked) failures.push('Conversion Orderbook has no proof-backed campaign');
    else {
      if (proofBacked.proofLevel !== 'counter_attested') failures.push('Conversion Orderbook proof-backed campaign is not counter_attested');
      for (const key of ['terminalVerified', 'visitorVerified', 'lineageVerified', 'settlementVerified']) {
        if (proofBacked.verification?.[key] !== true) failures.push(`Conversion Orderbook proof-backed campaign verification.${key} is not true`);
      }
    }
  }

  if (!campaignLinks) failures.push(`Required Campaign Links artifact is missing: ${campaignLinksPath}`);
  else {
    const links = campaignLinks.links ?? [];
    const proofBackedLink = links.find((link) => link.proofBacked === true);
    if (!proofBackedLink) failures.push('Campaign Links artifact has no proof-backed campaign link');
    else {
      if (proofBackedLink.status !== 'verified') failures.push('Proof-backed campaign link status is not verified');
      if (proofBackedLink.proofLevel !== 'counter_attested' && proofBackedLink.campaignProofLevel !== 'counter_attested') failures.push('Proof-backed campaign link proof level is not counter_attested');
      for (const key of ['terminalVerified', 'visitorVerified', 'lineageVerified', 'settlementVerified']) {
        if (proofBackedLink[key as keyof typeof proofBackedLink] !== true) failures.push(`Proof-backed campaign link ${key} is not true`);
      }
    }
  }

  if (!validationKit) failures.push(`Required Merchant Validation Kit is missing: ${validationKitPath}`);
  else if (!validationKit.validationStatus) failures.push('Merchant Validation Kit is missing validationStatus');

  if (existsSync(path.resolve('README.md'))) {
    const readme = readText('README.md');
    requireText('README', readme, 'Verified civic forecasting and sponsor-funded action rewards', failures);
    requireText('README', readme, 'Capped, non-transferable conviction signals', failures);
    requireText('README', readme, '/ledger', failures);
    requireText('README', readme, 'npm run civic:verify-receipt', failures);
  }

  const generatedAt = new Date().toISOString();
  const packetOutput = writeOutput(packetPath, buildPacket({ manifest, verifier, passport, generatedAt }));
  const goNoGoOutput = writeOutput(goNoGoPath, buildGoNoGo({ manifest, verifier, passport, generatedAt, failures, allowPreproofDocs }));

  console.log(JSON.stringify({
    ok: failures.length === 0,
    packetPath: packetOutput,
    goNoGoPath: goNoGoOutput,
    manifestPath: path.resolve(manifestPath),
    verifierPath: path.resolve(verifierPath),
    passportPath: path.resolve(passportPath),
    gauntletPath: path.resolve(gauntletPath),
    feedPath: path.resolve(feedPath),
    orderbookPath: path.resolve(orderbookPath),
    campaignLinksPath: path.resolve(campaignLinksPath),
    validationKitPath: path.resolve(validationKitPath),
    verifierProvided: Boolean(verifier),
    passportProvided: Boolean(passport),
    orderbookProvided: Boolean(orderbook),
    campaignLinksProvided: Boolean(campaignLinks),
    validationKitProvided: Boolean(validationKit),
    failures,
  }, null, 2));

  if (failures.length > 0 && !allowPreproofDocs) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
