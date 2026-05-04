import type { NormalizedReceiptProof } from './types';
import { shortHash, signatureValue } from './links';

export function receiptRows(proof: NormalizedReceiptProof) {
  return [
    ['Customer showed up', proof.verifier.visitorVerified ? 'Verified' : 'Pending'],
    ['Counter terminal signed', proof.verifier.terminalVerified ? 'Verified' : 'Pending'],
    ['Visitor wallet signed', proof.verifier.visitorVerified ? 'Verified' : 'Pending'],
    ['Reward settled', proof.rewardAmountLabel],
    ['Replay protection', proof.verifier.nullifierVerified ? 'Active' : 'Pending'],
  ] as const;
}

export function receiptBackRows(proof: NormalizedReceiptProof) {
  const signatures = proof.manifest.signatures ?? {};
  return [
    ['Receipt PDA', shortHash(proof.manifest.pdas?.causalReceipt)],
    ['Nullifier PDA', shortHash(proof.manifest.pdas?.nullifierRecord)],
    ['Settlement PDA', shortHash(proof.manifest.pdas?.settlementRecord)],
    ['Record TX', shortHash(signatureValue(signatures.recordCausalReceipt))],
    ['Settle TX', shortHash(signatureValue(signatures.settleReceiptReward))],
    ['Intent hash', shortHash(proof.manifest.hashes?.intentManifestHash)],
  ] as const;
}

export function receiptMatches(proof: NormalizedReceiptProof, id: string) {
  if (id === 'latest') return true;
  const normalized = decodeURIComponent(id).toLowerCase();
  return [
    proof.receiptId,
    proof.manifest.pdas?.causalReceipt,
    proof.manifest.hashes?.receiptIdHash,
  ].some((value) => String(value ?? '').toLowerCase() === normalized);
}
