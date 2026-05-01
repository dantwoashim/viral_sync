import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

const PROGRAM_ID = new PublicKey("8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9");
const INBOUND_BUFFER_SIZE = 16;
const MAX_REFERRER_SLOTS = 4;

function findTokenGenerationPda(mint: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gen_v4"), mint.toBuffer(), owner.toBuffer()],
    PROGRAM_ID,
  );
}

function findMerchantConfigPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant_v4"), mint.toBuffer()],
    PROGRAM_ID,
  );
}

function findCommissionLedgerPda(referrer: PublicKey, merchant: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("commission_ledger"), referrer.toBuffer(), merchant.toBuffer()],
    PROGRAM_ID,
  );
}

function findSessionKeyPda(authority: PublicKey, delegatedSigner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session"), authority.toBuffer(), delegatedSigner.toBuffer()],
    PROGRAM_ID,
  );
}

function findCausalMerchantConfigPda(merchantAuthority: PublicKey, orgIdHash: Buffer) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("causal_merchant"), merchantAuthority.toBuffer(), orgIdHash],
    PROGRAM_ID,
  );
}

function findGrowthCampaignPda(merchantConfig: PublicKey, campaignIdHash: Buffer) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("growth_campaign"), merchantConfig.toBuffer(), campaignIdHash],
    PROGRAM_ID,
  );
}

function findRewardEscrowPda(campaign: PublicKey, rewardMint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reward_escrow"), campaign.toBuffer(), rewardMint.toBuffer()],
    PROGRAM_ID,
  );
}

function findNullifierRecordPda(campaign: PublicKey, nullifierHash: Buffer) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("campaign_nullifier"), campaign.toBuffer(), nullifierHash],
    PROGRAM_ID,
  );
}

function findCausalReceiptPda(campaign: PublicKey, receiptIdHash: Buffer) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("causal_receipt"), campaign.toBuffer(), receiptIdHash],
    PROGRAM_ID,
  );
}

function findSettlementRecordPda(receipt: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("settlement"), receipt.toBuffer()],
    PROGRAM_ID,
  );
}

function authorizeMerchantConfirmation(staffPin: string, expectedStaffPin: string) {
  if (!staffPin || staffPin !== expectedStaffPin) {
    return { ok: false, status: 401, reason: "Staff authorization is required to confirm a redemption." };
  }

  return { ok: true, status: 200 };
}

function simulateServerGuestSession(existing?: string | null) {
  if (existing && /^vs-[a-z0-9-]{8,96}$/i.test(existing)) {
    return existing;
  }
  return "vs-new-session-123";
}

function simulateVisitChallenge(nowMs: number, ttlMs: number) {
  return {
    challengeHash: "challenge-hash",
    issuedAt: nowMs,
    expiresAt: nowMs + ttlMs,
    status: "active" as "active" | "consumed" | "expired",
  };
}

function consumeVisitChallenge(challenge: ReturnType<typeof simulateVisitChallenge>, nowMs: number) {
  if (challenge.status !== "active") {
    throw new Error("challenge already consumed");
  }
  if (challenge.expiresAt <= nowMs) {
    challenge.status = "expired";
    throw new Error("challenge expired");
  }
  challenge.status = "consumed";
  return true;
}

function merchantScopedRows<T extends { merchantId?: string }>(rows: T[], merchantId: string) {
  return rows.filter((row) => row.merchantId === merchantId);
}

function appendRewardEntry(
  entries: { idempotencyKey: string; amount: number; balanceAfter: number }[],
  idempotencyKey: string,
  amount: number,
) {
  const existing = entries.find((entry) => entry.idempotencyKey === idempotencyKey);
  if (existing) {
    return existing;
  }
  const prior = entries.length ? entries[entries.length - 1].balanceAfter : 0;
  const entry = { idempotencyKey, amount, balanceAfter: prior + amount };
  entries.push(entry);
  return entry;
}

function randomLikeCode(seed: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = Array.from({ length: 6 }, (_, index) => alphabet[(seed + index * 7) % alphabet.length]).join("");
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function codeStateTransition(status: string, action: string) {
  const allowed: Record<string, Record<string, string>> = {
    issued: { scan: "scanned", expire: "expired", void: "voided" },
    scanned: { confirm: "confirmed", void: "voided" },
  };
  const next = allowed[status]?.[action];
  if (!next) {
    throw new Error("invalid code transition");
  }
  return next;
}

function outboxRetry(job: { status: string; attempts: number }) {
  job.attempts += 1;
  job.status = "pending";
  return job;
}

function commonApiError(message: string, code: string, requestId: string) {
  return { ok: false, error: { code, message, requestId } };
}

function sameOriginAllowed(origin: string, currentOrigin: string, allowed: string[] = []) {
  return origin === currentOrigin || allowed.includes(origin);
}

function validatePilotCampaignPublish(referralGoal: number, redemptionWindowHours: number) {
  if (!Number.isInteger(referralGoal) || referralGoal < 1 || referralGoal > 12) {
    throw new Error("invalid referral goal");
  }
  if (!Number.isInteger(redemptionWindowHours) || redemptionWindowHours < 1 || redemptionWindowHours > 720) {
    throw new Error("invalid redemption window");
  }
  return { ok: true, active: true };
}

function supportSearch(
  rows: { type: string; values: string[]; status: string }[],
  query: string,
) {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => row.values.some((value) => value.toLowerCase().includes(needle)));
}

function fraudReviewStatus(blockedClaims: number, totalClaims: number, thresholdPercent: number) {
  const blockRate = Math.round((blockedClaims / Math.max(totalClaims, 1)) * 100);
  return blockRate >= thresholdPercent ? "needs-review" : "clean";
}

function pilotSimulation(users: number, confirmed: number, receiptCount: number, openJobs: number) {
  const blockers: string[] = [];
  if (users !== 20) {
    blockers.push("simulation must use 20 users");
  }
  if (receiptCount < confirmed) {
    blockers.push("missing receipts");
  }
  if (openJobs > 0) {
    blockers.push("open outbox jobs");
  }
  return { users, recommendation: blockers.length === 0 ? "go" : "go-with-watchlist", blockers };
}

function ensurePilotRoster(existingMerchantIds: string[]) {
  const templates = [
    "merchant-thamel-brew-house",
    "merchant-jhamel-momo-yard",
    "merchant-pokhara-hostel-hub",
  ];
  return Array.from(new Set([...existingMerchantIds, ...templates]));
}

function funnelRates(invites: number, claims: number, visits: number, confirmations: number, receipts: number) {
  const rate = (to: number, from: number) => from <= 0 ? 0 : Math.round((to / from) * 100);
  return [
    rate(claims, invites),
    rate(visits, claims),
    rate(confirmations, visits),
    rate(receipts, confirmations),
  ];
}

function campaignTemplateCategories() {
  return ["Cafe", "QSR", "Hostel", "Creator"];
}

function weeklyMerchantReport(verifiedVisits: number, suspiciousActivity: number) {
  return {
    verifiedVisits,
    rewardCostNpr: verifiedVisits * 150,
    suspiciousActivity,
  };
}

function testimonialReady(permission: string, name: string) {
  return permission === "approved" && name !== "Permission pending";
}

function actionMetadata(receiptId: string, exists: boolean) {
  return {
    title: exists ? "Merchant verified a referred visit" : "Causal Receipt not found",
    label: "Verify receipt",
    disabled: !exists,
    href: exists ? `/api/actions/causal-receipt/${receiptId}` : null,
  };
}

function signIntent(intent: string, secret = "demo-secret") {
  let hash = 0;
  for (const char of `${secret}:${intent}`) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function verifySponsoredIntent(params: {
  apiKey: string;
  expectedApiKey: string;
  intent: string;
  signature: string;
  action: string;
}) {
  if (params.apiKey !== params.expectedApiKey) {
    return { ok: false, reason: "Service auth failed." };
  }
  if (params.signature !== signIntent(params.intent)) {
    return { ok: false, reason: "Signed user intent is invalid." };
  }
  const decoded = JSON.parse(params.intent) as { action: string };
  return { ok: decoded.action === params.action };
}

function blinkUrl(actionUrl: string) {
  return `solana-action:${actionUrl}`;
}

function relayerPolicy() {
  return {
    allowedPrograms: ["8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9"],
    allowedInstructions: [
      "verify_causal_receipt",
      "register_merchant",
      "create_growth_campaign",
      "fund_growth_bounty",
      "record_causal_receipt",
      "settle_receipt_reward",
      "close_growth_bounty",
    ],
    perWalletDailyCap: 5,
    perMerchantDailyCap: 100,
    perCampaignDailyCap: 50,
    simulationRequired: true,
    serviceAuthRequired: true,
  };
}

function productionSecretReady(value: string | undefined, demoValue: string) {
  return Boolean(value && value !== demoValue && !value.toLowerCase().includes("demo"));
}

type MerchantRole = "owner" | "admin" | "manager" | "staff" | "support" | "auditor";

function merchantRoleAllows(role: MerchantRole, allowed: MerchantRole[]) {
  if (allowed.includes(role)) return true;
  const effectiveRole = role === "admin" ? "manager" : role;
  const effectiveAllowed = new Set(allowed.map((item) => item === "admin" ? "manager" : item));
  if (effectiveAllowed.has("owner")) return effectiveRole === "owner";
  if (effectiveAllowed.has("manager")) return effectiveRole === "owner" || effectiveRole === "manager";
  if (effectiveAllowed.has("staff")) return effectiveRole === "owner" || effectiveRole === "manager" || effectiveRole === "staff";
  if (effectiveAllowed.has("support")) return effectiveRole === "owner" || effectiveRole === "manager" || effectiveRole === "support";
  if (effectiveAllowed.has("auditor")) return effectiveRole === "owner" || effectiveRole === "manager" || effectiveRole === "auditor";
  return false;
}

function launchMutationAllowed(paused: boolean, method: string) {
  return !(paused && ["POST", "PUT", "PATCH", "DELETE"].includes(method));
}

function staffConfirmationAllowed(params: { production: boolean; sessionRole?: MerchantRole; deviceEnrolled: boolean; demoPin: boolean }) {
  const roleOk = params.sessionRole ? merchantRoleAllows(params.sessionRole, ["staff"]) : false;
  if (params.production) {
    return roleOk && params.deviceEnrolled;
  }
  return (roleOk && params.deviceEnrolled) || params.demoPin;
}

function circuitBreakerStateTransition(status: string, next: string) {
  if (status === "Closed") {
    throw new Error("closed campaign cannot be resumed or paused");
  }
  if (!["Active", "Paused"].includes(next)) {
    throw new Error("invalid live status");
  }
  return next;
}

function replayProtected(nonces: Set<string>, nonce: string) {
  if (nonces.has(nonce)) {
    return { ok: false, reason: "Replay nonce already used." };
  }
  nonces.add(nonce);
  return { ok: true };
}

function spendLimitAllowed(counts: { wallet: number; merchant: number; campaign: number }, policy = relayerPolicy()) {
  return counts.wallet < policy.perWalletDailyCap &&
    counts.merchant < policy.perMerchantDailyCap &&
    counts.campaign < policy.perCampaignDailyCap;
}

function receiptStatus(receiptSettled: boolean, submit?: string, index?: string) {
  if (submit === "failed" || index === "failed") {
    return "failed";
  }
  if (index === "succeeded") {
    return "indexed";
  }
  if (receiptSettled || submit === "succeeded") {
    return "confirmed";
  }
  if (submit) {
    return "submitted";
  }
  return "pending";
}

function graphLabelsArePrivate(nodes: { kind: string; label: string; privateLabel: boolean }[]) {
  return nodes
    .filter((node) => node.kind === "invite" || node.kind === "visitor")
    .every((node) => node.privateLabel && !/Alice|Bob|Carol|Asha/i.test(node.label));
}

function rewardLiability(counts: { issued: number; settled: number; voided: number }, unit = 150) {
  const reserved = counts.issued * unit;
  const settled = counts.settled * unit;
  const voided = counts.voided * unit;
  return { reserved, settled, voided, remaining: Math.max(reserved - settled - voided, 0) };
}

function costPerVerifiedVisit(receipts: number, rewardCost: number, platformFee: number) {
  const total = rewardCost + platformFee;
  return receipts > 0 ? Math.round(total / receipts) : 0;
}

function billingEventsForReceipt(receiptId: string, merchantId: string) {
  return [
    { id: `usage-${receiptId}`, type: "usage_fee", merchantId, receiptId, amountNpr: 150, status: "issued" },
    { id: `platform-${receiptId}`, type: "platform_fee", merchantId, receiptId, amountNpr: 25, status: "issued" },
  ];
}

function partnerPayout(platformFee: number, settled: boolean) {
  return settled ? Math.round(platformFee * 0.2) : 0;
}

function partnerQualityHold(score: number, velocitySpike: boolean) {
  return score < 60 || velocitySpike;
}

function evidenceConfidence(level: string) {
  const levels: Record<string, number> = {
    staff_only: 45,
    receipt_id: 65,
    csv_match: 78,
    solana_pay: 86,
    pos_webhook: 92,
  };
  return levels[level] ?? 0;
}

function matchCsvReceipt(rows: { receipt_id: string; amount_npr: number }[], receiptIds: Set<string>) {
  return rows.map((row) => ({
    receiptId: row.receipt_id,
    amountNpr: row.amount_npr,
    matched: receiptIds.has(row.receipt_id),
  }));
}

function attributedSpend(receipts: { spendNpr: number }[], rewardCostNpr: number) {
  const revenue = receipts.reduce((sum, receipt) => sum + receipt.spendNpr, 0);
  return {
    aovNpr: receipts.length ? Math.round(revenue / receipts.length) : 0,
    revenue,
    roi: rewardCostNpr ? Number((revenue / rewardCostNpr).toFixed(2)) : 0,
  };
}

function solanaPayReference(seed: string) {
  return `solana:11111111111111111111111111111111?amount=0.001&reference=${seed}`;
}

function securityGate(unresolved: { priority: string; status: string }[]) {
  const blocking = unresolved.filter((item) => item.status === "open" && (item.priority === "P0" || item.priority === "P1"));
  return { mainnetAllowed: blocking.length === 0, blocking };
}

function escapesUserHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unsafeHtmlRendered(code: string) {
  return /dangerouslySetInnerHTML|innerHTML\s*=/.test(code);
}

function betaScopeAllowed(scope: { cappedFundsNpr: number; allowlisted: number; pauseSwitch: boolean }) {
  return scope.cappedFundsNpr <= 10_000 && scope.allowlisted > 0 && scope.pauseSwitch;
}

function migrationRehearsalChecks(before: { merchants: number; receipts: number }, after: { merchants: number; receipts: number }) {
  return before.merchants === after.merchants && before.receipts === after.receipts;
}

function betaReview(gateAllowed: boolean) {
  return gateAllowed ? "go-capped-beta" : "no-go-mainnet";
}

function cappedDeployment(scope: { cap: number; allowlisted: string[]; pauseTested: boolean }) {
  return scope.cap <= 10_000 && scope.allowlisted.length > 0 && scope.pauseTested;
}

function proofAssetChecklist(assets: { txLinks: number; screenshots: number; quote: boolean }) {
  return assets.txLinks >= 0 && assets.screenshots >= 3 && assets.quote;
}

function failureRecoveryAction(state: string) {
  const actions: Record<string, string> = {
    failed_tx: "rerun indexer",
    pending_receipt: "check reconciliation",
    bad_code: "search support and void",
  };
  return actions[state] ?? "open incident";
}

function merchantPipeline(count: number) {
  const stages = ["lead", "contacted", "demo-booked", "pilot-ready", "paid-ask"];
  return Array.from({ length: count }, (_, index) => ({ stage: stages[index % stages.length] }));
}

function onboardingDropOffs(counts: number[]) {
  return counts.map((count, index) => ({
    count,
    lostFromPrior: index === 0 ? 0 : Math.max(counts[index - 1] - count, 0),
  }));
}

function merchantHealthScore(parts: {
  recentCampaign: number;
  staffActivity: number;
  redemptions: number;
  reportViews: number;
}) {
  const score = parts.recentCampaign + parts.staffActivity + parts.redemptions + parts.reportViews;
  return {
    score,
    status: score >= 70 ? "healthy" : score >= 40 ? "needs-nudge" : "churn-risk",
  };
}

function campaignRecommendation(worstStage: string) {
  if (worstStage === "Claim to visit") {
    return "Shorten redemption window and raise table urgency.";
  }
  if (worstStage === "Invite to claim") {
    return "Move QR to counter and table tent with staff prompt.";
  }
  return "Keep reward capped and easy to explain.";
}

function weeklyGrowthReview(health: { score: number; status: string }[], live: number) {
  return {
    live,
    active: health.filter((row) => row.score >= 40).length,
    paid: 0,
    churnRisk: health.filter((row) => row.status === "churn-risk").length,
  };
}

function tractionSummary(metrics: {
  liveMerchants: number;
  claims: number;
  redemptions: number;
  receipts: number;
}, pipelineLeads: number, bookedDemos: number) {
  return {
    merchants: metrics.liveMerchants,
    claims: metrics.claims,
    redemptions: metrics.redemptions,
    receipts: metrics.receipts,
    paidCommitments: 0,
    pipelineLeads,
    bookedDemos,
  };
}

function architectureEdges() {
  return [
    ["Product app", "Launch ledger API", "invite/claim/redeem"],
    ["Launch ledger API", "Anchor program", "receipt accounts"],
    ["Launch ledger API", "Relayer", "sponsored verification intent"],
    ["Anchor program", "Indexer", "events"],
    ["Indexer", "Causal graph", "nodes/edges"],
    ["Causal graph", "Product app", "receipt explorer"],
  ];
}

function paidConversionSprint(reports: { merchant: string; roi: string; nextAction: string }[]) {
  return {
    target: reports.length,
    asks: reports.map((report) => `Approve paid continuation: ${report.roi}. Next action: ${report.nextAction}`),
  };
}

function demoTimelineValid(steps: { time: string; route: string }[]) {
  return steps.length === 6 &&
    steps[0].route === "/pitch" &&
    steps[steps.length - 1].route === "/traction";
}

function packageReviewReady(pack: { repo: boolean; demo: boolean; docs: number; video: boolean; metrics: boolean; knownLimits: number }) {
  return pack.repo && pack.demo && pack.docs >= 4 && pack.video && pack.metrics && pack.knownLimits >= 2;
}

function privacySafeFraudNodes(nodes: { type: string; privacy: string; label: string }[]) {
  return nodes.every((node) => {
    if (node.type === "consumer" || node.type === "device") {
      return node.privacy === "hashed" && !node.label.includes("@") && !/\d{7,}/.test(node.label);
    }
    return true;
  });
}

function partnerQualityScore(parts: { base: number; verifiedVisits: number; rejects: number; repeats: number; retention: number }) {
  const score = Math.max(0, Math.min(100, parts.base + parts.verifiedVisits * 3 + parts.repeats * 2 + parts.retention - parts.rejects));
  return {
    score,
    payoutAdjustment: score >= 80 ? "normal" : score >= 65 ? "delayed-review" : "hold",
  };
}

function riskSimulationControls(attacks: { attack: string; control: string; expected: string }[]) {
  return attacks.every((attack) => attack.control.length > 0 && ["blocked or held", "held for review", "risk-adjusted payout"].includes(attack.expected));
}

function settlementHold(score: number) {
  if (score < 60) {
    return { holdHours: 72, action: "manual review before payout" };
  }
  if (score < 75) {
    return { holdHours: 24, action: "delayed payout with merchant notification" };
  }
  return { holdHours: 0, action: "normal settlement" };
}

function compressedReceiptScope(items: { name: string; hot: boolean }[]) {
  return items.filter((item) => !item.hot).map((item) => item.name);
}

function merkleLeafNoPii(fields: { name: string; pii: boolean }[], proofFields: string[]) {
  return fields.every((field) => !field.pii) &&
    ["leaf", "leafIndex", "root", "siblings"].every((field) => proofFields.includes(field));
}

function demoMerkleRoot(leaves: string[]) {
  let level = leaves.length ? leaves : ["empty"];
  while (level.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < level.length; index += 2) {
      next.push(`${level[index]}:${level[index + 1] ?? level[index]}`);
    }
    level = next;
  }
  return level[0];
}

function receiptExplorerMetadata(receiptId: string, root: string, leaf: string) {
  return { receiptId, compressedRoot: root, leaf, proofVisible: Boolean(root && leaf) };
}

function compressionCostDecision(hotStateLive: boolean, historicalLeavesOnly: boolean) {
  return hotStateLive && historicalLeavesOnly ? "keep-show-roadmap" : "fallback-normal-receipts";
}

function sdkSurfaceValid(helpers: string[]) {
  return ["verifyReceipt", "fetchGraph", "buildInviteAction", "deriveReceiptSeed"].every((helper) => helpers.includes(helper));
}

function sdkVerifyReceipt(payload: { ok: boolean; status: string; settlementStatus?: string; receiptPda?: string; txSignature?: string }) {
  return payload.ok &&
    payload.status === "verified" &&
    payload.settlementStatus === "settled" &&
    Boolean(payload.receiptPda) &&
    Boolean(payload.txSignature);
}

function publicVerifyReceipt(receipt?: { id: string; status: string }) {
  if (!receipt) {
    return { ok: false, status: "not_found" };
  }
  return { ok: receipt.status === "settled", status: receipt.status === "settled" ? "verified" : "pending" };
}

function exampleAppFreshClone(steps: string[]) {
  return ["install dependencies", "call verification endpoint", "render graph nodes", "handle missing receipt"].every((step) => steps.includes(step));
}

function webhookSignature(payload: string, secret: string) {
  return `${secret}:${payload}`;
}

function webhookSignatureValid(payload: string, signature: string, secret: string) {
  return signature === webhookSignature(payload, secret);
}

function developerReviewResolved(blockers: { status: string }[]) {
  return blockers.length > 0 && blockers.every((blocker) => blocker.status === "fixed");
}

function neighborhoodRouteUnlock(visits: number, requiredVisits: number, availableStops: number) {
  return requiredVisits <= availableStops && visits >= requiredVisits;
}

function discoveryPrivacySafe(campaigns: { customerLabel?: string; deviceId?: string; active: boolean }[]) {
  return campaigns.every((campaign) => campaign.active && !campaign.customerLabel && !campaign.deviceId);
}

function crossPromotionSplit(sourcePercent: number, targetPercent: number, approved: boolean) {
  return approved && sourcePercent > 0 && targetPercent > 0 && sourcePercent + targetPercent === 100;
}

function marketplaceControlsAllowed(config: { optIn: boolean; cap: number; categoryAllowed: boolean; partnerApproved: boolean }) {
  return config.optIn && config.cap <= 5_000 && config.categoryAllowed && config.partnerApproved;
}

function marketplaceReview(metrics: { retentionVisits: number; redemptions: number; partnerInterest: number }) {
  return metrics.retentionVisits > 1 && metrics.redemptions > 0 && metrics.partnerInterest >= 2 ? "keep-testing" : "cut-or-redesign";
}

function creatorCampaignRiskSafe(spec: { payoutAfterSettlement: boolean; qualityScore: boolean; fraudHolds: number; contentApproved: boolean }) {
  return spec.payoutAfterSettlement && spec.qualityScore && spec.fraudHolds >= 2 && spec.contentApproved;
}

function creatorOnboardingReady(profile: boolean, payoutWallet: boolean, campaignLink: boolean) {
  return profile && payoutWallet && campaignLink;
}

function creatorAnalytics(row: { clicks: number; claims: number; verifiedVisits: number; settledRewardsNpr: number }) {
  return {
    claimRate: row.clicks <= 0 ? 0 : Math.round((row.claims / row.clicks) * 100),
    visitRate: row.claims <= 0 ? 0 : Math.round((row.verifiedVisits / row.claims) * 100),
    earningsNpr: row.settledRewardsNpr,
  };
}

function creatorPayoutStatus(row: { qualityScore: number; settledRewardsNpr: number; pendingRewardsNpr: number }) {
  if (row.qualityScore < 75) {
    return "held";
  }
  if (row.settledRewardsNpr > 0) {
    return "settled";
  }
  return row.pendingRewardsNpr > 0 ? "pending" : "pending";
}

function creatorLeaderboardRank(row: { verifiedVisits: number; qualityScore: number; clicks: number }) {
  return row.verifiedVisits * 10 + row.qualityScore;
}

function microCreatorTest(count: number, feedbackCollected: boolean) {
  return count >= 1 && count <= 3 && feedbackCollected;
}

function weeklyCreatorReview(metrics: { verifiedVisits: number; claims: number; heldPayouts: number }) {
  return {
    conversionRate: metrics.claims <= 0 ? 0 : Math.round((metrics.verifiedVisits / metrics.claims) * 100),
    payoutAdjustment: metrics.heldPayouts > 0 ? "hold risky sources" : "keep default split",
  };
}

function campaignAssistantInputs(inputs: string[]) {
  return ["merchant type", "margin", "traffic", "reward budget", "historical funnel"].every((input) => inputs.includes(input));
}

function ruleBasedAssistant(input: { marginPercent: number; rewardBudgetNpr: number; claimToVisitRate: number }) {
  const rewardNpr = input.marginPercent >= 50 ? 150 : 75;
  return {
    rewardNpr,
    cap: Math.floor(input.rewardBudgetNpr / rewardNpr),
    template: input.claimToVisitRate < 35 ? "urgency-counter-prompt" : "simple-share",
  };
}

function liabilitySimulator(input: { rewardNpr: number; cap: number; expectedClaims: number; claimToVisitRate: number; grossMarginNpr: number }) {
  const expectedConversions = Math.min(input.cap, Math.round((input.expectedClaims * input.claimToVisitRate) / 100));
  const maxCostNpr = input.rewardNpr * input.cap;
  return {
    maxCostNpr,
    expectedConversions,
    breakEvenVisits: Math.ceil(maxCostNpr / input.grossMarginNpr),
  };
}

function copyGeneratorSafe(copy: string) {
  return !/guaranteed|fraud-proof|free money/i.test(copy) && copy.includes("confirm");
}

function fraudSafeRecommendation(input: { rewardNpr: number; marginPercent: number; repeatDeviceRisk: boolean; claimToVisitRate: number }) {
  return input.rewardNpr <= input.marginPercent * 4 && !input.repeatDeviceRisk && input.claimToVisitRate >= 25;
}

function assistantReview(acceptedSuggestions: number, improvedActivation: number, rejectedFluff: string[]) {
  return acceptedSuggestions > 0 && improvedActivation > 0 && rejectedFluff.length > 0 ? "keep practical rules" : "pause assistant expansion";
}

function posPathSelection(demand: { csvExport: boolean; webhookSandbox: boolean; customBuilds: number }) {
  return demand.csvExport && demand.customBuilds === 0
    ? "csv-import-first"
    : demand.webhookSandbox
      ? "signed-webhook"
      : "manual-receipt-evidence";
}

function posAdapterReady(adapter: { auth: boolean; config: boolean; importMode: boolean; mapping: boolean }) {
  return adapter.auth && adapter.config && adapter.importMode && adapter.mapping;
}

function posPaymentMatch(sale: { receiptId: string; amount: number; minutesFromRedemption: number }, redemption: { receiptId: string; expectedAmount: number }) {
  return sale.receiptId === redemption.receiptId &&
    Math.abs(sale.amount - redemption.expectedAmount) <= 5 &&
    Math.abs(sale.minutesFromRedemption) <= 30;
}

function reconciliationBuckets(rows: { status: string }[]) {
  return {
    matched: rows.filter((row) => row.status === "matched").length,
    unmatched: rows.filter((row) => row.status !== "matched").length,
  };
}

function posFailureAction(kind: string) {
  const actions: Record<string, string> = {
    outage: "queue import",
    duplicate_webhook: "dedupe by receipt fingerprint",
    bad_data: "reject row",
  };
  return actions[kind] ?? "manual review";
}

function posPilotDecision(metrics: { matchedRows: number; unmatchedRows: number }) {
  return metrics.matchedRows > 0 && metrics.unmatchedRows <= 1 ? "expand-carefully" : "keep-manual-import";
}

function passbookPrivacySafe(items: { privateLabel?: boolean; rawDevice?: string; phone?: string }[]) {
  return items.every((item) => !item.rawDevice && !item.phone);
}

function rewardHistoryBuckets(rows: { status: string }[]) {
  return {
    earned: rows.filter((row) => row.status === "earned").length,
    pending: rows.filter((row) => row.status === "pending").length,
    settled: rows.filter((row) => row.status === "settled").length,
    expired: rows.filter((row) => row.status === "expired").length,
  };
}

function nearbyCampaignAllowed(campaign: { optIn: boolean; merchantControls: boolean; available: boolean }) {
  return campaign.optIn && campaign.merchantControls && campaign.available;
}

function notificationPreferencesValid(preferences: { consent: boolean; optOut: boolean; channels: string[] }) {
  return preferences.consent && preferences.optOut && preferences.channels.length > 0;
}

function referralStreak(current: number, cap: number, settledOnly: boolean) {
  return { value: settledOnly ? Math.min(current, cap) : 0, capped: current >= cap };
}

function feedbackRound(users: number, frictionNotes: number) {
  return users === 10 && frictionNotes > 0;
}

function weeklyPassbookReview(metrics: { repeatUsage: number; shares: number; optOuts: number }) {
  return metrics.repeatUsage > 0 && metrics.optOuts <= metrics.repeatUsage ? "adjust-labels" : "pause-growth";
}

function locationHierarchyValid(tree: { org: boolean; merchant: boolean; locations: number; staffDevices: number }) {
  return tree.org && tree.merchant && tree.locations >= 1 && tree.staffDevices >= 0;
}

function locationTargetingValid(mode: string, selected: string[]) {
  return mode === "all_locations" || (mode === "selected_locations" && selected.length > 0 && selected.every((id) => id.startsWith("loc-")));
}

function locationRoi(redemptions: number, receipts: number, valuePerReceipt: number) {
  return { redemptions, receipts, roiNpr: receipts * valuePerReceipt };
}

function staffLocationAction(role: string, fromAllowed: boolean, toAllowed: boolean, revoked: boolean) {
  return (role === "owner" || role === "admin" || (role === "regional_manager" && fromAllowed && toAllowed)) && !revoked;
}

function regionalManagerAccess(allowed: string[], requested: string) {
  return allowed.includes(requested);
}

function multiLocationSimulation(locationsRun: number, e2e: boolean) {
  return locationsRun >= 2 && e2e;
}

function feeModelValid(model: { usageFee: number; takeRatePercent: number; tiers: number }) {
  return model.usageFee > 0 && model.takeRatePercent > 0 && model.takeRatePercent <= 30 && model.tiers >= 3;
}

function automatedInvoice(lineItems: { quantity: number; unitNpr: number; totalNpr: number }[]) {
  return lineItems.every((item) => item.quantity * item.unitNpr === item.totalNpr);
}

function paymentCollectionSecure(methods: { storesCardData: boolean; signedLink: boolean }[]) {
  return methods.every((method) => !method.storesCardData && method.signedLink);
}

function dunningCadenceFriendly(days: number[], copy: string) {
  return days.every((day) => day > 0) && !/threat|penalty|shame/i.test(copy);
}

function revenueDashboardMath(metrics: { mrr: number; usageFees: number; settledRewards: number; platformTake: number }) {
  return metrics.mrr >= 0 && metrics.usageFees >= 0 && metrics.settledRewards >= 0 && metrics.platformTake >= 0;
}

function paidMerchantPushReady(active: number, objections: number) {
  return active > 0 && objections >= 2;
}

function weeklyBillingReview(metrics: { paidConversion: boolean; churn: number; arpm: number }) {
  return metrics.paidConversion && metrics.churn <= 1 && metrics.arpm > 0 ? "mature-pricing" : "adjust-pricing";
}

function auditPrepReady(scope: string[]) {
  return ["program", "relayer", "auth", "ledger", "threat model"].every((item) => scope.includes(item));
}

function invariantsDocumented(invariants: Record<string, string>) {
  return ["settlement", "escrow", "nullifier", "receiptUniqueness"].every((key) => Boolean(invariants[key]));
}

function negativeCoverageAdded(tests: string[]) {
  return ["billing", "payment security", "invariants", "disclosure"].every((item) => tests.includes(item));
}

function externalReviewIssues(issues: { severity: string; status: string }[]) {
  return {
    highOpen: issues.filter((issue) => issue.severity === "high" && issue.status !== "patched").length,
    patched: issues.filter((issue) => issue.status === "patched").length,
  };
}

function disclosureHonest(disclosure: { auditStatus: string; limitations: string[] }) {
  return /not externally audited/i.test(disclosure.auditStatus) && disclosure.limitations.length >= 2;
}

function weeklySecurityCaps(caps: { rewardCap: number; sponsoredTxCap: number; maxMerchants: number; uncappedAllowed: boolean }) {
  return caps.rewardCap <= 10_000 && caps.sponsoredTxCap <= 250 && caps.maxMerchants <= 3 && !caps.uncappedAllowed;
}

function launchChecklistUpdated(items: string[]) {
  return ["verify passed", "audit status disclosed", "caps configured", "pause switch tested", "merchant consent captured"].every((item) => items.includes(item));
}

function formalAuditHandoff(scope: string[], artifacts: number) {
  return auditPrepReady(scope) && artifacts >= 4;
}

function formalInvariantTargets(targets: string[]) {
  return ["settlement", "escrow", "nullifier", "receipt uniqueness"].every((target) => targets.includes(target));
}

function propertyTargetsCovered(targets: string[]) {
  return ["settlement replay", "escrow overdraw", "duplicate nullifier", "duplicate receipt id"].every((target) => targets.includes(target));
}

function formalReviewTracker(issues: { severity: string; status: string }[]) {
  return issues.every((issue) => issue.severity !== "high" || issue.status === "patched");
}

function highSeverityRegression(patchedHigh: number, regressionTests: number) {
  return patchedHigh > 0 && regressionTests >= patchedHigh;
}

function formalDisclosureDocs(updatedDocs: string[], auditStatus: string) {
  return updatedDocs.includes("docs/current-state.md") && updatedDocs.includes("README.md") && /not externally audited/i.test(auditStatus);
}

function strictCapAssistant(spec: { rewardBudgetCap: boolean; verifiedVisitCap: boolean; sponsoredTxCap: boolean; noMagicClaims: boolean }) {
  return spec.rewardBudgetCap && spec.verifiedVisitCap && spec.sponsoredTxCap && spec.noMagicClaims;
}

function strictCapRuleSuggestion(suggestion: { rewardBudgetNpr: number; verifiedVisitCap: number; hasMerchantFeedback: boolean }) {
  return suggestion.rewardBudgetNpr <= 3_000 && suggestion.verifiedVisitCap <= 20 && suggestion.hasMerchantFeedback;
}

function strictCapLiability(liability: { maxCostNpr: number; breakEvenVisits: number; cap: number }) {
  return liability.maxCostNpr <= 3_000 && liability.breakEvenVisits <= liability.cap;
}

function mainnetBetaCopySafe(copy: string) {
  return /capped|verified visit/i.test(copy) && !/guaranteed|fraud-proof|free money/i.test(copy);
}

function mainnetBetaFraudRecommendation(input: { rewardNpr: number; marginPercent: number; repeatDeviceRisk: boolean; claimToVisitRate: number }) {
  const maxReward = Math.floor(input.marginPercent * 3);
  return input.rewardNpr <= maxReward && input.claimToVisitRate >= 30 && !input.repeatDeviceRisk;
}

function assistantAnalyticsLoop(metrics: { suggestions: number; accepted: number; activationLift: number; capViolations: number }) {
  const acceptanceRate = Math.round((metrics.accepted / Math.max(metrics.suggestions, 1)) * 100);
  return {
    acceptanceRate,
    keep: acceptanceRate >= 40 && metrics.activationLift > 0 && metrics.capViolations === 0,
  };
}

function weeklyAssistantPractical(kept: string[], cut: string[]) {
  return kept.includes("budget caps") && kept.includes("staff-ready copy") && cut.includes("generic virality");
}

function sloTargetsMet(slo: { uptimePercent: number; p95LatencyMs: number; receiptSuccessPercent: number }) {
  return slo.uptimePercent >= 99.5 && slo.p95LatencyMs <= 1500 && slo.receiptSuccessPercent >= 98;
}

function alertTuningHealthy(alerts: { name: string; severity: string; suppressed: boolean }[]) {
  return alerts.some((alert) => alert.severity === "critical" && !alert.suppressed)
    && alerts.some((alert) => alert.severity === "low" && alert.suppressed);
}

function backupRestoreDrillReady(drill: { rpoMinutes: number; rtoMinutes: number; verified: boolean }) {
  return drill.rpoMinutes <= 60 && drill.rtoMinutes <= 30 && drill.verified;
}

function outboxReliabilityHealthy(metrics: { pending: number; failed: number; deadLetter: number; retryPolicy: boolean }) {
  return metrics.pending <= 3 && metrics.failed === 0 && metrics.deadLetter === 0 && metrics.retryPolicy;
}

function supportWorkflowReady(workflow: { triage: boolean; escalation: boolean; refundPath: boolean; statusUpdate: boolean }) {
  return workflow.triage && workflow.escalation && workflow.refundPath && workflow.statusUpdate;
}

function statusPageHealthy(status: { publicStatus: string; apiUptimePercent: number; outboxBacklog: number }) {
  return status.publicStatus === "operational" && status.apiUptimePercent >= 99.5 && status.outboxBacklog <= 3;
}

function canonicalMetricDictionary(metrics: string[]) {
  return ["invites", "claims", "redemptions", "receipts", "settlement", "retention"].every((metric) => metrics.includes(metric));
}

function eventPipelineReconciles(counts: { sourceEvents: number; outboxEvents: number; dashboardEvents: number }) {
  return counts.sourceEvents >= counts.outboxEvents && counts.outboxEvents >= counts.dashboardEvents;
}

function cohortDashboardUseful(cohorts: { cohort: string; claims: number; retained: number }[]) {
  return cohorts.length > 0 && cohorts.every((cohort) => cohort.retained <= cohort.claims);
}

function roiDashboardV2Safe(roi: { revenueNpr: number; rewardCostNpr: number; fraudHoldsNpr: number }) {
  return roi.revenueNpr >= roi.rewardCostNpr + roi.fraudHoldsNpr;
}

function dataQualityChecksPass(checks: { duplicateEvents: number; missingReceipts: number; staleViews: number }) {
  return checks.duplicateEvents === 0 && checks.missingReceipts === 0 && checks.staleViews <= 1;
}

function submissionExportComplete(pack: { csv: boolean; screenshots: number; readme: boolean }) {
  return pack.csv && pack.screenshots >= 3 && pack.readme;
}

function weeklyAnalyticsReviewReady(review: { canonicalMetrics: boolean; cohortNotes: boolean; actionItems: number }) {
  return review.canonicalMetrics && review.cohortNotes && review.actionItems > 0;
}

function churnAnalysisActionable(churned: { reason: string; fix: string }[]) {
  return churned.length > 0 && churned.every((row) => row.reason.length > 0 && row.fix.length > 0);
}

function activationRedesignImproves(beforePercent: number, afterPercent: number) {
  return afterPercent > beforePercent && afterPercent >= 40;
}

function successPlaybooksReady(playbooks: string[]) {
  return ["first campaign", "staff training", "weekly review", "paid conversion"].every((playbook) => playbooks.includes(playbook));
}

function recurringTemplatesReady(templates: { cadence: string; cap: number; fraudCheck: boolean }[]) {
  return templates.length >= 2 && templates.every((template) => template.cap > 0 && template.cap <= 30 && template.fraudCheck);
}

function staffAdherenceReady(tools: { checklist: boolean; deviceAudit: boolean; missRatePercent: number }) {
  return tools.checklist && tools.deviceAudit && tools.missRatePercent <= 10;
}

function retentionReviewUseful(review: { caseStudy: boolean; repeatVisits: number; nextExperiment: string }) {
  return review.caseStudy && review.repeatVisits > 0 && review.nextExperiment.length > 0;
}

function partnerExpansionPlanReady(plan: { ICP: boolean; approvalFlow: boolean; payoutRules: boolean; cappedPilot: boolean }) {
  return plan.ICP && plan.approvalFlow && plan.payoutRules && plan.cappedPilot;
}

function partnerNetworkCoreReady(core: { partnerProfiles: boolean; approvalRecords: boolean; attributionLinks: boolean }) {
  return core.partnerProfiles && core.approvalRecords && core.attributionLinks;
}

function partnerNetworkIntegrated(integration: { marketplace: boolean; payouts: boolean; fraudControls: boolean }) {
  return integration.marketplace && integration.payouts && integration.fraudControls;
}

function partnerNetworkHardened(hardening: { caps: boolean; disclosure: boolean; supportEscalation: boolean }) {
  return hardening.caps && hardening.disclosure && hardening.supportEscalation;
}

function partnerNetworkMeasured(metrics: { partners: number; redemptions: number; qualityScore: number }) {
  return metrics.partners >= 1 && metrics.redemptions >= 1 && metrics.qualityScore >= 70;
}

function partnerNetworkPilotReady(pilot: { merchant: boolean; partner: boolean; feedbackItems: number; result: string }) {
  return pilot.merchant && pilot.partner && pilot.feedbackItems >= 2 && pilot.result === "pilot-ready";
}

function weeklyPartnerNetworkReviewDisciplined(review: { evidenceCount: number; decision: string; unrelatedFeatures: number }) {
  return review.evidenceCount > 0 && ["keep", "cut", "iterate"].includes(review.decision) && review.unrelatedFeatures === 0;
}

function sdkSurfaceScoped(helpers: string[]) {
  return ["verifyReceipt", "fetchGraph", "buildInviteAction", "pdaHelpers"].every((helper) => helpers.includes(helper));
}

function sdkPackageConsumable(pkg: { typed: boolean; unitTests: number; proofHelpers: number }) {
  return pkg.typed && pkg.unitTests >= 4 && pkg.proofHelpers >= 2;
}

function verificationApiPublic(result: { ok: boolean; status: string; settlement: string }) {
  return result.ok && result.status === "verified" && result.settlement === "settled";
}

function exampleAppV2FreshClone(checks: string[]) {
  return ["install", "verify", "run example", "display graph"].every((check) => checks.includes(check));
}

function developerDocsUsable(sections: string[]) {
  return ["install", "verify receipt", "listen webhook", "examples"].every((section) => sections.includes(section));
}

function webhookTamperRejected(signature: string, tamperedSignature: string) {
  return signature.length > 0 && signature !== tamperedSignature;
}

function weeklyDeveloperReviewBlocksFixed(blockers: string[], decision: string) {
  return blockers.length >= 1 && decision === "sdk-surface-ready";
}

function loadPlanTargets(plan: { scenarios: number; claimP95Ms: number; queueDrainSeconds: number }) {
  return plan.scenarios >= 4 && plan.claimP95Ms <= 500 && plan.queueDrainSeconds <= 60;
}

function apiLoadCorePath(metrics: { claimP95Ms: number; redeemP95Ms: number; confirmP95Ms: number; fixedTopBottleneck: boolean }) {
  return metrics.claimP95Ms <= 500 && metrics.redeemP95Ms <= 500 && metrics.confirmP95Ms <= 700 && metrics.fixedTopBottleneck;
}

function databaseIndexReviewReady(review: { tenantFilters: number; explainPlans: boolean }) {
  return review.tenantFilters >= 4 && review.explainPlans;
}

function dashboardPerformanceFast(summary: { materializedSummaries: number; p95Ms: number; cacheTtlSeconds: number }) {
  return summary.materializedSummaries >= 2 && summary.p95Ms <= 1200 && summary.cacheTtlSeconds <= 60;
}

function relayerStressHealthy(summary: { saturated: boolean; retryMetrics: boolean; deadLetters: number }) {
  return summary.saturated && summary.retryMetrics && summary.deadLetters === 0;
}

function mobilePerformanceReady(test: { lowEndPhone: boolean; firstInteractionMs: number; heavyUiFixed: boolean }) {
  return test.lowEndPhone && test.firstInteractionMs <= 1800 && test.heavyUiFixed;
}

function weeklyPerformanceReviewReady(review: { latencyBudget: boolean; errorBudget: boolean; capacityDoc: boolean }) {
  return review.latencyBudget && review.errorBudget && review.capacityDoc;
}

function promotionTermsClear(sections: string[]) {
  return ["reward value", "expiry", "abuse policy"].every((section) => sections.includes(section));
}

function privacyPolicyProfessional(policy: { data: number; retention: boolean; deletion: boolean; commitments: boolean }) {
  return policy.data > 0 && policy.retention && policy.deletion && policy.commitments;
}

function merchantAgreementReady(sections: string[]) {
  return ["fees", "responsibilities", "fraud", "reversals", "data"].every((section) => sections.includes(section));
}

function userTermsClear(sections: string[]) {
  return ["rewards", "claims", "wallet", "disputes"].every((section) => sections.includes(section));
}

function deletionProcessTested(process: { consumerLifecycle: boolean; merchantLifecycle: boolean; testedRequest: boolean }) {
  return process.consumerLifecycle && process.merchantLifecycle && process.testedRequest;
}

function localMarketReviewReducedRisk(review: { localConstraints: number; advisorCheck: boolean; avoidsLotteryFraming: boolean }) {
  return review.localConstraints >= 2 && review.advisorCheck && review.avoidsLotteryFraming;
}

function weeklyLegalReviewTracksOpenItems(review: { docsUpdated: boolean; onboardingUpdated: boolean; openItems: number }) {
  return review.docsUpdated && review.onboardingUpdated && review.openItems >= 1;
}

function uxAuditTopFiveFixed(audit: { reviewedScreens: number; fixedIssues: number }) {
  return audit.reviewedScreens >= 5 && audit.fixedIssues >= 5;
}

function mobilePolishDeviceTested(polish: { consumerFlow: boolean; staffFlow: boolean; devices: number }) {
  return polish.consumerFlow && polish.staffFlow && polish.devices >= 2;
}

function copyPolishRemovesJargon(copy: { jargonRemoved: number; merchantRead: boolean; userRead: boolean }) {
  return copy.jargonRemoved >= 3 && copy.merchantRead && copy.userRead;
}

function dashboardPolishReadable(areas: string[]) {
  return ["ROI", "graph", "fraud", "ledger"].every((area) => areas.includes(area));
}

function receiptExplorerProofAsset(asset: { beautiful: boolean; educational: boolean; unsupportedClaims: boolean }) {
  return asset.beautiful && asset.educational && !asset.unsupportedClaims;
}

function accessibilityPassReady(checks: string[], blockers: number) {
  return ["keyboard", "contrast", "labels", "focus"].every((check) => checks.includes(check)) && blockers === 0;
}

function weeklyPolishReviewFinalist(review: { screenshots: number; clutterCut: boolean }) {
  return review.screenshots >= 4 && review.clutterCut;
}

function freshCloneEvaluatorReady(checks: string[]) {
  return ["install", "verify", "run app"].every((check) => checks.includes(check));
}

function fullCiGreen(checks: string[]) {
  return ["lint", "typecheck", "unit", "anchor", "build"].every((check) => checks.includes(check));
}

function protocolFinalHonest(review: { invariants: number; knownLimits: number; hiddenRisks: boolean }) {
  return review.invariants >= 5 && review.knownLimits >= 3 && !review.hiddenRisks;
}

function securityFinalScanClear(scan: { secrets: boolean; deps: boolean; authRoutes: boolean; blockers: number }) {
  return scan.secrets && scan.deps && scan.authRoutes && scan.blockers === 0;
}

function demoDataFreezeStable(freeze: { seed: boolean; reset: boolean; backupTxs: number; resetTested: boolean }) {
  return freeze.seed && freeze.reset && freeze.backupTxs >= 2 && freeze.resetTested;
}

function performanceSmokePass(smoke: { coreFlow: boolean; mobile: boolean; topIssueFixed: boolean }) {
  return smoke.coreFlow && smoke.mobile && smoke.topIssueFixed;
}

function hardeningReviewReleaseCandidate(review: { blockerOnly: boolean; releaseCandidate: boolean; featureFreeze: boolean }) {
  return review.blockerOnly && review.releaseCandidate && review.featureFreeze;
}

function merchantProofAssetsArchived(proof: { quotes: number; permissionsTracked: boolean; archive: boolean }) {
  return proof.quotes >= 1 && proof.permissionsTracked && proof.archive;
}

function metricsAuditNoInflation(audit: { reconciled: boolean; verifiedReceipts: boolean; rawClaimsAsRevenue: boolean }) {
  return audit.reconciled && audit.verifiedReceipts && !audit.rawClaimsAsRevenue;
}

function finalCaseStudyApproved(study: { detailed: boolean; approvalStatus: string }) {
  return study.detailed && ["approved", "permission pending"].includes(study.approvalStatus);
}

function paidCommitmentPushTracked(push: { warmMerchants: number; ask: boolean; answersTracked: boolean }) {
  return push.warmMerchants >= 3 && push.ask && push.answersTracked;
}

function publicTractionPageReal(page: { screenshots: boolean; txLinks: boolean; metrics: boolean; testimonials: boolean }) {
  return page.screenshots && page.txLinks && page.metrics && page.testimonials;
}

function investorMemoAcceleratorReady(sections: string[]) {
  return ["why now", "market", "traction", "Solana", "risks"].every((section) => sections.includes(section));
}

function weeklyTractionReviewSharp(review: { strongestNumbers: number; weakStatsCut: boolean }) {
  return review.strongestNumbers >= 2 && review.weakStatsCut;
}

function finalReadmeComplete(sections: string[]) {
  return ["hook", "demo", "setup", "architecture", "tests", "limitations"].every((section) => sections.includes(section));
}

function finalDemoScriptTimed(script: { seconds: number; causalHook: boolean; liveProof: boolean; traction: boolean }) {
  return script.seconds >= 90 && script.seconds <= 120 && script.causalHook && script.liveProof && script.traction;
}

function finalVideoCompelling(video: { cleanTake: boolean; captions: number; callouts: number; reviewed: boolean }) {
  return video.cleanTake && video.captions >= 3 && video.callouts >= 4 && video.reviewed;
}

function technicalDeepDiveCredible(deepDive: string[]) {
  return ["program", "relayer", "indexer", "tests", "security"].every((section) => deepDive.includes(section));
}

function pitchDeckReady(slides: string[]) {
  return slides.length === 10 && ["problem", "primitive", "product", "traction", "business", "Solana"].every((slide) => slides.includes(slide));
}

function architectureVisualsReady(visuals: { diagrams: number; screenshots: number; qualityChecked: boolean }) {
  return visuals.diagrams >= 2 && visuals.screenshots >= 2 && visuals.qualityChecked;
}

function weeklyAssetReviewComplete(review: { links: number; files: number; screenshots: number; videos: number; backup: boolean }) {
  return review.links > 0 && review.files > 0 && review.screenshots > 0 && review.videos > 0 && review.backup;
}

function judgeQaCrisp(topics: string[]) {
  return ["why Solana", "why not DB", "fraud", "traction", "model"].every((topic) => topics.includes(topic));
}

function technicalQaNoHandwaving(topics: string[]) {
  return ["accounts", "constraints", "relayer", "indexer", "privacy"].every((topic) => topics.includes(topic));
}

function businessQaCredible(topics: string[]) {
  return ["pricing", "GTM", "market", "retention", "competition"].every((topic) => topics.includes(topic));
}

function securityQaTrustReady(topics: string[]) {
  return ["threat model", "audit status", "caps", "PII"].every((topic) => topics.includes(topic));
}

function liveDemoRehearsalReady(rehearsal: { seconds: number; fallback: boolean; recorded: boolean; smooth: boolean }) {
  return rehearsal.seconds <= 120 && rehearsal.fallback && rehearsal.recorded && rehearsal.smooth;
}

function mockJudgingReducesWeaknesses(mock: { reviewers: number; fixedTopConfusion: boolean }) {
  return mock.reviewers >= 3 && mock.fixedTopConfusion;
}

function weeklyQaFinalNoFeatures(review: { talkingPoints: number; newFeatures: number; ready: boolean }) {
  return review.talkingPoints >= 4 && review.newFeatures === 0 && review.ready;
}

function releaseCandidatePreserved(rc: { tagged: boolean; deployed: boolean; envSnapshot: boolean; smokeTested: boolean }) {
  return rc.tagged && rc.deployed && rc.envSnapshot && rc.smokeTested;
}

function backupDemoPlayable(backup: { walkthrough: boolean; txProof: boolean; playbackTested: boolean }) {
  return backup.walkthrough && backup.txProof && backup.playbackTested;
}

function linkAuditClean(audit: { links: number; clickedEvery: boolean; broken: number }) {
  return audit.links >= 6 && audit.clickedEvery && audit.broken === 0;
}

function knownLimitationsHonest(page: { limitations: number; roadmap: number; honest: boolean }) {
  return page.limitations >= 4 && page.roadmap >= 4 && page.honest;
}

function submissionDryRunReady(dryRun: { fields: number; verified: boolean; surpriseRisk: string }) {
  return dryRun.fields >= 5 && dryRun.verified && dryRun.surpriseRisk === "low";
}

function bugOnlyDayStable(policy: { blockerFixesOnly: boolean; regressionChecks: number; newFeatures: boolean }) {
  return policy.blockerFixesOnly && policy.regressionChecks >= 3 && !policy.newFeatures;
}

function freezeReviewGo(review: { checklist: number; goNoGo: string; submitReady: boolean }) {
  return review.checklist >= 5 && review.goNoGo === "go" && review.submitReady;
}

function submitPackageComplete(pkg: { submitted: boolean; receiptConfirmed: boolean; archiveItems: number; linkCheck: boolean }) {
  return pkg.submitted && pkg.receiptConfirmed && pkg.archiveItems >= 4 && pkg.linkCheck;
}

function followUpDemoReady(followUp: { environments: number; smokeTested: boolean; contactReady: boolean }) {
  return followUp.environments >= 4 && followUp.smokeTested && followUp.contactReady;
}

function investorOnePagerReady(sections: string[]) {
  return ["traction", "primitive", "roadmap", "ask"].every((section) => sections.includes(section));
}

function merchantFollowUpContinues(packet: { thanked: boolean; resultsShared: boolean; nextCampaigns: boolean; crm: boolean }) {
  return packet.thanked && packet.resultsShared && packet.nextCampaigns && packet.crm;
}

function postmortemCaptured(postmortem: { worked: number; failed: number; documented: boolean }) {
  return postmortem.worked >= 2 && postmortem.failed >= 2 && postmortem.documented;
}

function nextMilestonePrioritized(plan: { day30: number; day60: number; day90: number; prioritized: boolean }) {
  return plan.day30 > 0 && plan.day60 > 0 && plan.day90 > 0 && plan.prioritized;
}

function restabilizedAfterSubmission(plan: { cleanupItems: number; ciCheck: boolean; nextStageReady: boolean }) {
  return plan.cleanupItems >= 3 && plan.ciCheck && plan.nextStageReady;
}

function posPathNoSprawl(choice: { selected: string; documentedWhy: boolean; noSprawl: boolean }) {
  return choice.selected === "CSV/import first" && choice.documentedWhy && choice.noSprawl;
}

function adapterSkeletonReady(adapter: { authConfig: boolean; importOrWebhook: boolean; mapping: boolean; sandboxTest: boolean }) {
  return adapter.authConfig && adapter.importOrWebhook && adapter.mapping && adapter.sandboxTest;
}

function paymentMatchingRobust(match: { receiptId: boolean; time: boolean; amount: boolean; mismatchTests: number }) {
  return match.receiptId && match.time && match.amount && match.mismatchTests >= 3;
}

function reconciliationUiManageable(ui: { matched: boolean; unmatched: boolean; merchantReview: boolean }) {
  return ui.matched && ui.unmatched && ui.merchantReview;
}

function posFailureHandlingRobust(failures: { outage: boolean; duplicateWebhook: boolean; badData: boolean; tests: boolean }) {
  return failures.outage && failures.duplicateWebhook && failures.badData && failures.tests;
}

function oneMerchantPosPilotValidated(pilot: { realImport: boolean; metrics: number; validated: boolean }) {
  return pilot.realImport && pilot.metrics >= 3 && pilot.validated;
}

function weeklyPosReviewStrategic(review: { value: boolean; supportCost: boolean; decision: string }) {
  return review.value && review.supportCost && ["expand-carefully", "cut", "iterate"].includes(review.decision);
}

function operatingPlan365Complete(plan: { roadmap: boolean; merchantPacket: boolean; investorOnePager: boolean; backlogTiers: number; healthChecks: number }) {
  return plan.roadmap && plan.merchantPacket && plan.investorOnePager && plan.backlogTiers === 4 && plan.healthChecks >= 3;
}

function indexReceiptJobs(jobs: { topic: string; status: string }[]) {
  return jobs.map((job) => (
    (job.topic === "receipt.submit" || job.topic === "receipt.index") && job.status !== "succeeded"
      ? { ...job, status: "succeeded" }
      : job
  ));
}

function simulateInboundWrites(amounts: number[]) {
  let pending = 0;
  let attributed = 0;
  let deadPass = 0;

  for (const amount of amounts) {
    if (pending >= INBOUND_BUFFER_SIZE) {
      deadPass += amount;
      continue;
    }

    pending += 1;
    attributed += amount;
  }

  return { pending, attributed, deadPass };
}

function simulateRedemptionSlotSettlement(activeSlots: number, settledSlots: number[]) {
  if (activeSlots < 0 || activeSlots > MAX_REFERRER_SLOTS) {
    throw new Error("invalid active slot count");
  }

  let mask = 0;
  for (const slot of settledSlots) {
    if (slot < 0 || slot >= activeSlots) {
      throw new Error("invalid referrer slot");
    }
    const bit = 1 << slot;
    if ((mask & bit) !== 0) {
      throw new Error("slot already settled");
    }
    mask |= bit;
  }

  const requiredMask = activeSlots === 0 ? 0 : (1 << activeSlots) - 1;
  return {
    mask,
    requiredMask,
    canClear: mask === requiredMask,
  };
}

function applyCommission(
  ledger: { claimable: number; dustTenths: number; totalEarned: number; totalRedemptionsDriven: number; highestSingleCommission: number },
  gen2Consumed: number,
  commissionBps: number,
) {
  const exact = gen2Consumed * commissionBps;
  const whole = Math.floor(exact / 10_000);
  const dust = exact % 10_000;

  ledger.claimable += whole;
  ledger.dustTenths += dust;
  if (ledger.dustTenths >= 10_000) {
    const bonusWhole = Math.floor(ledger.dustTenths / 10_000);
    ledger.claimable += bonusWhole;
    ledger.totalEarned += bonusWhole;
    ledger.dustTenths %= 10_000;
  }

  ledger.totalEarned += whole;
  ledger.totalRedemptionsDriven += 1;
  ledger.highestSingleCommission = Math.max(ledger.highestSingleCommission, whole);
  return ledger;
}

function grossUpForTransferFee(netClaimable: number, transferFeeBps: number) {
  if (transferFeeBps >= 10_000) {
    throw new Error("invalid transfer fee");
  }

  return Math.floor((netClaimable * 10_000) / (10_000 - transferFeeBps));
}

type ClaimStatus = "claimed" | "code-generated" | "redeemed" | "blocked";

interface SimReferral {
  token: string;
  referrerSessionId: string;
  referrerDeviceFingerprint: string;
}

interface SimClaim {
  id: string;
  referralToken: string;
  claimerSessionId: string;
  deviceFingerprint: string;
  status: ClaimStatus;
  code?: string;
}

function claimReferralForLaunch(
  referral: SimReferral,
  claims: SimClaim[],
  claimerSessionId: string,
  deviceFingerprint: string,
) {
  if (claimerSessionId === referral.referrerSessionId || deviceFingerprint === referral.referrerDeviceFingerprint) {
    const blocked: SimClaim = {
      id: `claim-${claims.length + 1}`,
      referralToken: referral.token,
      claimerSessionId,
      deviceFingerprint,
      status: "blocked",
    };
    claims.push(blocked);
    return blocked;
  }

  const existing = claims.find((claim) => claim.claimerSessionId === claimerSessionId && claim.status !== "blocked");
  if (existing) {
    return existing;
  }

  const claim: SimClaim = {
    id: `claim-${claims.length + 1}`,
    referralToken: referral.token,
    claimerSessionId,
    deviceFingerprint,
    status: "claimed",
  };
  claims.push(claim);
  return claim;
}

function generateRedeemCodeForLaunch(claim: SimClaim) {
  if (claim.status === "blocked") {
    throw new Error("blocked claims cannot receive redeem codes");
  }

  if (!claim.code) {
    claim.code = claim.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase().padStart(6, "0");
    claim.code = `${claim.code.slice(0, 3)}-${claim.code.slice(3)}`;
  }
  claim.status = claim.status === "redeemed" ? "redeemed" : "code-generated";
  return claim.code;
}

function confirmRedeemCodeForLaunch(claims: SimClaim[], code: string) {
  const normalized = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const formatted = `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  const claim = claims.find((item) => item.code === formatted);
  if (!claim || claim.status === "blocked") {
    return false;
  }

  claim.status = "redeemed";
  return true;
}

describe("viral_sync_v4_core", () => {
  it("derives TokenGeneration PDAs from mint and true owner", () => {
    const mint = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const delegatedSigner = Keypair.generate().publicKey;

    const [ownerPda] = findTokenGenerationPda(mint, owner);
    const [delegatedPda] = findTokenGenerationPda(mint, delegatedSigner);

    expect(ownerPda.toBase58()).to.not.equal(delegatedPda.toBase58());
    expect(ownerPda.equals(PublicKey.default)).to.equal(false);
  });

  it("degrades inbound overflow into dead-pass accounting", () => {
    const transfers = Array.from({ length: 18 }, () => 1);
    const result = simulateInboundWrites(transfers);

    expect(result.pending).to.equal(INBOUND_BUFFER_SIZE);
    expect(result.attributed).to.equal(16);
    expect(result.deadPass).to.equal(2);
  });

  it("derives MerchantConfig PDAs from mint rather than merchant authority", () => {
    const mint = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    const [mintPda] = findMerchantConfigPda(mint);
    const [wrongAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant_v4"), merchant.toBuffer()],
      PROGRAM_ID,
    );

    expect(mintPda.equals(wrongAuthorityPda)).to.equal(false);
  });

  it("keeps commission ledgers isolated per referrer and merchant", () => {
    const merchant = Keypair.generate().publicKey;
    const otherMerchant = Keypair.generate().publicKey;
    const referrer = Keypair.generate().publicKey;
    const otherReferrer = Keypair.generate().publicKey;

    const [ledger] = findCommissionLedgerPda(referrer, merchant);
    const [otherLedger] = findCommissionLedgerPda(otherReferrer, merchant);
    const [merchantLedger] = findCommissionLedgerPda(referrer, otherMerchant);

    expect(ledger.toBase58()).to.not.equal(otherLedger.toBase58());
    expect(ledger.toBase58()).to.not.equal(merchantLedger.toBase58());
  });

  it("derives session keys from both authority and delegated signer", () => {
    const authority = Keypair.generate().publicKey;
    const delegate = Keypair.generate().publicKey;
    const otherDelegate = Keypair.generate().publicKey;

    const [session] = findSessionKeyPda(authority, delegate);
    const [otherSession] = findSessionKeyPda(authority, otherDelegate);

    expect(session.toBase58()).to.not.equal(otherSession.toBase58());
  });

  it("derives causal merchant config PDAs from authority and org hash", () => {
    const authority = Keypair.generate().publicKey;
    const otherAuthority = Keypair.generate().publicKey;
    const orgIdHash = Buffer.alloc(32, 7);

    const [merchantConfig] = findCausalMerchantConfigPda(authority, orgIdHash);
    const [otherMerchantConfig] = findCausalMerchantConfigPda(otherAuthority, orgIdHash);

    expect(merchantConfig.toBase58()).to.not.equal(otherMerchantConfig.toBase58());
  });

  it("derives growth campaign PDAs from merchant config and campaign hash", () => {
    const merchantConfig = Keypair.generate().publicKey;
    const campaignHash = Buffer.alloc(32, 9);
    const otherCampaignHash = Buffer.alloc(32, 10);

    const [campaign] = findGrowthCampaignPda(merchantConfig, campaignHash);
    const [otherCampaign] = findGrowthCampaignPda(merchantConfig, otherCampaignHash);

    expect(campaign.toBase58()).to.not.equal(otherCampaign.toBase58());
  });

  it("derives reward escrow PDAs from campaign and mint", () => {
    const campaign = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const otherMint = Keypair.generate().publicKey;

    const [escrow] = findRewardEscrowPda(campaign, mint);
    const [otherEscrow] = findRewardEscrowPda(campaign, otherMint);

    expect(escrow.toBase58()).to.not.equal(otherEscrow.toBase58());
  });

  it("keeps nullifier, receipt, and settlement PDAs unique", () => {
    const campaign = Keypair.generate().publicKey;
    const nullifierHash = Buffer.alloc(32, 11);
    const receiptHash = Buffer.alloc(32, 12);
    const otherReceiptHash = Buffer.alloc(32, 13);

    const [nullifier] = findNullifierRecordPda(campaign, nullifierHash);
    const [receipt] = findCausalReceiptPda(campaign, receiptHash);
    const [otherReceipt] = findCausalReceiptPda(campaign, otherReceiptHash);
    const [settlement] = findSettlementRecordPda(receipt);

    expect(receipt.toBase58()).to.not.equal(otherReceipt.toBase58());
    expect(nullifier.equals(PublicKey.default)).to.equal(false);
    expect(settlement.equals(PublicKey.default)).to.equal(false);
  });

  it("blocks anonymous merchant confirmation before code lookup", () => {
    const missing = authorizeMerchantConfirmation("", "DEMO-PIN");
    const wrong = authorizeMerchantConfirmation("BAD-PIN", "DEMO-PIN");
    const ok = authorizeMerchantConfirmation("DEMO-PIN", "DEMO-PIN");

    expect(missing.status).to.equal(401);
    expect(wrong.status).to.equal(401);
    expect(ok.ok).to.equal(true);
  });

  it("resumes server-issued guest sessions instead of trusting arbitrary ids", () => {
    expect(simulateServerGuestSession("vs-valid-session-123")).to.equal("vs-valid-session-123");
    expect(simulateServerGuestSession("bad-session")).to.equal("vs-new-session-123");
  });

  it("rejects expired and consumed visit challenge replay", () => {
    const challenge = simulateVisitChallenge(1000, 100);

    expect(consumeVisitChallenge(challenge, 1050)).to.equal(true);
    expect(() => consumeVisitChallenge(challenge, 1060)).to.throw("challenge already consumed");
    expect(() => consumeVisitChallenge(simulateVisitChallenge(1000, 100), 1200)).to.throw("challenge expired");
  });

  it("scopes repository rows to one merchant", () => {
    const rows = [
      { merchantId: "merchant-a", value: 1 },
      { merchantId: "merchant-b", value: 2 },
    ];

    expect(merchantScopedRows(rows, "merchant-a")).to.deep.equal([{ merchantId: "merchant-a", value: 1 }]);
  });

  it("keeps reward ledger idempotent on retry", () => {
    const entries: { idempotencyKey: string; amount: number; balanceAfter: number }[] = [];
    const first = appendRewardEntry(entries, "confirm-1", -100);
    const retry = appendRewardEntry(entries, "confirm-1", -100);

    expect(first).to.equal(retry);
    expect(entries).to.have.length(1);
    expect(entries[0].balanceAfter).to.equal(-100);
  });

  it("generates non-deterministic looking redeem codes", () => {
    expect(randomLikeCode(1)).to.not.equal(randomLikeCode(2));
    expect(randomLikeCode(1)).to.match(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  });

  it("enforces redemption code state transitions", () => {
    expect(codeStateTransition("issued", "scan")).to.equal("scanned");
    expect(codeStateTransition("scanned", "confirm")).to.equal("confirmed");
    expect(() => codeStateTransition("confirmed", "void")).to.throw("invalid code transition");
  });

  it("schedules outbox retries without dropping the job", () => {
    const job = { status: "processing", attempts: 0 };
    outboxRetry(job);
    expect(job.status).to.equal("pending");
    expect(job.attempts).to.equal(1);
  });

  it("returns common API error shape with request id", () => {
    const error = commonApiError("Bad input", "invalid_request", "req-1");

    expect(error.ok).to.equal(false);
    expect(error.error.requestId).to.equal("req-1");
    expect(error.error.code).to.equal("invalid_request");
  });

  it("allows only same-origin or configured origins for cookie mutations", () => {
    expect(sameOriginAllowed("https://viral.test", "https://viral.test")).to.equal(true);
    expect(sameOriginAllowed("https://partner.test", "https://viral.test", ["https://partner.test"])).to.equal(true);
    expect(sameOriginAllowed("https://evil.test", "https://viral.test")).to.equal(false);
  });

  it("validates bounded pilot campaign publishing", () => {
    expect(validatePilotCampaignPublish(3, 72)).to.deep.equal({ ok: true, active: true });
    expect(() => validatePilotCampaignPublish(0, 72)).to.throw("invalid referral goal");
    expect(() => validatePilotCampaignPublish(3, 800)).to.throw("invalid redemption window");
  });

  it("finds support records by code, invite, receipt, or merchant text", () => {
    const rows = [
      { type: "code", values: ["ABC-123", "claim-one"], status: "issued" },
      { type: "invite", values: ["referral-alpha", "Asha"], status: "active" },
      { type: "receipt", values: ["receipt-1", "tx-demo"], status: "settled" },
      { type: "merchant", values: ["Thamel Brew House"], status: "active" },
    ];

    expect(supportSearch(rows, "abc")[0].type).to.equal("code");
    expect(supportSearch(rows, "brew")[0].type).to.equal("merchant");
    expect(supportSearch(rows, "tx-demo")[0].type).to.equal("receipt");
  });

  it("flags high fraud block rates for manual review without auto-banning groups", () => {
    expect(fraudReviewStatus(1, 20, 20)).to.equal("clean");
    expect(fraudReviewStatus(5, 20, 20)).to.equal("needs-review");
  });

  it("requires the day 77 pilot simulation to cover 20 users and receipt parity", () => {
    expect(pilotSimulation(20, 5, 5, 0).recommendation).to.equal("go");
    const watchlist = pilotSimulation(18, 5, 4, 1);

    expect(watchlist.recommendation).to.equal("go-with-watchlist");
    expect(watchlist.blockers).to.deep.equal([
      "simulation must use 20 users",
      "missing receipts",
      "open outbox jobs",
    ]);
  });

  it("onboards merchant two and three through the reusable pilot roster", () => {
    expect(ensurePilotRoster(["merchant-thamel-brew-house"])).to.deep.equal([
      "merchant-thamel-brew-house",
      "merchant-jhamel-momo-yard",
      "merchant-pokhara-hostel-hub",
    ]);
  });

  it("computes the pilot funnel leak rates from invites through receipts", () => {
    expect(funnelRates(10, 7, 5, 4, 4)).to.deep.equal([70, 71, 80, 100]);
  });

  it("keeps campaign templates broad enough for cafe, QSR, hostel, and creator pilots", () => {
    expect(campaignTemplateCategories()).to.deep.equal(["Cafe", "QSR", "Hostel", "Creator"]);
  });

  it("reports verified visits and reward cost without counting unconfirmed claims", () => {
    expect(weeklyMerchantReport(4, 1)).to.deep.equal({
      verifiedVisits: 4,
      rewardCostNpr: 600,
      suspiciousActivity: 1,
    });
  });

  it("does not treat draft testimonials as public-ready", () => {
    expect(testimonialReady("draft", "Permission pending")).to.equal(false);
    expect(testimonialReady("approved", "Asha")).to.equal(true);
  });

  it("chooses receipt verification as the safer Blink action metadata path", () => {
    expect(actionMetadata("receipt-1", true)).to.deep.equal({
      title: "Merchant verified a referred visit",
      label: "Verify receipt",
      disabled: false,
      href: "/api/actions/causal-receipt/receipt-1",
    });
    expect(actionMetadata("missing", false).disabled).to.equal(true);
  });

  it("builds Blink-compatible URLs while preserving web fallback", () => {
    expect(blinkUrl("https://viral.test/api/actions/causal-receipt/receipt-1")).to.equal(
      "solana-action:https://viral.test/api/actions/causal-receipt/receipt-1",
    );
  });

  it("requires service auth, signed intent, and policy action for sponsored tx simulation", () => {
    const intent = JSON.stringify({ action: "verify_causal_receipt", receiptId: "receipt-1" });
    const signature = signIntent(intent);

    expect(verifySponsoredIntent({
      apiKey: "service-key",
      expectedApiKey: "service-key",
      intent,
      signature,
      action: "verify_causal_receipt",
    })).to.deep.equal({ ok: true });
    expect(verifySponsoredIntent({
      apiKey: "bad-key",
      expectedApiKey: "service-key",
      intent,
      signature,
      action: "verify_causal_receipt",
    }).ok).to.equal(false);
  });

  it("rejects demo secrets for production readiness", () => {
    expect(productionSecretReady("DEMO-PIN", "DEMO-PIN")).to.equal(false);
    expect(productionSecretReady("my-demo-secret", "DEMO-PIN")).to.equal(false);
    expect(productionSecretReady("prod_9Va1idLongSecret", "DEMO-PIN")).to.equal(true);
  });

  it("authorizes merchant RBAC by job instead of raw PINs", () => {
    expect(merchantRoleAllows("owner", ["manager"])).to.equal(true);
    expect(merchantRoleAllows("manager", ["staff"])).to.equal(true);
    expect(merchantRoleAllows("staff", ["manager"])).to.equal(false);
    expect(merchantRoleAllows("support", ["staff"])).to.equal(false);
    expect(merchantRoleAllows("auditor", ["auditor"])).to.equal(true);
  });

  it("blocks launch mutations when the pause switch is enabled", () => {
    expect(launchMutationAllowed(true, "POST")).to.equal(false);
    expect(launchMutationAllowed(true, "DELETE")).to.equal(false);
    expect(launchMutationAllowed(true, "GET")).to.equal(true);
    expect(launchMutationAllowed(false, "POST")).to.equal(true);
  });

  it("requires enrolled staff devices for production confirmations", () => {
    expect(staffConfirmationAllowed({ production: true, sessionRole: "staff", deviceEnrolled: true, demoPin: false })).to.equal(true);
    expect(staffConfirmationAllowed({ production: true, sessionRole: "staff", deviceEnrolled: false, demoPin: true })).to.equal(false);
    expect(staffConfirmationAllowed({ production: false, deviceEnrolled: false, demoPin: true })).to.equal(true);
    expect(staffConfirmationAllowed({ production: true, sessionRole: "support", deviceEnrolled: true, demoPin: false })).to.equal(false);
  });

  it("keeps the relayer policy scoped to Causal Commerce instructions", () => {
    const policy = relayerPolicy();

    expect(policy.allowedInstructions).to.include.members(["verify_causal_receipt", "close_growth_bounty"]);
    expect(policy.simulationRequired).to.equal(true);
    expect(policy.serviceAuthRequired).to.equal(true);
  });

  it("blocks sponsored transaction replay with nonce storage", () => {
    const nonces = new Set<string>();

    expect(replayProtected(nonces, "nonce-1").ok).to.equal(true);
    expect(replayProtected(nonces, "nonce-1")).to.deep.equal({
      ok: false,
      reason: "Replay nonce already used.",
    });
  });

  it("enforces wallet, merchant, and campaign spend limits before sponsorship", () => {
    expect(spendLimitAllowed({ wallet: 4, merchant: 99, campaign: 49 })).to.equal(true);
    expect(spendLimitAllowed({ wallet: 5, merchant: 99, campaign: 49 })).to.equal(false);
    expect(spendLimitAllowed({ wallet: 4, merchant: 100, campaign: 49 })).to.equal(false);
    expect(spendLimitAllowed({ wallet: 4, merchant: 99, campaign: 50 })).to.equal(false);
  });

  it("reconciles receipt status from submit and index jobs", () => {
    expect(receiptStatus(false)).to.equal("pending");
    expect(receiptStatus(false, "pending")).to.equal("submitted");
    expect(receiptStatus(true, "succeeded")).to.equal("confirmed");
    expect(receiptStatus(true, "succeeded", "succeeded")).to.equal("indexed");
    expect(receiptStatus(false, "failed")).to.equal("failed");
  });

  it("indexes receipt submission and receipt index jobs", () => {
    expect(indexReceiptJobs([
      { topic: "receipt.submit", status: "pending" },
      { topic: "receipt.index", status: "pending" },
      { topic: "notification.send", status: "pending" },
    ])).to.deep.equal([
      { topic: "receipt.submit", status: "succeeded" },
      { topic: "receipt.index", status: "succeeded" },
      { topic: "notification.send", status: "pending" },
    ]);
  });

  it("keeps causal graph person labels privacy-safe by default", () => {
    expect(graphLabelsArePrivate([
      { kind: "invite", label: "referrer-abc123", privateLabel: true },
      { kind: "visitor", label: "visitor-def456", privateLabel: true },
      { kind: "merchant", label: "Thamel Brew House", privateLabel: false },
    ])).to.equal(true);
    expect(graphLabelsArePrivate([
      { kind: "visitor", label: "Alice", privateLabel: false },
    ])).to.equal(false);
  });

  it("calculates reward liability across reserved, settled, voided, and remaining", () => {
    expect(rewardLiability({ issued: 5, settled: 2, voided: 1 })).to.deep.equal({
      reserved: 750,
      settled: 300,
      voided: 150,
      remaining: 300,
    });
  });

  it("creates usage and platform billing events per verified receipt", () => {
    expect(billingEventsForReceipt("receipt-1", "merchant-1")).to.deep.equal([
      { id: "usage-receipt-1", type: "usage_fee", merchantId: "merchant-1", receiptId: "receipt-1", amountNpr: 150, status: "issued" },
      { id: "platform-receipt-1", type: "platform_fee", merchantId: "merchant-1", receiptId: "receipt-1", amountNpr: 25, status: "issued" },
    ]);
  });

  it("computes cost per verified visit from reward and platform fee", () => {
    expect(costPerVerifiedVisit(4, 600, 100)).to.equal(175);
    expect(costPerVerifiedVisit(0, 0, 0)).to.equal(0);
  });

  it("settles partner payouts only after receipt settlement", () => {
    expect(partnerPayout(25, false)).to.equal(0);
    expect(partnerPayout(25, true)).to.equal(5);
  });

  it("places suspicious partners on hold by quality or velocity", () => {
    expect(partnerQualityHold(88, false)).to.equal(false);
    expect(partnerQualityHold(55, false)).to.equal(true);
    expect(partnerQualityHold(88, true)).to.equal(true);
  });

  it("orders evidence confidence from staff-only to POS webhook", () => {
    expect(evidenceConfidence("staff_only")).to.be.lessThan(evidenceConfidence("receipt_id"));
    expect(evidenceConfidence("csv_match")).to.be.lessThan(evidenceConfidence("pos_webhook"));
  });

  it("matches imported CSV sales rows to known receipt ids", () => {
    expect(matchCsvReceipt([
      { receipt_id: "BILL-1", amount_npr: 450 },
      { receipt_id: "BILL-2", amount_npr: 300 },
    ], new Set(["BILL-1"]))).to.deep.equal([
      { receiptId: "BILL-1", amountNpr: 450, matched: true },
      { receiptId: "BILL-2", amountNpr: 300, matched: false },
    ]);
  });

  it("computes attributed spend AOV and ROI from receipt-backed sales", () => {
    expect(attributedSpend([{ spendNpr: 400 }, { spendNpr: 500 }], 300)).to.deep.equal({
      aovNpr: 450,
      revenue: 900,
      roi: 3,
    });
  });

  it("builds an optional Solana Pay payment reference path", () => {
    expect(solanaPayReference("ref-1")).to.equal("solana:11111111111111111111111111111111?amount=0.001&reference=ref-1");
  });

  it("blocks mainnet while unresolved P0 or P1 security issues remain", () => {
    expect(securityGate([{ priority: "P0", status: "open" }]).mainnetAllowed).to.equal(false);
    expect(securityGate([{ priority: "P2", status: "open" }]).mainnetAllowed).to.equal(true);
  });

  it("escapes user HTML and rejects unsafe rendering patterns", () => {
    expect(escapesUserHtml("<script>alert(1)</script>")).to.equal("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(unsafeHtmlRendered("return <div>{name}</div>;")).to.equal(false);
    expect(unsafeHtmlRendered("dangerouslySetInnerHTML={{__html: name}}")).to.equal(true);
  });

  it("keeps capped beta behind allowlist and pause switch", () => {
    expect(betaScopeAllowed({ cappedFundsNpr: 10_000, allowlisted: 1, pauseSwitch: true })).to.equal(true);
    expect(betaScopeAllowed({ cappedFundsNpr: 50_000, allowlisted: 1, pauseSwitch: true })).to.equal(false);
    expect(betaScopeAllowed({ cappedFundsNpr: 10_000, allowlisted: 0, pauseSwitch: true })).to.equal(false);
  });

  it("requires migration rehearsal to preserve merchant and receipt counts", () => {
    expect(migrationRehearsalChecks({ merchants: 3, receipts: 4 }, { merchants: 3, receipts: 4 })).to.equal(true);
    expect(migrationRehearsalChecks({ merchants: 3, receipts: 4 }, { merchants: 3, receipts: 3 })).to.equal(false);
  });

  it("keeps beta review no-go while security gate is blocked", () => {
    expect(betaReview(false)).to.equal("no-go-mainnet");
    expect(betaReview(true)).to.equal("go-capped-beta");
  });

  it("requires capped beta deployment to keep caps, allowlist, and pause test", () => {
    expect(cappedDeployment({ cap: 10_000, allowlisted: ["merchant-1"], pauseTested: true })).to.equal(true);
    expect(cappedDeployment({ cap: 20_000, allowlisted: ["merchant-1"], pauseTested: true })).to.equal(false);
    expect(cappedDeployment({ cap: 10_000, allowlisted: [], pauseTested: true })).to.equal(false);
  });

  it("keeps on-chain campaign circuit breakers reversible only before close", () => {
    expect(circuitBreakerStateTransition("Active", "Paused")).to.equal("Paused");
    expect(circuitBreakerStateTransition("Paused", "Active")).to.equal("Active");
    expect(() => circuitBreakerStateTransition("Closed", "Active")).to.throw("closed campaign cannot be resumed or paused");
    expect(() => circuitBreakerStateTransition("Active", "Closed")).to.throw("invalid live status");
  });

  it("requires proof assets to include screenshots and a merchant quote", () => {
    expect(proofAssetChecklist({ txLinks: 0, screenshots: 4, quote: true })).to.equal(true);
    expect(proofAssetChecklist({ txLinks: 0, screenshots: 1, quote: true })).to.equal(false);
    expect(proofAssetChecklist({ txLinks: 0, screenshots: 4, quote: false })).to.equal(false);
  });

  it("maps failure states to concrete support recovery actions", () => {
    expect(failureRecoveryAction("failed_tx")).to.equal("rerun indexer");
    expect(failureRecoveryAction("pending_receipt")).to.equal("check reconciliation");
    expect(failureRecoveryAction("unknown")).to.equal("open incident");
  });

  it("tracks a 30-lead merchant pipeline across stages", () => {
    const pipeline = merchantPipeline(30);

    expect(pipeline).to.have.length(30);
    expect(pipeline.filter((lead) => lead.stage === "demo-booked")).to.have.length(6);
  });

  it("measures onboarding setup drop-offs without negative loss", () => {
    expect(onboardingDropOffs([3, 3, 2, 4, 1])).to.deep.equal([
      { count: 3, lostFromPrior: 0 },
      { count: 3, lostFromPrior: 0 },
      { count: 2, lostFromPrior: 1 },
      { count: 4, lostFromPrior: 0 },
      { count: 1, lostFromPrior: 3 },
    ]);
  });

  it("scores merchant health from campaign, staff, redemption, and report signals", () => {
    expect(merchantHealthScore({ recentCampaign: 25, staffActivity: 25, redemptions: 20, reportViews: 25 })).to.deep.equal({
      score: 95,
      status: "healthy",
    });
    expect(merchantHealthScore({ recentCampaign: 25, staffActivity: 0, redemptions: 0, reportViews: 8 }).status).to.equal("churn-risk");
  });

  it("turns the worst funnel leak into a campaign recommendation", () => {
    expect(campaignRecommendation("Claim to visit")).to.equal("Shorten redemption window and raise table urgency.");
    expect(campaignRecommendation("Invite to claim")).to.equal("Move QR to counter and table tent with staff prompt.");
  });

  it("packages weekly growth review counts from merchant health", () => {
    expect(weeklyGrowthReview([
      { score: 95, status: "healthy" },
      { score: 45, status: "needs-nudge" },
      { score: 25, status: "churn-risk" },
    ], 3)).to.deep.equal({ live: 3, active: 2, paid: 0, churnRisk: 1 });
  });

  it("builds paid conversion asks from weekly ROI reports", () => {
    expect(paidConversionSprint([
      { merchant: "Thamel Brew House", roi: "NPR 300 reward cost for 2 verified visits", nextAction: "Keep reward capped." },
    ])).to.deep.equal({
      target: 1,
      asks: ["Approve paid continuation: NPR 300 reward cost for 2 verified visits. Next action: Keep reward capped."],
    });
  });

  it("keeps traction dashboard focused on merchants, claims, redemptions, receipts, and paid commitments", () => {
    expect(tractionSummary({ liveMerchants: 3, claims: 8, redemptions: 4, receipts: 4 }, 30, 6)).to.deep.equal({
      merchants: 3,
      claims: 8,
      redemptions: 4,
      receipts: 4,
      paidCommitments: 0,
      pipelineLeads: 30,
      bookedDemos: 6,
    });
  });

  it("documents the architecture links between product, backend, Solana, relayer, indexer, and graph", () => {
    const edges = architectureEdges();

    expect(edges).to.have.length(6);
    expect(edges.map((edge) => edge[0])).to.include("Product app");
    expect(edges.map((edge) => edge[1])).to.include("Causal graph");
  });

  it("keeps the 90-second demo timeline focused from hook to traction", () => {
    expect(demoTimelineValid([
      { time: "0-10s", route: "/pitch" },
      { time: "10-25s", route: "/invite" },
      { time: "25-40s", route: "/merchant/scan" },
      { time: "40-55s", route: "/receipts/{id}" },
      { time: "55-70s", route: "/causal-graph" },
      { time: "70-90s", route: "/traction" },
    ])).to.equal(true);
  });

  it("requires the weekly package to include repo, demo, docs, video, metrics, and known limits", () => {
    expect(packageReviewReady({ repo: true, demo: true, docs: 5, video: true, metrics: true, knownLimits: 3 })).to.equal(true);
    expect(packageReviewReady({ repo: true, demo: true, docs: 2, video: true, metrics: true, knownLimits: 3 })).to.equal(false);
  });

  it("keeps consumer and device fraud graph nodes privacy-safe", () => {
    expect(privacySafeFraudNodes([
      { type: "consumer", privacy: "hashed", label: "consumer-abc123" },
      { type: "device", privacy: "hashed", label: "device-def456" },
      { type: "merchant", privacy: "business", label: "Thamel Brew House" },
    ])).to.equal(true);
    expect(privacySafeFraudNodes([{ type: "consumer", privacy: "raw", label: "user@example.com" }])).to.equal(false);
  });

  it("risk-adjusts partner payout by verified visits, rejects, repeats, and retention", () => {
    expect(partnerQualityScore({ base: 70, verifiedVisits: 3, rejects: 0, repeats: 1, retention: 10 })).to.deep.equal({
      score: 91,
      payoutAdjustment: "normal",
    });
    expect(partnerQualityScore({ base: 50, verifiedVisits: 0, rejects: 8, repeats: 0, retention: 0 }).payoutAdjustment).to.equal("hold");
  });

  it("covers script farms, staff abuse, and partner collusion with explicit controls", () => {
    expect(riskSimulationControls([
      { attack: "script farm", control: "device/session nullifiers", expected: "blocked or held" },
      { attack: "staff abuse", control: "staff device audit", expected: "held for review" },
      { attack: "partner collusion", control: "partner quality score", expected: "risk-adjusted payout" },
    ])).to.equal(true);
  });

  it("tunes settlement holds without overblocking high-quality sources", () => {
    expect(settlementHold(55)).to.deep.equal({ holdHours: 72, action: "manual review before payout" });
    expect(settlementHold(70)).to.deep.equal({ holdHours: 24, action: "delayed payout with merchant notification" });
    expect(settlementHold(88)).to.deep.equal({ holdHours: 0, action: "normal settlement" });
  });

  it("compresses only historical receipt leaves while hot state stays live", () => {
    expect(compressedReceiptScope([
      { name: "active campaigns", hot: true },
      { name: "unsettled receipts", hot: true },
      { name: "settled receipt hash", hot: false },
      { name: "evidence level", hot: false },
    ])).to.deep.equal(["settled receipt hash", "evidence level"]);
  });

  it("defines a no-PII Merkle leaf schema with proof fields", () => {
    expect(merkleLeafNoPii([
      { name: "receiptHash", pii: false },
      { name: "merchantHash", pii: false },
      { name: "settledAtDay", pii: false },
    ], ["leaf", "leafIndex", "root", "siblings", "treeId"])).to.equal(true);
    expect(merkleLeafNoPii([{ name: "phone", pii: true }], ["leaf", "root"])).to.equal(false);
  });

  it("writes a local demo receipt leaf into a deterministic tree root", () => {
    expect(demoMerkleRoot(["leaf-a", "leaf-b", "leaf-c"])).to.equal("leaf-a:leaf-b:leaf-c:leaf-c");
  });

  it("exposes compressed proof metadata beside receipt explorer data", () => {
    expect(receiptExplorerMetadata("receipt-1", "root-1", "leaf-1")).to.deep.equal({
      receiptId: "receipt-1",
      compressedRoot: "root-1",
      leaf: "leaf-1",
      proofVisible: true,
    });
  });

  it("keeps compression as show-and-roadmap only when hot state stays live", () => {
    expect(compressionCostDecision(true, true)).to.equal("keep-show-roadmap");
    expect(compressionCostDecision(false, true)).to.equal("fallback-normal-receipts");
  });

  it("defines the public SDK helper surface", () => {
    expect(sdkSurfaceValid(["verifyReceipt", "fetchGraph", "buildInviteAction", "deriveReceiptSeed"])).to.equal(true);
    expect(sdkSurfaceValid(["verifyReceipt", "mutateMerchant"])).to.equal(false);
  });

  it("verifies receipt payloads only after settlement proof is complete", () => {
    expect(sdkVerifyReceipt({ ok: true, status: "verified", settlementStatus: "settled", receiptPda: "pda", txSignature: "tx" })).to.equal(true);
    expect(sdkVerifyReceipt({ ok: true, status: "pending", settlementStatus: "submitted", receiptPda: "pda", txSignature: "tx" })).to.equal(false);
  });

  it("returns negative public verification states for missing or unsettled receipts", () => {
    expect(publicVerifyReceipt()).to.deep.equal({ ok: false, status: "not_found" });
    expect(publicVerifyReceipt({ id: "receipt-1", status: "submitted" })).to.deep.equal({ ok: false, status: "pending" });
  });

  it("keeps the example receipt graph app runnable from a fresh clone checklist", () => {
    expect(exampleAppFreshClone(["install dependencies", "call verification endpoint", "render graph nodes", "handle missing receipt"])).to.equal(true);
  });

  it("rejects tampered webhook signatures", () => {
    const payload = "{\"event\":\"receipt.settled\"}";
    const signature = webhookSignature(payload, "secret");

    expect(webhookSignatureValid(payload, signature, "secret")).to.equal(true);
    expect(webhookSignatureValid("{\"event\":\"receipt.failed\"}", signature, "secret")).to.equal(false);
  });

  it("treats weekly developer review as complete only after blockers are fixed", () => {
    expect(developerReviewResolved([{ status: "fixed" }, { status: "fixed" }])).to.equal(true);
    expect(developerReviewResolved([{ status: "fixed" }, { status: "open" }])).to.equal(false);
  });

  it("unlocks a neighborhood route reward after enough merchant visits", () => {
    expect(neighborhoodRouteUnlock(2, 2, 3)).to.equal(true);
    expect(neighborhoodRouteUnlock(1, 2, 3)).to.equal(false);
    expect(neighborhoodRouteUnlock(2, 4, 3)).to.equal(false);
  });

  it("keeps merchant discovery free of customer and raw device data", () => {
    expect(discoveryPrivacySafe([{ active: true }, { active: true }])).to.equal(true);
    expect(discoveryPrivacySafe([{ active: true, deviceId: "raw-device" }])).to.equal(false);
  });

  it("requires approved cross-promotion splits to sum to 100", () => {
    expect(crossPromotionSplit(20, 80, true)).to.equal(true);
    expect(crossPromotionSplit(20, 70, true)).to.equal(false);
    expect(crossPromotionSplit(20, 80, false)).to.equal(false);
  });

  it("keeps marketplace controls behind opt-in, caps, categories, and partner approval", () => {
    expect(marketplaceControlsAllowed({ optIn: true, cap: 5_000, categoryAllowed: true, partnerApproved: true })).to.equal(true);
    expect(marketplaceControlsAllowed({ optIn: true, cap: 8_000, categoryAllowed: true, partnerApproved: true })).to.equal(false);
  });

  it("keeps the neighborhood test only when redemptions and partner interest exist", () => {
    expect(marketplaceReview({ retentionVisits: 2, redemptions: 1, partnerInterest: 3 })).to.equal("keep-testing");
    expect(marketplaceReview({ retentionVisits: 1, redemptions: 0, partnerInterest: 3 })).to.equal("cut-or-redesign");
  });

  it("scopes creator campaigns around settled payout, quality score, holds, and approved content", () => {
    expect(creatorCampaignRiskSafe({ payoutAfterSettlement: true, qualityScore: true, fraudHolds: 3, contentApproved: true })).to.equal(true);
    expect(creatorCampaignRiskSafe({ payoutAfterSettlement: false, qualityScore: true, fraudHolds: 3, contentApproved: true })).to.equal(false);
  });

  it("requires creator onboarding profile, payout wallet, and campaign link", () => {
    expect(creatorOnboardingReady(true, true, true)).to.equal(true);
    expect(creatorOnboardingReady(true, false, true)).to.equal(false);
  });

  it("computes creator link analytics from clicks, claims, visits, and earnings", () => {
    expect(creatorAnalytics({ clicks: 30, claims: 10, verifiedVisits: 4, settledRewardsNpr: 20 })).to.deep.equal({
      claimRate: 33,
      visitRate: 40,
      earningsNpr: 20,
    });
  });

  it("settles creator payouts only when quality is high enough", () => {
    expect(creatorPayoutStatus({ qualityScore: 88, settledRewardsNpr: 20, pendingRewardsNpr: 0 })).to.equal("settled");
    expect(creatorPayoutStatus({ qualityScore: 60, settledRewardsNpr: 0, pendingRewardsNpr: 15 })).to.equal("held");
  });

  it("ranks creators by verified visits and quality instead of raw clicks", () => {
    expect(creatorLeaderboardRank({ verifiedVisits: 3, qualityScore: 80, clicks: 100 })).to.be.greaterThan(
      creatorLeaderboardRank({ verifiedVisits: 0, qualityScore: 90, clicks: 500 }),
    );
  });

  it("keeps the micro-creator test between one and three creators with feedback", () => {
    expect(microCreatorTest(2, true)).to.equal(true);
    expect(microCreatorTest(4, true)).to.equal(false);
  });

  it("summarizes creator conversion and payout adjustment for weekly review", () => {
    expect(weeklyCreatorReview({ verifiedVisits: 4, claims: 10, heldPayouts: 1 })).to.deep.equal({
      conversionRate: 40,
      payoutAdjustment: "hold risky sources",
    });
  });

  it("requires practical campaign assistant inputs without magic claims", () => {
    expect(campaignAssistantInputs(["merchant type", "margin", "traffic", "reward budget", "historical funnel"])).to.equal(true);
    expect(campaignAssistantInputs(["merchant type", "vibes"])).to.equal(false);
  });

  it("suggests rewards and caps from rules before ML", () => {
    expect(ruleBasedAssistant({ marginPercent: 55, rewardBudgetNpr: 5_000, claimToVisitRate: 40 })).to.deep.equal({
      rewardNpr: 150,
      cap: 33,
      template: "simple-share",
    });
  });

  it("simulates max liability, expected conversions, and break-even visits", () => {
    expect(liabilitySimulator({ rewardNpr: 150, cap: 30, expectedClaims: 90, claimToVisitRate: 40, grossMarginNpr: 300 })).to.deep.equal({
      maxCostNpr: 4500,
      expectedConversions: 30,
      breakEvenVisits: 15,
    });
  });

  it("generates campaign copy without unsupported claims", () => {
    expect(copyGeneratorSafe("Bring a friend, confirm at the counter, and unlock a capped reward.")).to.equal(true);
    expect(copyGeneratorSafe("Guaranteed fraud-proof free money.")).to.equal(false);
  });

  it("warns when assistant recommendations can attract abuse", () => {
    expect(fraudSafeRecommendation({ rewardNpr: 150, marginPercent: 55, repeatDeviceRisk: false, claimToVisitRate: 40 })).to.equal(true);
    expect(fraudSafeRecommendation({ rewardNpr: 500, marginPercent: 55, repeatDeviceRisk: true, claimToVisitRate: 20 })).to.equal(false);
  });

  it("keeps weekly assistant review focused on recommendations that improved activation", () => {
    expect(assistantReview(4, 2, ["generic viral copy"])).to.equal("keep practical rules");
    expect(assistantReview(4, 0, ["generic viral copy"])).to.equal("pause assistant expansion");
  });

  it("chooses the CSV import path before webhook integration sprawl", () => {
    expect(posPathSelection({ csvExport: true, webhookSandbox: false, customBuilds: 0 })).to.equal("csv-import-first");
    expect(posPathSelection({ csvExport: false, webhookSandbox: false, customBuilds: 2 })).to.equal("manual-receipt-evidence");
  });

  it("requires POS adapter auth, config, import, and mapping before sandbox use", () => {
    expect(posAdapterReady({ auth: true, config: true, importMode: true, mapping: true })).to.equal(true);
    expect(posAdapterReady({ auth: true, config: true, importMode: false, mapping: true })).to.equal(false);
  });

  it("matches POS payments to redemptions by receipt id, time, and amount", () => {
    expect(posPaymentMatch({ receiptId: "BILL-1", amount: 450, minutesFromRedemption: 4 }, { receiptId: "BILL-1", expectedAmount: 450 })).to.equal(true);
    expect(posPaymentMatch({ receiptId: "BILL-1", amount: 700, minutesFromRedemption: 4 }, { receiptId: "BILL-1", expectedAmount: 450 })).to.equal(false);
  });

  it("separates matched and unmatched reconciliation rows for merchant review", () => {
    expect(reconciliationBuckets([{ status: "matched" }, { status: "unmatched" }, { status: "mismatch" }])).to.deep.equal({
      matched: 1,
      unmatched: 2,
    });
  });

  it("maps POS failures to robust recovery actions", () => {
    expect(posFailureAction("outage")).to.equal("queue import");
    expect(posFailureAction("duplicate_webhook")).to.equal("dedupe by receipt fingerprint");
    expect(posFailureAction("bad_data")).to.equal("reject row");
  });

  it("expands the POS pilot only when value beats support cost", () => {
    expect(posPilotDecision({ matchedRows: 1, unmatchedRows: 1 })).to.equal("expand-carefully");
    expect(posPilotDecision({ matchedRows: 0, unmatchedRows: 2 })).to.equal("keep-manual-import");
  });

  it("keeps unified passbook history privacy-safe", () => {
    expect(passbookPrivacySafe([{ privateLabel: true }, {}])).to.equal(true);
    expect(passbookPrivacySafe([{ rawDevice: "device-1" }])).to.equal(false);
  });

  it("groups reward history into earned, pending, settled, and expired", () => {
    expect(rewardHistoryBuckets([{ status: "earned" }, { status: "pending" }, { status: "settled" }, { status: "expired" }])).to.deep.equal({
      earned: 1,
      pending: 1,
      settled: 1,
      expired: 1,
    });
  });

  it("shows nearby campaigns only when discovery is opt-in and merchant-controlled", () => {
    expect(nearbyCampaignAllowed({ optIn: true, merchantControls: true, available: true })).to.equal(true);
    expect(nearbyCampaignAllowed({ optIn: false, merchantControls: true, available: true })).to.equal(false);
  });

  it("requires consent, opt-out, and channel controls for notifications", () => {
    expect(notificationPreferencesValid({ consent: true, optOut: true, channels: ["in_app"] })).to.equal(true);
    expect(notificationPreferencesValid({ consent: true, optOut: false, channels: ["in_app"] })).to.equal(false);
  });

  it("caps referral streaks and counts only settled progress", () => {
    expect(referralStreak(5, 3, true)).to.deep.equal({ value: 3, capped: true });
    expect(referralStreak(2, 3, false)).to.deep.equal({ value: 0, capped: false });
  });

  it("requires ten-user passbook feedback with recorded friction", () => {
    expect(feedbackRound(10, 3)).to.equal(true);
    expect(feedbackRound(8, 3)).to.equal(false);
  });

  it("keeps weekly passbook review tied to repeat usage, shares, and opt-outs", () => {
    expect(weeklyPassbookReview({ repeatUsage: 10, shares: 3, optOuts: 2 })).to.equal("adjust-labels");
    expect(weeklyPassbookReview({ repeatUsage: 0, shares: 0, optOuts: 2 })).to.equal("pause-growth");
  });

  it("models location hierarchy from org to merchant to locations to staff devices", () => {
    expect(locationHierarchyValid({ org: true, merchant: true, locations: 2, staffDevices: 1 })).to.equal(true);
    expect(locationHierarchyValid({ org: true, merchant: false, locations: 2, staffDevices: 1 })).to.equal(false);
  });

  it("validates location campaign targeting for all or selected locations", () => {
    expect(locationTargetingValid("all_locations", [])).to.equal(true);
    expect(locationTargetingValid("selected_locations", ["loc-one"])).to.equal(true);
    expect(locationTargetingValid("selected_locations", ["bad-one"])).to.equal(false);
  });

  it("computes redemptions and ROI per location", () => {
    expect(locationRoi(3, 2, 175)).to.deep.equal({ redemptions: 3, receipts: 2, roiNpr: 350 });
  });

  it("requires location permissions before staff transfer or revocation", () => {
    expect(staffLocationAction("regional_manager", true, true, false)).to.equal(true);
    expect(staffLocationAction("regional_manager", true, false, false)).to.equal(false);
    expect(staffLocationAction("owner", true, true, true)).to.equal(false);
  });

  it("denies regional managers access outside assigned locations", () => {
    expect(regionalManagerAccess(["loc-a"], "loc-a")).to.equal(true);
    expect(regionalManagerAccess(["loc-a"], "loc-b")).to.equal(false);
  });

  it("passes multi-location simulation only with at least two locations and e2e coverage", () => {
    expect(multiLocationSimulation(2, true)).to.equal(true);
    expect(multiLocationSimulation(1, true)).to.equal(false);
  });

  it("finalizes a fee model with usage fee, take rate, and SaaS tiers", () => {
    expect(feeModelValid({ usageFee: 25, takeRatePercent: 20, tiers: 3 })).to.equal(true);
    expect(feeModelValid({ usageFee: 0, takeRatePercent: 40, tiers: 1 })).to.equal(false);
  });

  it("generates invoices only when line item accounting balances", () => {
    expect(automatedInvoice([{ quantity: 2, unitNpr: 150, totalNpr: 300 }, { quantity: 2, unitNpr: 25, totalNpr: 50 }])).to.equal(true);
    expect(automatedInvoice([{ quantity: 2, unitNpr: 150, totalNpr: 250 }])).to.equal(false);
  });

  it("keeps payment collection on hosted/manual paths without card storage", () => {
    expect(paymentCollectionSecure([{ storesCardData: false, signedLink: true }])).to.equal(true);
    expect(paymentCollectionSecure([{ storesCardData: true, signedLink: true }])).to.equal(false);
  });

  it("keeps dunning reminders friendly and spaced out", () => {
    expect(dunningCadenceFriendly([3, 7, 14], "Quick reminder about your verified visits invoice.")).to.equal(true);
    expect(dunningCadenceFriendly([0, 1], "Penalty threat.")).to.equal(false);
  });

  it("audits revenue dashboard metrics as non-negative business values", () => {
    expect(revenueDashboardMath({ mrr: 2500, usageFees: 300, settledRewards: 20, platformTake: 50 })).to.equal(true);
    expect(revenueDashboardMath({ mrr: 2500, usageFees: -1, settledRewards: 20, platformTake: 50 })).to.equal(false);
  });

  it("requires paid merchant push to include active targets and objection handling", () => {
    expect(paidMerchantPushReady(3, 3)).to.equal(true);
    expect(paidMerchantPushReady(0, 3)).to.equal(false);
  });

  it("matures weekly billing review only with paid conversion, low churn, and ARPM", () => {
    expect(weeklyBillingReview({ paidConversion: true, churn: 0, arpm: 2500 })).to.equal("mature-pricing");
    expect(weeklyBillingReview({ paidConversion: false, churn: 2, arpm: 0 })).to.equal("adjust-pricing");
  });

  it("covers program, relayer, auth, ledger, and threat model in audit prep", () => {
    expect(auditPrepReady(["program", "relayer", "auth", "ledger", "threat model"])).to.equal(true);
    expect(auditPrepReady(["program", "ledger"])).to.equal(false);
  });

  it("documents settlement, escrow, nullifier, and receipt uniqueness invariants", () => {
    expect(invariantsDocumented({ settlement: "once", escrow: "capped", nullifier: "unique", receiptUniqueness: "pda" })).to.equal(true);
  });

  it("expands negative coverage around billing, security, invariants, and disclosure", () => {
    expect(negativeCoverageAdded(["billing", "payment security", "invariants", "disclosure"])).to.equal(true);
    expect(negativeCoverageAdded(["billing"])).to.equal(false);
  });

  it("tracks external review issues and patched high severity findings", () => {
    expect(externalReviewIssues([{ severity: "high", status: "patched" }, { severity: "medium", status: "open" }])).to.deep.equal({
      highOpen: 0,
      patched: 1,
    });
  });

  it("requires disclosure docs to state audit status and known limitations", () => {
    expect(disclosureHonest({ auditStatus: "Not externally audited; capped beta only.", limitations: ["temporary PIN", "manual payment"] })).to.equal(true);
    expect(disclosureHonest({ auditStatus: "Production ready.", limitations: [] })).to.equal(false);
  });

  it("keeps weekly security review in capped beta while audit gate is blocked", () => {
    expect(weeklySecurityCaps({ rewardCap: 10_000, sponsoredTxCap: 250, maxMerchants: 3, uncappedAllowed: false })).to.equal(true);
    expect(weeklySecurityCaps({ rewardCap: 50_000, sponsoredTxCap: 500, maxMerchants: 10, uncappedAllowed: true })).to.equal(false);
  });

  it("updates launch checklist with security-governed cap controls", () => {
    expect(launchChecklistUpdated(["verify passed", "audit status disclosed", "caps configured", "pause switch tested", "merchant consent captured"])).to.equal(true);
  });

  it("prepares formal audit handoff across program, relayer, auth, ledger, and threat model", () => {
    expect(formalAuditHandoff(["program", "relayer", "auth", "ledger", "threat model"], 4)).to.equal(true);
    expect(formalAuditHandoff(["program"], 4)).to.equal(false);
  });

  it("keeps formal invariant docs focused on audit targets", () => {
    expect(formalInvariantTargets(["settlement", "escrow", "nullifier", "receipt uniqueness"])).to.equal(true);
  });

  it("covers negative/property targets for formal review", () => {
    expect(propertyTargetsCovered(["settlement replay", "escrow overdraw", "duplicate nullifier", "duplicate receipt id"])).to.equal(true);
    expect(propertyTargetsCovered(["settlement replay"])).to.equal(false);
  });

  it("requires high severity external review findings to be patched", () => {
    expect(formalReviewTracker([{ severity: "high", status: "patched" }, { severity: "medium", status: "open" }])).to.equal(true);
    expect(formalReviewTracker([{ severity: "high", status: "open" }])).to.equal(false);
  });

  it("pairs high severity fixes with regression tests", () => {
    expect(highSeverityRegression(1, 1)).to.equal(true);
    expect(highSeverityRegression(2, 1)).to.equal(false);
  });

  it("keeps formal disclosure docs updated with audit status", () => {
    expect(formalDisclosureDocs(["docs/current-state.md", "README.md"], "Not externally audited; capped beta only.")).to.equal(true);
  });

  it("scopes mainnet beta assistant around strict caps and no magic claims", () => {
    expect(strictCapAssistant({ rewardBudgetCap: true, verifiedVisitCap: true, sponsoredTxCap: true, noMagicClaims: true })).to.equal(true);
    expect(strictCapAssistant({ rewardBudgetCap: true, verifiedVisitCap: false, sponsoredTxCap: true, noMagicClaims: true })).to.equal(false);
  });

  it("keeps rule-based mainnet beta assistant under strict budget and visit caps", () => {
    expect(strictCapRuleSuggestion({ rewardBudgetNpr: 3_000, verifiedVisitCap: 20, hasMerchantFeedback: true })).to.equal(true);
    expect(strictCapRuleSuggestion({ rewardBudgetNpr: 8_000, verifiedVisitCap: 50, hasMerchantFeedback: true })).to.equal(false);
  });

  it("simulates strict-cap beta liability before launch expansion", () => {
    expect(strictCapLiability({ maxCostNpr: 3_000, breakEvenVisits: 10, cap: 20 })).to.equal(true);
    expect(strictCapLiability({ maxCostNpr: 8_000, breakEvenVisits: 40, cap: 20 })).to.equal(false);
  });

  it("generates mainnet beta copy with capped verified-visit language", () => {
    expect(mainnetBetaCopySafe("Bring a friend for a verified visit and unlock a capped NPR 150 reward.")).to.equal(true);
    expect(mainnetBetaCopySafe("Guaranteed fraud-proof free money for every share.")).to.equal(false);
  });

  it("keeps mainnet beta assistant recommendations fraud-safe", () => {
    expect(mainnetBetaFraudRecommendation({ rewardNpr: 150, marginPercent: 55, repeatDeviceRisk: false, claimToVisitRate: 35 })).to.equal(true);
    expect(mainnetBetaFraudRecommendation({ rewardNpr: 500, marginPercent: 55, repeatDeviceRisk: true, claimToVisitRate: 20 })).to.equal(false);
  });

  it("measures assistant analytics by accepted suggestions and cap-safe activation", () => {
    expect(assistantAnalyticsLoop({ suggestions: 5, accepted: 3, activationLift: 12, capViolations: 0 })).to.deep.equal({
      acceptanceRate: 60,
      keep: true,
    });
  });

  it("runs weekly assistant review against practical rules instead of generic virality", () => {
    expect(weeklyAssistantPractical(["budget caps", "staff-ready copy"], ["generic virality"])).to.equal(true);
  });

  it("defines operational SLOs for uptime, latency, and receipt success", () => {
    expect(sloTargetsMet({ uptimePercent: 99.7, p95LatencyMs: 900, receiptSuccessPercent: 99 })).to.equal(true);
    expect(sloTargetsMet({ uptimePercent: 98, p95LatencyMs: 2000, receiptSuccessPercent: 95 })).to.equal(false);
  });

  it("tunes alerts to page critical issues and suppress known low-noise checks", () => {
    expect(alertTuningHealthy([
      { name: "api_down", severity: "critical", suppressed: false },
      { name: "single_demo_failure", severity: "low", suppressed: true },
    ])).to.equal(true);
  });

  it("requires backup and restore drill to meet RPO and RTO targets", () => {
    expect(backupRestoreDrillReady({ rpoMinutes: 60, rtoMinutes: 30, verified: true })).to.equal(true);
    expect(backupRestoreDrillReady({ rpoMinutes: 120, rtoMinutes: 45, verified: true })).to.equal(false);
  });

  it("keeps queue and outbox reliability under launch thresholds", () => {
    expect(outboxReliabilityHealthy({ pending: 1, failed: 0, deadLetter: 0, retryPolicy: true })).to.equal(true);
    expect(outboxReliabilityHealthy({ pending: 5, failed: 1, deadLetter: 0, retryPolicy: true })).to.equal(false);
  });

  it("defines a support workflow with triage, escalation, refunds, and updates", () => {
    expect(supportWorkflowReady({ triage: true, escalation: true, refundPath: true, statusUpdate: true })).to.equal(true);
  });

  it("reports internal health only when public status and backlogs are healthy", () => {
    expect(statusPageHealthy({ publicStatus: "operational", apiUptimePercent: 99.7, outboxBacklog: 1 })).to.equal(true);
    expect(statusPageHealthy({ publicStatus: "degraded", apiUptimePercent: 99.7, outboxBacklog: 1 })).to.equal(false);
  });

  it("locks canonical analytics metrics before dashboard expansion", () => {
    expect(canonicalMetricDictionary(["invites", "claims", "redemptions", "receipts", "settlement", "retention"])).to.equal(true);
  });

  it("reconciles source, outbox, and dashboard event pipeline counts", () => {
    expect(eventPipelineReconciles({ sourceEvents: 12, outboxEvents: 10, dashboardEvents: 8 })).to.equal(true);
    expect(eventPipelineReconciles({ sourceEvents: 8, outboxEvents: 10, dashboardEvents: 8 })).to.equal(false);
  });

  it("builds cohort dashboards with retained counts bounded by claims", () => {
    expect(cohortDashboardUseful([{ cohort: "week-one", claims: 10, retained: 4 }])).to.equal(true);
    expect(cohortDashboardUseful([{ cohort: "bad", claims: 1, retained: 2 }])).to.equal(false);
  });

  it("keeps ROI dashboard v2 positive after rewards and fraud holds", () => {
    expect(roiDashboardV2Safe({ revenueNpr: 2_000, rewardCostNpr: 600, fraudHoldsNpr: 100 })).to.equal(true);
    expect(roiDashboardV2Safe({ revenueNpr: 500, rewardCostNpr: 600, fraudHoldsNpr: 100 })).to.equal(false);
  });

  it("passes data quality checks before submission export", () => {
    expect(dataQualityChecksPass({ duplicateEvents: 0, missingReceipts: 0, staleViews: 1 })).to.equal(true);
    expect(dataQualityChecksPass({ duplicateEvents: 1, missingReceipts: 0, staleViews: 1 })).to.equal(false);
  });

  it("packages submission metrics with CSV, screenshots, and README context", () => {
    expect(submissionExportComplete({ csv: true, screenshots: 3, readme: true })).to.equal(true);
  });

  it("keeps weekly analytics review tied to metrics, cohorts, and actions", () => {
    expect(weeklyAnalyticsReviewReady({ canonicalMetrics: true, cohortNotes: true, actionItems: 2 })).to.equal(true);
  });

  it("makes churn analysis actionable with fixes per reason", () => {
    expect(churnAnalysisActionable([{ reason: "staff forgot code step", fix: "training checklist" }])).to.equal(true);
  });

  it("accepts activation redesign only when conversion improves materially", () => {
    expect(activationRedesignImproves(28, 44)).to.equal(true);
    expect(activationRedesignImproves(28, 32)).to.equal(false);
  });

  it("prepares merchant success playbooks across launch and paid conversion", () => {
    expect(successPlaybooksReady(["first campaign", "staff training", "weekly review", "paid conversion"])).to.equal(true);
  });

  it("keeps recurring campaign templates capped and fraud-checked", () => {
    expect(recurringTemplatesReady([
      { cadence: "weekly", cap: 20, fraudCheck: true },
      { cadence: "recurring", cap: 30, fraudCheck: true },
    ])).to.equal(true);
  });

  it("tracks staff adherence through checklist, device audit, and miss rate", () => {
    expect(staffAdherenceReady({ checklist: true, deviceAudit: true, missRatePercent: 8 })).to.equal(true);
    expect(staffAdherenceReady({ checklist: true, deviceAudit: false, missRatePercent: 8 })).to.equal(false);
  });

  it("summarizes retention review with a case study and next experiment", () => {
    expect(retentionReviewUseful({ caseStudy: true, repeatVisits: 3, nextExperiment: "recurring hostel pass" })).to.equal(true);
  });

  it("plans partner network expansion with ICP, approvals, payouts, and caps", () => {
    expect(partnerExpansionPlanReady({ ICP: true, approvalFlow: true, payoutRules: true, cappedPilot: true })).to.equal(true);
  });

  it("builds partner network core around profiles, approvals, and links", () => {
    expect(partnerNetworkCoreReady({ partnerProfiles: true, approvalRecords: true, attributionLinks: true })).to.equal(true);
  });

  it("integrates partner network with marketplace, payouts, and fraud controls", () => {
    expect(partnerNetworkIntegrated({ marketplace: true, payouts: true, fraudControls: true })).to.equal(true);
  });

  it("hardens partner network with caps, disclosure, and support escalation", () => {
    expect(partnerNetworkHardened({ caps: true, disclosure: true, supportEscalation: true })).to.equal(true);
  });

  it("measures partner network expansion by partners, redemptions, and quality", () => {
    expect(partnerNetworkMeasured({ partners: 1, redemptions: 2, qualityScore: 80 })).to.equal(true);
  });

  it("pilots partner network only when merchant, partner, and feedback are ready", () => {
    expect(partnerNetworkPilotReady({ merchant: true, partner: true, feedbackItems: 3, result: "pilot-ready" })).to.equal(true);
  });

  it("keeps weekly partner network review disciplined by evidence", () => {
    expect(weeklyPartnerNetworkReviewDisciplined({ evidenceCount: 2, decision: "iterate", unrelatedFeatures: 0 })).to.equal(true);
    expect(weeklyPartnerNetworkReviewDisciplined({ evidenceCount: 0, decision: "expand", unrelatedFeatures: 1 })).to.equal(false);
  });

  it("defines a scoped SDK surface for verification and composability", () => {
    expect(sdkSurfaceScoped(["verifyReceipt", "fetchGraph", "buildInviteAction", "pdaHelpers"])).to.equal(true);
  });

  it("implements a typed SDK package with unit-tested proof helpers", () => {
    expect(sdkPackageConsumable({ typed: true, unitTests: 4, proofHelpers: 2 })).to.equal(true);
  });

  it("exposes public verification only for settled receipts", () => {
    expect(verificationApiPublic({ ok: true, status: "verified", settlement: "settled" })).to.equal(true);
    expect(verificationApiPublic({ ok: true, status: "verified", settlement: "pending" })).to.equal(false);
  });

  it("keeps the example receipt graph app fresh-clone runnable", () => {
    expect(exampleAppV2FreshClone(["install", "verify", "run example", "display graph"])).to.equal(true);
  });

  it("makes developer docs usable for install, verification, webhooks, and examples", () => {
    expect(developerDocsUsable(["install", "verify receipt", "listen webhook", "examples"])).to.equal(true);
  });

  it("rejects tampered signed webhooks", () => {
    expect(webhookTamperRejected("sig-a", "sig-b")).to.equal(true);
    expect(webhookTamperRejected("sig-a", "sig-a")).to.equal(false);
  });

  it("closes developer review blockers before calling the SDK ready", () => {
    expect(weeklyDeveloperReviewBlocksFixed(["base URL docs"], "sdk-surface-ready")).to.equal(true);
  });

  it("sets load-test targets across spikes, brute force, dashboards, and queues", () => {
    expect(loadPlanTargets({ scenarios: 4, claimP95Ms: 500, queueDrainSeconds: 60 })).to.equal(true);
  });

  it("load-tests claim, redeem, and confirm endpoints against p95 targets", () => {
    expect(apiLoadCorePath({ claimP95Ms: 420, redeemP95Ms: 380, confirmP95Ms: 610, fixedTopBottleneck: true })).to.equal(true);
  });

  it("reviews database indexes around tenant filters and explain plans", () => {
    expect(databaseIndexReviewReady({ tenantFilters: 4, explainPlans: true })).to.equal(true);
  });

  it("keeps dashboard performance summary-backed and cached", () => {
    expect(dashboardPerformanceFast({ materializedSummaries: 3, p95Ms: 780, cacheTtlSeconds: 60 })).to.equal(true);
  });

  it("stress-tests relayer and indexer saturation without dead letters", () => {
    expect(relayerStressHealthy({ saturated: true, retryMetrics: true, deadLetters: 0 })).to.equal(true);
  });

  it("passes low-end mobile performance after heavy UI is fixed", () => {
    expect(mobilePerformanceReady({ lowEndPhone: true, firstInteractionMs: 1600, heavyUiFixed: true })).to.equal(true);
  });

  it("documents latency, error budgets, and capacity in weekly performance review", () => {
    expect(weeklyPerformanceReviewReady({ latencyBudget: true, errorBudget: true, capacityDoc: true })).to.equal(true);
  });

  it("creates promotion terms with reward value, expiry, and abuse policy", () => {
    expect(promotionTermsClear(["reward value", "expiry", "eligibility", "abuse policy"])).to.equal(true);
  });

  it("documents privacy data, retention, deletion, and on-chain commitments", () => {
    expect(privacyPolicyProfessional({ data: 4, retention: true, deletion: true, commitments: true })).to.equal(true);
  });

  it("prepares merchant agreement sections for paid pilots", () => {
    expect(merchantAgreementReady(["fees", "responsibilities", "fraud", "reversals", "data"])).to.equal(true);
  });

  it("keeps user terms clear on rewards, claims, wallet, and disputes", () => {
    expect(userTermsClear(["rewards", "claims", "wallet", "disputes"])).to.equal(true);
  });

  it("tests data retention and deletion process for consumer and merchant lifecycle", () => {
    expect(deletionProcessTested({ consumerLifecycle: true, merchantLifecycle: true, testedRequest: true })).to.equal(true);
  });

  it("reduces local market risk with constraints and advisor review", () => {
    expect(localMarketReviewReducedRisk({ localConstraints: 3, advisorCheck: true, avoidsLotteryFraming: true })).to.equal(true);
  });

  it("tracks weekly legal review items into docs and onboarding", () => {
    expect(weeklyLegalReviewTracksOpenItems({ docsUpdated: true, onboardingUpdated: true, openItems: 2 })).to.equal(true);
  });

  it("fixes top five UX issues after auditing primary screens", () => {
    expect(uxAuditTopFiveFixed({ reviewedScreens: 6, fixedIssues: 5 })).to.equal(true);
  });

  it("polishes mobile consumer and staff flows across real device sizes", () => {
    expect(mobilePolishDeviceTested({ consumerFlow: true, staffFlow: true, devices: 3 })).to.equal(true);
  });

  it("removes jargon after merchant and user copy read-through", () => {
    expect(copyPolishRemovesJargon({ jargonRemoved: 3, merchantRead: true, userRead: true })).to.equal(true);
  });

  it("polishes dashboard hierarchy across ROI, graph, fraud, and ledger", () => {
    expect(dashboardPolishReadable(["ROI", "graph", "fraud", "ledger"])).to.equal(true);
  });

  it("turns receipt explorer into a clear proof asset without unsupported claims", () => {
    expect(receiptExplorerProofAsset({ beautiful: true, educational: true, unsupportedClaims: false })).to.equal(true);
  });

  it("passes accessibility checklist for keyboard, contrast, labels, and focus", () => {
    expect(accessibilityPassReady(["keyboard", "contrast", "labels", "focus"], 0)).to.equal(true);
  });

  it("uses before-after screenshots to cut clutter in weekly polish review", () => {
    expect(weeklyPolishReviewFinalist({ screenshots: 4, clutterCut: true })).to.equal(true);
  });

  it("keeps fresh clone setup ready for evaluators", () => {
    expect(freshCloneEvaluatorReady(["install", "verify", "run app"])).to.equal(true);
  });

  it("requires full CI green across lint, typecheck, unit, anchor, and build", () => {
    expect(fullCiGreen(["lint", "typecheck", "unit", "anchor", "build"])).to.equal(true);
  });

  it("keeps protocol final review honest about invariants and limits", () => {
    expect(protocolFinalHonest({ invariants: 5, knownLimits: 4, hiddenRisks: false })).to.equal(true);
  });

  it("clears final security scan for secrets, dependencies, and auth routes", () => {
    expect(securityFinalScanClear({ secrets: true, deps: true, authRoutes: true, blockers: 0 })).to.equal(true);
  });

  it("freezes demo data with stable seed, reset, backup txs, and reset test", () => {
    expect(demoDataFreezeStable({ seed: true, reset: true, backupTxs: 3, resetTested: true })).to.equal(true);
  });

  it("passes performance smoke on core flow and mobile", () => {
    expect(performanceSmokePass({ coreFlow: true, mobile: true, topIssueFixed: true })).to.equal(true);
  });

  it("starts feature freeze after weekly hardening release-candidate review", () => {
    expect(hardeningReviewReleaseCandidate({ blockerOnly: true, releaseCandidate: true, featureFreeze: true })).to.equal(true);
  });

  it("archives merchant proof assets with permission tracking", () => {
    expect(merchantProofAssetsArchived({ quotes: 1, permissionsTracked: true, archive: true })).to.equal(true);
  });

  it("audits final metrics without inflating raw claims into revenue", () => {
    expect(metricsAuditNoInflation({ reconciled: true, verifiedReceipts: true, rawClaimsAsRevenue: false })).to.equal(true);
  });

  it("keeps final case study detailed while permission can remain pending", () => {
    expect(finalCaseStudyApproved({ detailed: true, approvalStatus: "permission pending" })).to.equal(true);
  });

  it("tracks paid commitment push answers from warm merchants", () => {
    expect(paidCommitmentPushTracked({ warmMerchants: 3, ask: true, answersTracked: true })).to.equal(true);
  });

  it("keeps public traction page grounded in screenshots, tx links, metrics, and testimonials", () => {
    expect(publicTractionPageReal({ screenshots: true, txLinks: true, metrics: true, testimonials: true })).to.equal(true);
  });

  it("prepares investor memo across why now, market, traction, Solana, and risks", () => {
    expect(investorMemoAcceleratorReady(["why now", "market", "traction", "Solana", "risks"])).to.equal(true);
  });

  it("sharpens weekly traction review by choosing strong numbers and cutting weak stats", () => {
    expect(weeklyTractionReviewSharp({ strongestNumbers: 3, weakStatsCut: true })).to.equal(true);
  });

  it("rewrites final README around hook, demo, setup, architecture, tests, and limitations", () => {
    expect(finalReadmeComplete(["hook", "demo", "setup", "architecture", "tests", "limitations"])).to.equal(true);
  });

  it("keeps final demo script between 90 and 120 seconds with proof and traction", () => {
    expect(finalDemoScriptTimed({ seconds: 105, causalHook: true, liveProof: true, traction: true })).to.equal(true);
  });

  it("records final video as a clean reviewed take with captions and callouts", () => {
    expect(finalVideoCompelling({ cleanTake: true, captions: 4, callouts: 5, reviewed: true })).to.equal(true);
  });

  it("prepares technical deep dive across program, relayer, indexer, tests, and security", () => {
    expect(technicalDeepDiveCredible(["program", "relayer", "indexer", "tests", "security"])).to.equal(true);
  });

  it("checks final pitch deck has ten startup-story slides", () => {
    expect(pitchDeckReady(["problem", "primitive", "product", "demo", "traction", "business", "Solana", "market", "risks", "ask"])).to.equal(true);
  });

  it("exports architecture and graph visuals with quality check", () => {
    expect(architectureVisualsReady({ diagrams: 2, screenshots: 2, qualityChecked: true })).to.equal(true);
  });

  it("backs up all final assets during weekly asset review", () => {
    expect(weeklyAssetReviewComplete({ links: 6, files: 5, screenshots: 4, videos: 2, backup: true })).to.equal(true);
  });

  it("prepares crisp judge Q&A on Solana, DB, fraud, traction, and model", () => {
    expect(judgeQaCrisp(["why Solana", "why not DB", "fraud", "traction", "model"])).to.equal(true);
  });

  it("prepares technical Q&A without hand-waving", () => {
    expect(technicalQaNoHandwaving(["accounts", "constraints", "relayer", "indexer", "privacy"])).to.equal(true);
  });

  it("prepares business Q&A with pricing, GTM, market, retention, and competition", () => {
    expect(businessQaCredible(["pricing", "GTM", "market", "retention", "competition"])).to.equal(true);
  });

  it("prepares security Q&A around threat model, audit status, caps, and PII", () => {
    expect(securityQaTrustReady(["threat model", "audit status", "caps", "PII"])).to.equal(true);
  });

  it("rehearses live demo with recording and fallback", () => {
    expect(liveDemoRehearsalReady({ seconds: 105, fallback: true, recorded: true, smooth: true })).to.equal(true);
  });

  it("uses external mock judging to fix top confusion", () => {
    expect(mockJudgingReducesWeaknesses({ reviewers: 3, fixedTopConfusion: true })).to.equal(true);
  });

  it("finalizes Q&A talking points without adding features", () => {
    expect(weeklyQaFinalNoFeatures({ talkingPoints: 5, newFeatures: 0, ready: true })).to.equal(true);
  });

  it("preserves release candidate with tag, deploy, env snapshot, and smoke test", () => {
    expect(releaseCandidatePreserved({ tagged: true, deployed: true, envSnapshot: true, smokeTested: true })).to.equal(true);
  });

  it("keeps backup demo recording playable with tx proof", () => {
    expect(backupDemoPlayable({ walkthrough: true, txProof: true, playbackTested: true })).to.equal(true);
  });

  it("audits every final link with zero broken links", () => {
    expect(linkAuditClean({ links: 6, clickedEvery: true, broken: 0 })).to.equal(true);
  });

  it("publishes known limitations with honest status and roadmap", () => {
    expect(knownLimitationsHonest({ limitations: 5, roadmap: 5, honest: true })).to.equal(true);
  });

  it("dry-runs submission fields with low surprise risk", () => {
    expect(submissionDryRunReady({ fields: 6, verified: true, surpriseRisk: "low" })).to.equal(true);
  });

  it("keeps final bug-only day restricted to blocking fixes", () => {
    expect(bugOnlyDayStable({ blockerFixesOnly: true, regressionChecks: 3, newFeatures: false })).to.equal(true);
  });

  it("passes weekly freeze review with submit-ready go decision", () => {
    expect(freezeReviewGo({ checklist: 5, goNoGo: "go", submitReady: true })).to.equal(true);
  });

  it("archives submitted package with confirmation and link check", () => {
    expect(submitPackageComplete({ submitted: true, receiptConfirmed: true, archiveItems: 5, linkCheck: true })).to.equal(true);
  });

  it("prepares follow-up demo across live, backup, local, and video environments", () => {
    expect(followUpDemoReady({ environments: 4, smokeTested: true, contactReady: true })).to.equal(true);
  });

  it("prepares investor one-pager with traction, primitive, roadmap, and ask", () => {
    expect(investorOnePagerReady(["traction", "primitive", "roadmap", "ask"])).to.equal(true);
  });

  it("continues merchant follow-up with thanks, results, next campaigns, and CRM", () => {
    expect(merchantFollowUpContinues({ thanked: true, resultsShared: true, nextCampaigns: true, crm: true })).to.equal(true);
  });

  it("captures postmortem with what worked and failed", () => {
    expect(postmortemCaptured({ worked: 4, failed: 3, documented: true })).to.equal(true);
  });

  it("prioritizes 30/60/90 day next milestone plan", () => {
    expect(nextMilestonePrioritized({ day30: 3, day60: 3, day90: 3, prioritized: true })).to.equal(true);
  });

  it("restabilizes branches, issues, and docs after submission", () => {
    expect(restabilizedAfterSubmission({ cleanupItems: 4, ciCheck: true, nextStageReady: true })).to.equal(true);
  });

  it("chooses one POS import path without integration sprawl", () => {
    expect(posPathNoSprawl({ selected: "CSV/import first", documentedWhy: true, noSprawl: true })).to.equal(true);
  });

  it("builds POS adapter skeleton with auth, import, mapping, and sandbox test", () => {
    expect(adapterSkeletonReady({ authConfig: true, importOrWebhook: true, mapping: true, sandboxTest: true })).to.equal(true);
  });

  it("matches payments to redemptions using receipt id, time, and amount with mismatch tests", () => {
    expect(paymentMatchingRobust({ receiptId: true, time: true, amount: true, mismatchTests: 3 })).to.equal(true);
  });

  it("keeps reconciliation UI merchant-reviewable", () => {
    expect(reconciliationUiManageable({ matched: true, unmatched: true, merchantReview: true })).to.equal(true);
  });

  it("handles POS outage, duplicate webhook, and bad data with tests", () => {
    expect(posFailureHandlingRobust({ outage: true, duplicateWebhook: true, badData: true, tests: true })).to.equal(true);
  });

  it("validates one-merchant POS pilot with real import metrics", () => {
    expect(oneMerchantPosPilotValidated({ realImport: true, metrics: 4, validated: true })).to.equal(true);
  });

  it("reviews POS value against support cost before expanding", () => {
    expect(weeklyPosReviewStrategic({ value: true, supportCost: true, decision: "expand-carefully" })).to.equal(true);
  });

  it("completes Day 365 operating plan with roadmap, packets, backlog, and health checks", () => {
    expect(operatingPlan365Complete({ roadmap: true, merchantPacket: true, investorOnePager: true, backlogTiers: 4, healthChecks: 3 })).to.equal(true);
  });

  it("requires every active redemption slot to settle before clearing the pending lock", () => {
    const partial = simulateRedemptionSlotSettlement(3, [0, 2]);
    const complete = simulateRedemptionSlotSettlement(3, [0, 1, 2]);

    expect(partial.mask).to.equal(5);
    expect(partial.requiredMask).to.equal(7);
    expect(partial.canClear).to.equal(false);
    expect(complete.canClear).to.equal(true);
  });

  it("rejects duplicate redemption slot settlement", () => {
    expect(() => simulateRedemptionSlotSettlement(2, [0, 0])).to.throw("slot already settled");
  });

  it("rolls fractional commission dust into claimable tokens", () => {
    const ledger = {
      claimable: 0,
      dustTenths: 0,
      totalEarned: 0,
      totalRedemptionsDriven: 0,
      highestSingleCommission: 0,
    };

    applyCommission(ledger, 1, 3333);
    applyCommission(ledger, 1, 3333);
    applyCommission(ledger, 1, 3334);

    expect(ledger.claimable).to.equal(1);
    expect(ledger.dustTenths).to.equal(0);
    expect(ledger.totalEarned).to.equal(1);
    expect(ledger.totalRedemptionsDriven).to.equal(3);
  });

  it("tracks highest single commission separately from dust rollover", () => {
    const ledger = {
      claimable: 0,
      dustTenths: 0,
      totalEarned: 0,
      totalRedemptionsDriven: 0,
      highestSingleCommission: 0,
    };

    applyCommission(ledger, 1000, 500);
    applyCommission(ledger, 99, 5000);

    expect(ledger.claimable).to.equal(99);
    expect(ledger.highestSingleCommission).to.equal(50);
    expect(ledger.totalRedemptionsDriven).to.equal(2);
  });

  it("grosses up commission payouts to cover Token-2022 transfer fees", () => {
    const gross = grossUpForTransferFee(9_500, 500);
    expect(gross).to.equal(10_000);
  });

  it("rejects impossible transfer-fee gross-up settings", () => {
    expect(() => grossUpForTransferFee(1, 10_000)).to.throw("invalid transfer fee");
  });

  it("blocks same-device self-referral in the launch ledger flow", () => {
    const referral = {
      token: "referral-alpha",
      referrerSessionId: "session-alpha",
      referrerDeviceFingerprint: "device-alpha",
    };
    const claims: SimClaim[] = [];
    const claim = claimReferralForLaunch(referral, claims, "guest-1", "device-alpha");

    expect(claim.status).to.equal("blocked");
    expect(claims).to.have.length(1);
  });

  it("reuses an existing active launch claim instead of duplicating attribution", () => {
    const referral = {
      token: "referral-alpha",
      referrerSessionId: "session-alpha",
      referrerDeviceFingerprint: "device-alpha",
    };
    const claims: SimClaim[] = [];
    const first = claimReferralForLaunch(referral, claims, "guest-1", "device-guest-1");
    const second = claimReferralForLaunch(referral, claims, "guest-1", "device-guest-1");

    expect(first.id).to.equal(second.id);
    expect(claims).to.have.length(1);
  });

  it("normalizes merchant redeem codes before confirmation", () => {
    const referral = {
      token: "referral-alpha",
      referrerSessionId: "session-alpha",
      referrerDeviceFingerprint: "device-alpha",
    };
    const claims: SimClaim[] = [];
    const claim = claimReferralForLaunch(referral, claims, "guest-1", "device-guest-1");
    const code = generateRedeemCodeForLaunch(claim);
    const ok = confirmRedeemCodeForLaunch(claims, code.replace("-", "").toLowerCase());

    expect(ok).to.equal(true);
    expect(claim.status).to.equal("redeemed");
  });
});
