import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { CausalInviteRecord } from '@/lib/launch/types';
import { getCausalInviteSecret } from '@/lib/launch/security';

const CAUSAL_INVITE_TTL_HOURS = 72;

function secret() {
  return getCausalInviteSecret();
}

export function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacHex(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

export function stableJson(value: Record<string, unknown>) {
  return JSON.stringify(Object.keys(value).sort().reduce<Record<string, unknown>>((result, key) => {
    result[key] = value[key];
    return result;
  }, {}));
}

export function createReferrerCommitment(params: {
  campaignId: string;
  referrerSessionId: string;
  deviceFingerprint: string;
}) {
  return sha256Hex(`${params.campaignId}:${params.referrerSessionId}:${params.deviceFingerprint}:referrer-v1`);
}

export function createCampaignNullifier(params: {
  campaignId: string;
  claimerSessionId: string;
  deviceFingerprint: string;
}) {
  return sha256Hex(`${params.campaignId}:${params.claimerSessionId}:${params.deviceFingerprint}:claim-v1`);
}

export function createCausalInvite(params: {
  campaignId: string;
  merchantId: string;
  referrerSessionId: string;
  deviceFingerprint: string;
  issuedAt: Date;
}) {
  const inviteNonce = randomUUID();
  const expiresAt = params.issuedAt.getTime() + CAUSAL_INVITE_TTL_HOURS * 60 * 60 * 1000;
  const referrerCommitment = createReferrerCommitment({
    campaignId: params.campaignId,
    referrerSessionId: params.referrerSessionId,
    deviceFingerprint: params.deviceFingerprint,
  });
  const unsigned = {
    version: '0.1' as const,
    campaignId: params.campaignId,
    merchantId: params.merchantId,
    referrerCommitment,
    inviteNonce,
    expiresAt,
  };

  return {
    ...unsigned,
    signature: hmacHex(stableJson(unsigned)),
  } satisfies CausalInviteRecord;
}

export function hashCausalInvite(invite: CausalInviteRecord) {
  return sha256Hex(stableJson(invite as unknown as Record<string, unknown>));
}

export function verifyCausalInvite(invite: CausalInviteRecord, nowMs = Date.now()) {
  if (invite.expiresAt <= nowMs) {
    return false;
  }

  const unsigned = {
    version: invite.version,
    campaignId: invite.campaignId,
    merchantId: invite.merchantId,
    referrerCommitment: invite.referrerCommitment,
    inviteNonce: invite.inviteNonce,
    expiresAt: invite.expiresAt,
  };

  const expected = hmacHex(stableJson(unsigned));
  const expectedBuffer = Buffer.from(expected, 'hex');
  const suppliedBuffer = Buffer.from(invite.signature, 'hex');

  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function createVisitChallengeHash(params: {
  merchantId: string;
  offerId: string;
  claimId: string;
  redeemCodeId: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
}) {
  return sha256Hex(stableJson({
    version: 'visit-challenge-v1',
    merchantId: params.merchantId,
    offerId: params.offerId,
    claimId: params.claimId,
    redeemCodeId: params.redeemCodeId,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    nonce: params.nonce,
  }));
}

export function signCustomerChallenge(challengeHash: string, deviceFingerprint: string) {
  return hmacHex(`customer:${challengeHash}:${deviceFingerprint}`);
}

export function signStaffChallenge(challengeHash: string, staffPin: string) {
  return hmacHex(`staff:${challengeHash}:${staffPin}`);
}

export function deriveReceiptPdaLike(receiptIdHash: string) {
  return `preview_receipt_${sha256Hex(`causal_receipt:${receiptIdHash}`).slice(0, 32)}`;
}

export function deriveTxSignatureLike(receiptIdHash: string, visitAttestationHash: string) {
  return `preview_intent_${sha256Hex(`${receiptIdHash}:${visitAttestationHash}`).slice(0, 44)}`;
}

export function verifyReceiptCommitmentProof(params: {
  campaignId: string;
  merchantId: string;
  referrerSessionId: string;
  referrerDeviceFingerprint: string;
  claimerSessionId: string;
  claimerDeviceFingerprint: string;
  causalInvite: CausalInviteRecord;
  challengeHash: string;
  customerSignature: string;
  staffSignature: string;
  manualReceiptId?: string;
  claimId: string;
  redeemCodeId: string;
  receipt: {
    receiptIdHash: string;
    campaignNullifierHash: string;
    inviteHash: string;
    visitAttestationHash: string;
    receiptPda: string;
    txSignature: string;
  };
}) {
  const expectedReferrerCommitment = createReferrerCommitment({
    campaignId: params.campaignId,
    referrerSessionId: params.referrerSessionId,
    deviceFingerprint: params.referrerDeviceFingerprint,
  });
  const expectedNullifier = createCampaignNullifier({
    campaignId: params.campaignId,
    claimerSessionId: params.claimerSessionId,
    deviceFingerprint: params.claimerDeviceFingerprint,
  });
  const expectedInviteHash = hashCausalInvite(params.causalInvite);
  const expectedVisitAttestationHash = sha256Hex(`${params.challengeHash}:${params.customerSignature}:${params.staffSignature}`);
  const expectedReceiptIdHash = sha256Hex(`${params.manualReceiptId || params.claimId}:${params.redeemCodeId}:${expectedVisitAttestationHash}`);
  const expectedReceiptPda = deriveReceiptPdaLike(expectedReceiptIdHash);
  const expectedTxSignature = deriveTxSignatureLike(expectedReceiptIdHash, expectedVisitAttestationHash);
  const checks = {
    inviteSignature: verifyCausalInvite(params.causalInvite),
    inviteCampaign: params.causalInvite.campaignId === params.campaignId,
    inviteMerchant: params.causalInvite.merchantId === params.merchantId,
    referrerCommitment: params.causalInvite.referrerCommitment === expectedReferrerCommitment,
    campaignNullifier: params.receipt.campaignNullifierHash === expectedNullifier,
    inviteHash: params.receipt.inviteHash === expectedInviteHash,
    visitAttestation: params.receipt.visitAttestationHash === expectedVisitAttestationHash,
    receiptId: params.receipt.receiptIdHash === expectedReceiptIdHash,
    receiptPda: params.receipt.receiptPda === expectedReceiptPda,
    txSignature: params.receipt.txSignature === expectedTxSignature,
  };

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    expected: {
      referrerCommitment: expectedReferrerCommitment,
      campaignNullifierHash: expectedNullifier,
      inviteHash: expectedInviteHash,
      visitAttestationHash: expectedVisitAttestationHash,
      receiptIdHash: expectedReceiptIdHash,
      receiptPda: expectedReceiptPda,
      txSignature: expectedTxSignature,
    },
  };
}
