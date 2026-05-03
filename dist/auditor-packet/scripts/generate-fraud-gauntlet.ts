import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { stampArtifact, stableJson } from './proof-artifact-utils';

type AttackEvidence = {
  id: string;
  title?: string;
  attempted?: boolean;
  expected?: 'rejected';
  observed?: 'rejected' | 'accepted' | 'not_proven';
  errorCode?: string;
  expectedErrorCode?: string;
  actualError?: string;
  expectedErrorMatched?: boolean;
  instruction?: string;
  accountsMutated?: boolean;
  accountsMutationVerified?: boolean;
  failureKind?: string;
  proofSource?: string;
  reason?: string;
};

type Manifest = {
  cluster?: string;
  programId?: string;
  generatedAt?: string;
  proofStatus?: string;
  proofStatusNote?: string;
  attestationModel?: string;
  targetAttestationModel?: string;
  proofLevel?: string;
  targetProofLevel?: string;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  pdas?: Record<string, unknown>;
  attackEvidence?: AttackEvidence[];
};

type Verifier = {
  ok?: boolean;
  failures?: string[];
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  nullifierVerified?: boolean;
  settlementVerified?: boolean;
};

type GauntletCase = {
  id: string;
  title: string;
  normalReferralFailure: string;
  viralSyncDefense: string;
  expected: 'rejected';
  observed: 'rejected' | 'accepted' | 'not_proven';
  status: 'blocked' | 'failed' | 'missing';
  instruction: string;
  errorCode: string;
  expectedErrorCode: string;
  actualError: string;
  expectedErrorMatched: boolean;
  accountsMutated: boolean;
  accountsMutationVerified: boolean;
  failureKind: string;
  proofSource: string;
  evidence: string;
};

const DEFAULT_MANIFEST = path.join('app', 'public', 'proofs', 'devnet-causal-commerce.json');
const DEFAULT_VERIFIER = path.join('tmp', 'devnet-causal-commerce-verifier.json');
const DEFAULT_OUTPUT = path.join('app', 'public', 'proofs', 'fraud-gauntlet.json');

const CASE_DEFS: Array<Omit<GauntletCase, 'observed' | 'status' | 'errorCode' | 'expectedErrorCode' | 'actualError' | 'expectedErrorMatched' | 'accountsMutated' | 'accountsMutationVerified' | 'proofSource' | 'evidence' | 'failureKind'> & { fallbackError: string }> = [
  { id: 'merchant-only-receipt', title: 'Merchant-only fake receipt', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'An admin can mark a conversion manually.', viralSyncDefense: 'Receipt requires enrolled terminal + visitor signer + merchant authority.', fallbackError: 'MissingRequiredSignature' },
  { id: 'wrong-terminal-signer', title: 'Wrong terminal signer', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'Anyone with staff access can approve a fake code.', viralSyncDefense: 'Terminal signer must match the enrolled terminal PDA.', fallbackError: 'InvalidTerminalAuthority' },
  { id: 'different-merchant-terminal', title: 'Terminal from different merchant', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'A copied terminal or another shop can attest the event.', viralSyncDefense: 'Terminal device is bound to the merchant config.', fallbackError: 'InvalidTerminalDevice' },
  { id: 'terminal-account-signer-mismatch', title: 'Correct terminal account, wrong signer', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'A backend can present the right device id but sign with another key.', viralSyncDefense: 'The signer must equal terminal_device.terminal_authority.', fallbackError: 'InvalidTerminalAuthority' },
  { id: 'visitor-signer-mismatch', title: 'Visitor signer mismatch', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'A staff member can redeem a claim for someone else.', viralSyncDefense: 'Visitor signer must match the claim-pass account lineage.', fallbackError: 'InvalidVisitorAuthority' },
  { id: 'visitor-beneficiary-mismatch', title: 'Visitor beneficiary mismatch', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'Payout can be redirected after the visit.', viralSyncDefense: 'Receipt visitor beneficiary must match visitor signer.', fallbackError: 'InvalidVisitorAuthority' },
  { id: 'claim-pass-reused', title: 'Claim pass reused', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'Coupon codes are screenshot and reused.', viralSyncDefense: 'Claim-pass account is consumed/recorded once.', fallbackError: 'ClaimPassAlreadyRecorded' },
  { id: 'claim-pass-campaign-mismatch', title: 'Claim pass campaign mismatch', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'A coupon from one campaign is accepted by another.', viralSyncDefense: 'Claim pass is bound to campaign PDA.', fallbackError: 'InvalidClaimPass' },
  { id: 'claim-pass-depth-exceeds-max-depth', title: 'Claim pass depth exceeds max depth', expected: 'rejected', instruction: 'issue_claim_pass', normalReferralFailure: 'Referral trees can grow beyond merchant risk limits.', viralSyncDefense: 'Claim depth is capped by campaign.max_depth.', fallbackError: 'MaxDepthExceeded' },
  { id: 'duplicate-nullifier', title: 'Duplicate receipt nullifier', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'The same redemption can be replayed.', viralSyncDefense: 'Nullifier PDA initialization is exact-once.', fallbackError: 'AccountAlreadyInitialized' },
  { id: 'inflated-reward-amount', title: 'Inflated reward amount', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'Backend bugs can overpay a reward.', viralSyncDefense: 'Receipt intent validates reward against manifest cap.', fallbackError: 'RewardAmountExceedsManifest' },
  { id: 'inflated-split-bps', title: 'Inflated referrer split bps', expected: 'rejected', instruction: 'settle_receipt_reward', normalReferralFailure: 'A backend can silently change payout split before settlement.', viralSyncDefense: 'Settlement terms are locked to the intent/campaign split.', fallbackError: 'IntentMismatch' },
  { id: 'wrong-reward-mint', title: 'Wrong reward mint', expected: 'rejected', instruction: 'fund_growth_bounty', normalReferralFailure: 'A fake token can be presented as campaign reward.', viralSyncDefense: 'Reward mint must match growth_campaign.reward_mint.', fallbackError: 'InvalidRewardMint' },
  { id: 'wrong-reward-vault', title: 'Wrong reward vault', expected: 'rejected', instruction: 'settle_receipt_reward', normalReferralFailure: 'Funds can be routed through a different vault.', viralSyncDefense: 'Reward vault is bound to reward escrow PDA.', fallbackError: 'ConstraintTokenOwner' },
  { id: 'settlement-replay', title: 'Settlement replay', expected: 'rejected', instruction: 'settle_receipt_reward', normalReferralFailure: 'A settled receipt can be paid again.', viralSyncDefense: 'Settlement PDA is initialized once per receipt.', fallbackError: 'AccountAlreadyInitialized' },
  { id: 'paused-or-expired-campaign', title: 'Paused or expired campaign receipt attempt', expected: 'rejected', instruction: 'record_causal_receipt', normalReferralFailure: 'Old campaigns keep accepting redemptions.', viralSyncDefense: 'Campaign status and expiry are checked before receipt recording.', fallbackError: 'CampaignInactive' },
];

function argValue(args: string[], flag: string) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function readJson<T>(filePath: string, fallback: T): T { const resolved = path.resolve(filePath); if (!existsSync(resolved)) return fallback; return JSON.parse(readFileSync(resolved, 'utf8')) as T; }
function writeJson(filePath: string, value: unknown) { const resolved = path.resolve(filePath); mkdirSync(path.dirname(resolved), { recursive: true }); writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`); return resolved; }
function hash(value: unknown) { return createHash('sha256').update(stableJson(value)).digest('hex'); }
function stale(status?: string) { return /needs|stale|unsafe/i.test(status ?? ''); }

function main() {
  const args = process.argv.slice(2);
  const manifestPath = argValue(args, '--manifest') ?? DEFAULT_MANIFEST;
  const verifierPath = argValue(args, '--verifier') ?? DEFAULT_VERIFIER;
  const outputPath = argValue(args, '--output') ?? DEFAULT_OUTPUT;
  const manifest = readJson<Manifest>(manifestPath, {});
  const verifier = readJson<Verifier>(verifierPath, {});
  const evidenceById = new Map((manifest.attackEvidence ?? []).map((item) => [item.id, item]));

  const cases: GauntletCase[] = CASE_DEFS.map((def) => {
    const evidence = evidenceById.get(def.id);
    const observed = evidence?.observed ?? 'not_proven';
    return {
      ...def,
      observed,
      status: observed === 'rejected' ? 'blocked' : observed === 'accepted' ? 'failed' : 'missing',
      errorCode: evidence?.errorCode ?? evidence?.expectedErrorCode ?? def.fallbackError,
      expectedErrorCode: evidence?.expectedErrorCode ?? evidence?.errorCode ?? def.fallbackError,
      actualError: evidence?.actualError ?? evidence?.reason ?? 'No actual error recorded.',
      expectedErrorMatched: evidence?.expectedErrorMatched === true,
      accountsMutated: evidence?.accountsMutated === true,
      accountsMutationVerified: evidence?.accountsMutationVerified === true,
      failureKind: evidence?.failureKind ?? 'missing',
      proofSource: evidence?.proofSource ?? 'structured attackEvidence missing from devnet manifest',
      evidence: evidence?.reason ?? evidence?.actualError ?? 'No structured attackEvidence entry generated for this case.',
    };
  });

  const blocked = cases.filter((item) => item.status === 'blocked').length;
  const missing = cases.filter((item) => item.status === 'missing').length;
  const failed = cases.filter((item) => item.status === 'failed').length;
  const expectedErrorsMatched = cases.filter((item) => item.expectedErrorMatched).length;
  const mutationVerified = cases.filter((item) => item.accountsMutated === false && item.accountsMutationVerified === true).length;
  const counterProofReady =
    verifier.ok === true &&
    verifier.terminalVerified === true &&
    verifier.visitorVerified === true &&
    verifier.lineageVerified === true &&
    verifier.settlementVerified === true &&
    manifest.terminalVerified === true &&
    manifest.visitorVerified === true &&
    manifest.lineageVerified === true;
  const strictFailureKinds = cases.filter((item) => item.failureKind === 'program_rejection' || item.failureKind === 'intent_validator_rejection').length;
  const proofStatus = stale(manifest.proofStatus)
    ? manifest.proofStatus
    : (blocked === cases.length && expectedErrorsMatched === cases.length && mutationVerified === cases.length && strictFailureKinds === cases.length && counterProofReady ? 'verified' : 'needs-final-proof-run');

  const core = {
    type: 'viral-sync-fraud-gauntlet',
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    network: manifest.cluster ? `solana-${manifest.cluster}` : 'solana-devnet',
    programId: manifest.programId,
    proofStatus,
    proofStatusNote: proofStatus === 'verified'
      ? 'All 16 structured attackEvidence cases were rejected with expected errors, account mutation checks passed, and counter-attested verifier flags are true.'
      : 'Run frontier:final to regenerate verified fraud evidence.',
    proofLevel: manifest.proofLevel ?? manifest.targetProofLevel ?? 'counter_attested',
    attestationModel: manifest.attestationModel ?? manifest.targetAttestationModel ?? 'merchant_terminal_visitor_signed',
    summary: {
      totalCases: cases.length,
      blocked,
      missing,
      failed,
      expectedErrorsMatched,
      mutationVerified,
      strictFailureKinds,
      verifier: {
        ok: verifier.ok === true,
        terminalVerified: verifier.terminalVerified === true && manifest.terminalVerified === true,
        visitorVerified: verifier.visitorVerified === true && manifest.visitorVerified === true,
        lineageVerified: verifier.lineageVerified === true && manifest.lineageVerified === true,
        nullifierVerified: verifier.nullifierVerified === true,
        settlementVerified: verifier.settlementVerified === true,
      },
    },
    cases,
  };
  const gauntlet = stampArtifact({ ...core, gauntletHash: hash(core) }, ['scripts/generate-fraud-gauntlet.ts']);
  const output = writeJson(outputPath, gauntlet);
  const ok = failed === 0 && missing === 0 && blocked === CASE_DEFS.length && expectedErrorsMatched === CASE_DEFS.length && mutationVerified === CASE_DEFS.length && strictFailureKinds === CASE_DEFS.length && counterProofReady;
  console.log(JSON.stringify({ ok, outputPath: output, blocked, missing, failed }, null, 2));
  if (!stale(manifest.proofStatus) && verifier.ok === true && !ok) {
    process.exitCode = 1;
  }
}

main();
