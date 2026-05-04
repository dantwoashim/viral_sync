import { loadProofSidecar } from '../proof/loadArtifacts';
import type { NormalizedReceiptProof } from '../proof/types';

export type EvidenceSlot = {
  id: string;
  status: 'empty' | 'submitted' | 'verified' | 'rejected' | string;
  requiredForClaimingTraction?: boolean;
  prompt?: string;
};

export type MerchantValidationKit = {
  type?: string;
  version?: string;
  generatedAt?: string;
  validationStatus?: string;
  merchantAlias?: string;
  rules?: string[];
  interviewScript?: string[];
  evidenceSlots?: EvidenceSlot[];
  safeSubmissionWording?: string;
  validationKitHash?: string;
};

export type MerchantValidationState = {
  artifactType: 'viral_sync_merchant_validation_context';
  merchantAlias: string;
  technicalProofVerified: boolean;
  tractionClaimAllowed: boolean;
  claimStatus: 'not_claimed' | 'claimable' | 'review_required';
  evidenceSummary: {
    totalSlots: number;
    filledSlots: number;
    verifiedSlots: number;
    requiredSlots: number;
    requiredVerifiedSlots: number;
    missingRequiredSlots: string[];
  };
  safeSubmissionWording: string;
  rules: string[];
  nextActions: string[];
  interviewScript: string[];
  evidenceSlots: EvidenceSlot[];
  validationKitHash?: string;
};

const fallbackKit: MerchantValidationKit = {
  validationStatus: 'not_claimed_until_real_merchant_evidence_is_added',
  merchantAlias: 'Verified merchant',
  rules: [
    'Do not claim live merchant traction unless evidence slots are filled with real permissioned evidence.',
  ],
  evidenceSlots: [],
  safeSubmissionWording: 'Technical proof is verified separately from merchant traction. Do not claim live traction until permissioned evidence exists.',
};

export function loadMerchantValidationKit() {
  return loadProofSidecar<MerchantValidationKit>('merchant-validation-kit.json', fallbackKit);
}

function filled(slot: EvidenceSlot) {
  return slot.status !== 'empty' && slot.status !== 'missing' && slot.status !== 'rejected';
}

function verified(slot: EvidenceSlot) {
  return slot.status === 'verified';
}

export function normalizeMerchantValidation(kit: MerchantValidationKit, proof?: NormalizedReceiptProof): MerchantValidationState {
  const slots = kit.evidenceSlots ?? [];
  const required = slots.filter((slot) => slot.requiredForClaimingTraction === true);
  const missingRequiredSlots = required.filter((slot) => !verified(slot)).map((slot) => slot.id);
  const requiredVerifiedSlots = required.filter(verified).length;
  const tractionClaimAllowed = required.length > 0 && requiredVerifiedSlots === required.length;
  const statusText = String(kit.validationStatus ?? '').toLowerCase();
  const claimStatus = tractionClaimAllowed
    ? 'claimable'
    : statusText.includes('not_claimed') || missingRequiredSlots.length > 0
      ? 'not_claimed'
      : 'review_required';

  const nextActions = slots
    .filter((slot) => slot.requiredForClaimingTraction === true && !verified(slot))
    .map((slot) => slot.prompt ? `${slot.id}: ${slot.prompt}` : slot.id);

  return {
    artifactType: 'viral_sync_merchant_validation_context',
    merchantAlias: kit.merchantAlias ?? proof?.merchantName ?? 'Verified merchant',
    technicalProofVerified: proof?.health === 'verified',
    tractionClaimAllowed,
    claimStatus,
    evidenceSummary: {
      totalSlots: slots.length,
      filledSlots: slots.filter(filled).length,
      verifiedSlots: slots.filter(verified).length,
      requiredSlots: required.length,
      requiredVerifiedSlots,
      missingRequiredSlots,
    },
    safeSubmissionWording: kit.safeSubmissionWording ?? fallbackKit.safeSubmissionWording!,
    rules: kit.rules ?? fallbackKit.rules!,
    nextActions,
    interviewScript: kit.interviewScript ?? [],
    evidenceSlots: slots,
    validationKitHash: kit.validationKitHash,
  };
}

export function getMerchantValidationState(proof?: NormalizedReceiptProof) {
  return normalizeMerchantValidation(loadMerchantValidationKit(), proof);
}
