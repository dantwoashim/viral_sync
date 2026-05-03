import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type Manifest = {
  cluster?: string;
  programId?: string;
  generatedAt?: string;
  proofStatus?: string;
  proofStatusNote?: string;
  proofLevel?: string;
  attestationModel?: string;
  targetProofLevel?: string;
  targetAttestationModel?: string;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  inputs?: { campaignId?: string; rewardPerVisit?: string; maxRedemptions?: number; fundAmount?: string };
  pdas?: Record<string, string | number | undefined>;
  hashes?: Record<string, string | undefined>;
  transactions?: Record<string, string | null | undefined>;
  explorerLinks?: { transactions?: Record<string, string | null | undefined>; accounts?: Record<string, string | null | undefined> };
  replayChecks?: Array<{ label?: string; rejected?: boolean }>;
  effectChecks?: Array<{ label?: string; ok?: boolean }>;
};

type Verifier = {
  ok?: boolean;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  settlementVerified?: boolean;
  nullifierVerified?: boolean;
  receipt?: { settledAmount?: string };
  campaign?: { totalFunded?: string; totalSettled?: string; totalRecorded?: number };
  rewardEscrow?: { totalFunded?: string; totalReserved?: string; totalSettled?: string };
  tokenBalances?: Record<string, string>;
};

type Passport = {
  merchantAlias?: string;
  passportHash?: string;
  proofStatus?: string;
  verifiedFacts?: Record<string, boolean>;
  commerceSignals?: Record<string, string | number>;
};

const DEFAULT_MANIFEST = path.join('app', 'public', 'proofs', 'devnet-causal-commerce.json');
const DEFAULT_VERIFIER = path.join('tmp', 'devnet-causal-commerce-verifier.json');
const DEFAULT_PASSPORT = path.join('app', 'public', 'proofs', 'merchant-passport.json');
const DEFAULT_OUTPUT = path.join('app', 'public', 'proofs', 'conversion-orderbook.json');

function argValue(args: string[], flag: string) { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; }
function readJson<T>(filePath: string, fallback: T): T { const resolved = path.resolve(filePath); return existsSync(resolved) ? JSON.parse(readFileSync(resolved, 'utf8')) as T : fallback; }
function writeJson(filePath: string, value: unknown) { const resolved = path.resolve(filePath); mkdirSync(path.dirname(resolved), { recursive: true }); writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`); return resolved; }
function stableJson(value: unknown): string { if (value === null || typeof value !== 'object') return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; const entries = Object.entries(value as Record<string, unknown>).sort(([a],[b])=>a.localeCompare(b)); return `{${entries.map(([k,v])=>`${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`; }
function sha256(value: unknown) { return createHash('sha256').update(stableJson(value)).digest('hex'); }
function isStale(status?: string) { return /needs|stale|unsafe|missing/i.test(status ?? ''); }
function allReplayBlocked(manifest: Manifest) { const checks = manifest.replayChecks ?? []; return checks.length > 0 && checks.every((check) => check.rejected === true); }
function intentValidatorPassed(manifest: Manifest) { const checks = manifest.effectChecks ?? []; return checks.some((check) => check.ok === true) && checks.filter((check) => check.ok === false).length > 0; }

function main() {
  const args = process.argv.slice(2);
  const manifestPath = argValue(args, '--manifest') ?? DEFAULT_MANIFEST;
  const verifierPath = argValue(args, '--verifier') ?? DEFAULT_VERIFIER;
  const passportPath = argValue(args, '--passport') ?? DEFAULT_PASSPORT;
  const outputPath = argValue(args, '--output') ?? DEFAULT_OUTPUT;

  const manifest = readJson<Manifest>(manifestPath, {});
  const verifier = readJson<Verifier>(verifierPath, {});
  const passport = readJson<Passport>(passportPath, {});
  const terminalVerified = verifier.terminalVerified === true && manifest.terminalVerified === true;
  const visitorVerified = verifier.visitorVerified === true && manifest.visitorVerified === true;
  const lineageVerified = verifier.lineageVerified === true && manifest.lineageVerified === true;
  const settlementVerified = verifier.settlementVerified === true;
  const proofReady =
    verifier.ok === true &&
    terminalVerified &&
    visitorVerified &&
    lineageVerified &&
    settlementVerified &&
    !isStale(manifest.proofStatus) &&
    !isStale(passport.proofStatus);
  const merchantAlias = passport.merchantAlias ?? 'Thamel Brew House';
  const reward = manifest.inputs?.rewardPerVisit ?? verifier.receipt?.settledAmount ?? '1000';
  const capacity = manifest.inputs?.maxRedemptions ?? 10;
  const funded = verifier.rewardEscrow?.totalFunded ?? verifier.campaign?.totalFunded ?? manifest.inputs?.fundAmount ?? 'unknown';
  const settled = verifier.campaign?.totalSettled ?? verifier.receipt?.settledAmount ?? 'unknown';
  const remaining = verifier.tokenBalances?.rewardVault ?? 'unknown';

  const primaryCampaign = {
    slug: 'thamel-brew-counter-attested-visits',
    title: 'Bring a real customer to Thamel Brew House',
    merchantAlias,
    category: 'local-commerce-visit',
    publicPath: '/campaign/thamel-brew-counter-attested-visits',
    status: proofReady ? 'proof_backed_demo' : 'needs_fresh_proof',
    proofBacked: proofReady,
    proofLevel: manifest.proofLevel ?? manifest.targetProofLevel ?? 'counter_attested',
    attestationModel: manifest.attestationModel ?? manifest.targetAttestationModel ?? 'merchant_terminal_visitor_signed',
    bounty: {
      rewardUnits: reward,
      maxRedemptions: capacity,
      fundedUnits: funded,
      settledUnits: settled,
      vaultRemainingUnits: remaining,
      payoutCondition: 'Counter-attested receipt: merchant authority + enrolled terminal + visitor signer + claim-pass account lineage + unused nullifier.',
    },
    proofObjects: {
      programId: manifest.programId,
      campaignPda: manifest.pdas?.growthCampaign,
      rewardEscrow: manifest.pdas?.rewardEscrow,
      receiptPda: manifest.pdas?.causalReceipt,
      nullifierPda: manifest.pdas?.nullifierRecord,
      terminalDevice: manifest.pdas?.terminalDevice,
      claimPass: manifest.pdas?.claimPass,
      intentManifestHash: manifest.hashes?.intentManifestHash,
      passportHash: passport.passportHash,
    },
    verification: {
      verifierOk: verifier.ok === true,
      terminalVerified,
      visitorVerified,
      lineageVerified,
      settlementVerified,
      replayBlocked: allReplayBlocked(manifest),
      intentValidatorPassed: intentValidatorPassed(manifest),
    },
    links: {
      proof: '/frontier-proof',
      gauntlet: '/frontier-gauntlet',
      receipt: '/receipt/latest',
      passport: '/merchant-passport',
      recordTx: manifest.explorerLinks?.transactions?.recordCausalReceipt,
      settleTx: manifest.explorerLinks?.transactions?.settleReceiptReward,
    },
  };

  const orderbookCore = {
    type: 'viral-sync-conversion-orderbook',
    version: '1.0.0',
    title: 'Proof-of-Conversion Orderbook',
    network: manifest.cluster ? `solana-${manifest.cluster}` : 'solana-devnet',
    generatedAt: new Date().toISOString(),
    sourceManifest: manifestPath.replace(/\\/g, '/'),
    sourceVerifier: verifierPath.replace(/\\/g, '/'),
    sourcePassport: passportPath.replace(/\\/g, '/'),
    proofStatus: proofReady ? 'ready' : (manifest.proofStatus ?? passport.proofStatus ?? 'needs-fresh-proof'),
    thesis: 'Merchants escrow conversion bounties; referrers, creators, and agents route demand; enrolled terminals and visitors counter-attest conversions; Solana settles payouts through receipt objects.',
    integrityRules: [
      'No payout without funded reward escrow.',
      'No receipt without enrolled terminal signer and visitor signer.',
      'No replay without a fresh nullifier and active claim-pass account lineage.',
      'No hidden effect without intent-manifest commitment and validator checks.',
      'No customer PII is published in the public proof packet.',
    ],
    campaigns: [
      primaryCampaign,
      {
        slug: 'college-canteen-student-meals',
        title: 'Sponsor student meals at a local canteen',
        merchantAlias: 'Demo Canteen',
        category: 'impact-campaign',
        publicPath: '/campaign/college-canteen-student-meals',
        status: 'vision_only_not_live',
        proofBacked: false,
        bounty: { rewardUnits: 'future', payoutCondition: 'Same POC-1 counter-attested receipt path; not part of current devnet proof.' },
      },
      {
        slug: 'local-event-booth-visits',
        title: 'Reward verified event booth visits',
        merchantAlias: 'Demo Event Booth',
        category: 'event-conversion',
        publicPath: '/campaign/local-event-booth-visits',
        status: 'vision_only_not_live',
        proofBacked: false,
        bounty: { rewardUnits: 'future', payoutCondition: 'Same POC-1 counter-attested receipt path; not part of current devnet proof.' },
      },
    ],
  };

  const orderbook = { ...orderbookCore, orderbookHash: sha256(orderbookCore) };
  const written = writeJson(outputPath, orderbook);
  const failures: string[] = [];
  if (!proofReady) failures.push('Primary campaign is not ready because the source proof/verifier/passport is stale or strict verifier flags are not true.');
  if (!terminalVerified) failures.push('Terminal verification must be true in both manifest and verifier.');
  if (!visitorVerified) failures.push('Visitor verification must be true in both manifest and verifier.');
  if (!lineageVerified) failures.push('Lineage verification must be true in both manifest and verifier.');
  if (!settlementVerified) failures.push('Settlement verification must be true in verifier output.');
  if (!primaryCampaign.verification.replayBlocked) failures.push('Replay/fraud checks are not fully blocked.');
  if (!primaryCampaign.verification.intentValidatorPassed) failures.push('Intent validator checks are incomplete.');

  console.log(JSON.stringify({ ok: failures.length === 0, outputPath: written, orderbookHash: orderbook.orderbookHash, primaryStatus: primaryCampaign.status, failures }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main();
