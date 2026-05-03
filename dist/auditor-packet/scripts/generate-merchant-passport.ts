import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type Manifest = {
  kind?: string;
  cluster?: string;
  generatedAt?: string;
  programId?: string;
  wallet?: string;
  proofStatus?: string;
  proofStatusNote?: string;
  proofLevel?: string;
  targetProofLevel?: string;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  settlementVerified?: boolean;
  nullifierVerified?: boolean;
  attestationModel?: string;
  targetAttestationModel?: string;
  inputs?: Record<string, unknown>;
  hashes?: Record<string, string | undefined>;
  intentManifestHash?: string;
  pdas?: Record<string, string | number | undefined>;
  signatures?: Record<string, unknown>;
  transactions?: Record<string, string | null | undefined>;
  explorerLinks?: {
    transactions?: Record<string, string | null | undefined>;
    accounts?: Record<string, string | null | undefined>;
  };
  replayChecks?: Array<{ label?: string; rejected?: boolean }>;
  effectChecks?: Array<{ label?: string; ok?: boolean }>;
  tokenBalances?: {
    before?: Record<string, string>;
    after?: Record<string, string>;
    afterClose?: Record<string, string> | null;
  };
};

type Verifier = {
  ok?: boolean;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  settlementVerified?: boolean;
  nullifierVerified?: boolean;
  failures?: string[];
  receipt?: { status?: unknown; settledAmount?: string; rewardAmount?: string; intentManifestHash?: number[] };
  campaign?: { totalFunded?: string; totalSettled?: string; totalRecorded?: number };
  rewardEscrow?: { totalFunded?: string; totalSettled?: string; totalReserved?: string };
  settlementRecord?: { referrerAmount?: string; visitorAmount?: string };
  nullifierRecord?: unknown;
  tokenBalances?: Record<string, string>;
};

const DEFAULT_MANIFEST = path.join('app', 'public', 'proofs', 'devnet-causal-commerce.json');
const DEFAULT_VERIFIER = path.join('tmp', 'devnet-causal-commerce-verifier.json');
const DEFAULT_OUTPUT = path.join('app', 'public', 'proofs', 'merchant-passport.json');

function argValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function readJson<T>(filePath: string): T {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) throw new Error(`Missing required file: ${resolved}`);
  return JSON.parse(readFileSync(resolved, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown) {
  const resolved = path.resolve(filePath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`);
  return resolved;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
}

function sha256Hex(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function statusIsStale(status?: string) {
  return /needs|stale|unsafe/i.test(status ?? '');
}

function hasSignature(value: unknown) {
  if (!value) return false;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'object' && value !== null && 'signature' in value) {
    return typeof (value as { signature?: unknown }).signature === 'string' && Boolean((value as { signature?: string }).signature);
  }
  return false;
}

function receiptStatusIsSettled(verifier: Verifier) {
  const status = verifier.receipt?.status;
  if (!status) return false;
  if (typeof status === 'string') return status.toLowerCase() === 'settled';
  return JSON.stringify(status).toLowerCase().includes('settled');
}

function main() {
  const args = process.argv.slice(2);
  const manifestPath = argValue(args, '--manifest') ?? DEFAULT_MANIFEST;
  const verifierPath = argValue(args, '--verifier') ?? DEFAULT_VERIFIER;
  const outputPath = argValue(args, '--output') ?? DEFAULT_OUTPUT;
  const merchantAlias = argValue(args, '--merchant') ?? 'Thamel Brew House';

  const manifest = readJson<Manifest>(manifestPath);
  const verifier = readJson<Verifier>(verifierPath);

  const stale = statusIsStale(manifest.proofStatus);
  const replayRejected = (manifest.replayChecks ?? []).length > 0 && (manifest.replayChecks ?? []).every((check) => check.rejected);
  const intentValidation = (manifest.effectChecks ?? []).length > 0 && (manifest.effectChecks ?? []).some((check) => check.ok === true) && (manifest.effectChecks ?? []).filter((check) => check.ok === false).length > 0;
  const recordSig = hasSignature(manifest.signatures?.recordCausalReceipt) || Boolean(manifest.transactions?.recordCausalReceipt);
  const settleSig = hasSignature(manifest.signatures?.settleReceiptReward) || Boolean(manifest.transactions?.settleReceiptReward);
  const funded = Boolean(verifier.rewardEscrow?.totalFunded ?? manifest.tokenBalances?.before?.merchantRewardAccount);
  const settled = verifier.ok === true && receiptStatusIsSettled(verifier) && Boolean(verifier.settlementRecord);
  const nullifierRecorded = Boolean(verifier.nullifierRecord ?? manifest.pdas?.nullifierRecord);
  const intentCommitted = Boolean(manifest.hashes?.intentManifestHash ?? manifest.intentManifestHash);
  const terminalVerified = manifest.terminalVerified === true && verifier.terminalVerified === true;
  const visitorVerified = manifest.visitorVerified === true && verifier.visitorVerified === true;
  const lineageVerified = manifest.lineageVerified === true && verifier.lineageVerified === true;
  const settlementVerified = verifier.settlementVerified === true && settled;
  const nullifierVerified = verifier.nullifierVerified === true && nullifierRecorded;
  const counterAttestationReady = terminalVerified && visitorVerified && lineageVerified && settlementVerified && nullifierVerified;

  const verifiedFacts = {
    campaignFunded: funded,
    receiptRecorded: recordSig && Boolean(verifier.receipt ?? manifest.pdas?.causalReceipt),
    rewardSettled: settled && settleSig,
    nullifierRecorded,
    intentManifestCommitted: intentCommitted,
    verifierOk: verifier.ok === true,
    terminalVerified,
    visitorVerified,
    lineageVerified,
    settlementVerified,
    nullifierVerified,
    replayRejected,
    intentValidation,
  };

  const after = manifest.tokenBalances?.after ?? {};
  const passportCore = {
    type: 'viral-sync-merchant-proof-passport',
    version: '1.0.0',
    merchantAlias,
    network: manifest.cluster ? `solana-${manifest.cluster}` : 'solana-devnet',
    programId: manifest.programId,
    sourceManifest: manifestPath.replace(/\\/g, '/'),
    sourceVerifier: verifierPath.replace(/\\/g, '/'),
    sourceManifestGeneratedAt: manifest.generatedAt,
    proofStatus: stale ? manifest.proofStatus : counterAttestationReady ? 'ready' : 'needs-counter-attestation-verification',
    proofStatusNote: stale
      ? manifest.proofStatusNote
      : counterAttestationReady
        ? 'Generated from passing counter-attested manifest and verifier output.'
        : 'Counter-attestation verifier flags are incomplete; regenerate the final proof packet.',
    proofLevel: manifest.proofLevel ?? manifest.targetProofLevel ?? 'counter_attested',
    attestationModel: manifest.attestationModel ?? manifest.targetAttestationModel ?? 'merchant_terminal_visitor_signed',
    privacyModel: 'No customer names, phone numbers, emails, raw staff notes, or GPS coordinates are published. Public data is limited to proof objects, amounts, hashes, and verifier results.',
    verifiedFacts,
    commerceSignals: {
      receiptsRecorded: verifier.campaign?.totalRecorded ?? 1,
      campaignFunded: verifier.rewardEscrow?.totalFunded ?? manifest.inputs?.fundAmount ?? 'unknown',
      settledVolume: verifier.receipt?.settledAmount ?? verifier.campaign?.totalSettled ?? 'unknown',
      referrerSettled: verifier.settlementRecord?.referrerAmount ?? after.referrerRewardAccount ?? 'unknown',
      visitorSettled: verifier.settlementRecord?.visitorAmount ?? after.visitorRewardAccount ?? 'unknown',
      vaultRemaining: verifier.tokenBalances?.rewardVault ?? after.rewardVault ?? 'unknown',
      duplicateReplayChecks: (manifest.replayChecks ?? []).filter((check) => check.rejected).length,
    },
    proofObjects: {
      merchantConfig: String(manifest.pdas?.merchantConfig ?? ''),
      growthCampaign: String(manifest.pdas?.growthCampaign ?? ''),
      rewardEscrow: String(manifest.pdas?.rewardEscrow ?? ''),
      rewardVault: String(manifest.pdas?.rewardVault ?? ''),
      receiptPda: String(manifest.pdas?.causalReceipt ?? ''),
      nullifierPda: String(manifest.pdas?.nullifierRecord ?? ''),
      settlementRecord: String(manifest.pdas?.settlementRecord ?? ''),
      intentManifestHash: manifest.hashes?.intentManifestHash,
      visitAttestationHash: manifest.hashes?.visitAttestationHash,
    },
    explorerLinks: {
      recordCausalReceipt: manifest.explorerLinks?.transactions?.recordCausalReceipt,
      settleReceiptReward: manifest.explorerLinks?.transactions?.settleReceiptReward,
      receiptPda: manifest.explorerLinks?.accounts?.causalReceipt,
      nullifierPda: manifest.explorerLinks?.accounts?.nullifierRecord,
      settlementRecord: manifest.explorerLinks?.accounts?.settlementRecord,
      rewardEscrow: manifest.explorerLinks?.accounts?.rewardEscrow,
    },
  };

  const passport = {
    ...passportCore,
    passportHash: sha256Hex(passportCore),
    generatedAt: new Date().toISOString(),
    limitations: [
      'This passport proves counter-attested receipt and settlement artifacts, not GPS/location truth.',
      'Mainnet use requires external audit, funded relayer operations, and production incident coverage.',
      stale ? 'The source proof manifest is marked stale and must be regenerated after the counter-attestation upgrade.' : 'Passport generated from current proof manifest and verifier output.',
    ],
  };

  const written = writeJson(outputPath, passport);
  const failures: string[] = [];
  if (!verifier.ok) failures.push('Verifier output is not ok=true.');
  if (stale) failures.push(`Source proof is stale: ${manifest.proofStatus}`);
  if (!counterAttestationReady) failures.push('Counter-attestation flags are incomplete in manifest/verifier.');
  for (const [key, value] of Object.entries(verifiedFacts)) {
    if (!value) failures.push(`verifiedFacts.${key} is not true.`);
  }

  console.log(JSON.stringify({
    ok: failures.length === 0,
    outputPath: written,
    passportHash: passport.passportHash,
    proofStatus: passport.proofStatus,
    failures,
  }, null, 2));

  if (failures.length > 0) process.exitCode = 1;
}

main();
