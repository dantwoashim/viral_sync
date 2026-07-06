import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { getProofState } from '../proof/getProofState';
import { explorerAddress, explorerTx, signatureValue } from '../proof/links';

export const civicSourceArtifacts = [
  {
    id: 'manifest',
    file: 'devnet-causal-commerce.json',
    sha256: '873ef287fb0ec69b1eb10059fedaceb6cab5af5dbcb70763da4d8540636dad9c',
  },
  {
    id: 'verifier',
    file: 'devnet-causal-commerce-verifier.json',
    sha256: '737e137a476b9c41ab34ccbfaa26325b39c333e473986d0d8f007042406b9b11',
  },
  {
    id: 'negative-paths',
    file: 'fraud-gauntlet.json',
    sha256: '0046696c18ccfa12f79fb7a1db18cfefcc595c3403ca4560589c7f0ab8055c16',
  },
  {
    id: 'readiness',
    file: 'frontier-readiness.json',
    sha256: '2d495b6a62db3c1a0ca287484d423eb7b89c01321edaa9738cc8da7da06f341f',
  },
  {
    id: 'proof-feed',
    file: 'proof-feed.json',
    sha256: 'f96cb5bee0959f0fedb94e32f8e2b71ed595f7888e95844c7b7f3c50e8049147',
  },
] as const;

export function civicArtifactHref(file: string) {
  return `/proofs/${file}`;
}

export function currentArtifactHash(file: string) {
  const absolute = path.join(process.cwd(), 'public', 'proofs', file);
  return createHash('sha256').update(readFileSync(absolute)).digest('hex');
}

export function civicExplorerLinks() {
  const proof = getProofState();
  const recordTx = signatureValue(proof.manifest.signatures?.recordCausalReceipt);
  const settleTx = signatureValue(proof.manifest.signatures?.settleReceiptReward);
  return {
    program: explorerAddress(proof.programId, proof.cluster),
    receipt: explorerAddress(proof.manifest.pdas?.causalReceipt, proof.cluster),
    nullifier: explorerAddress(proof.manifest.pdas?.nullifierRecord, proof.cluster),
    settlement: explorerAddress(proof.manifest.pdas?.settlementRecord, proof.cluster),
    recordTx: explorerTx(recordTx, proof.cluster),
    settleTx: explorerTx(settleTx, proof.cluster),
  };
}
