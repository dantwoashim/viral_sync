import { gauntletLabel, getProofState } from '../proof/getProofState';
import { signatureValue } from '../proof/links';
import { defaultProductLoopCampaign } from '../product-loop/productLoop';
import { civicArtifactHref, civicSourceArtifacts } from './civicProof';
import {
  WARD_12_MARKET_SLUG,
  ward12Outcomes,
  ward12Signals,
  ward12SponsorPool,
} from './fixtures/ward12-water-repair';
import type { CivicMarket, CivicProofBoundary } from './types';

export const civicProofBoundary: CivicProofBoundary = {
  proven: [
    'A devnet Solana program can record a counter-attested receipt.',
    'The current proof artifact includes custody, nullifier, settlement, and negative-path evidence.',
    'The verifier artifact can independently check the published manifest fields.',
  ],
  notProven: [
    'The Ward 12 issue dataset is not yet an official public data integration.',
    'Identity privacy adapters are specified but not live.',
    'Physical-world repair completion still needs a trusted oracle or permitted verifier.',
  ],
  requiredForProduction: [
    'Permissioned civic data feed or field-verifier integration.',
    'Persistent pass storage with atomic consume semantics.',
    'External security review before real-value mainnet deployment.',
  ],
};

export function getFeaturedCivicMarket(): CivicMarket {
  const proof = getProofState();
  const productCampaign = defaultProductLoopCampaign();
  const manifest = proof.manifest;
  const verifier = proof.verifier;

  return {
    slug: WARD_12_MARKET_SLUG,
    title: 'Ward 12 Water Repair Signal',
    locality: 'Kathmandu Ward 12',
    category: 'Civic infrastructure',
    summary:
      'Forecast the repair outcome, fund useful civic actions, and settle participation receipts on Solana only after counter-attestation.',
    question: 'Will the reported water repair reach verified dispatch within the target window?',
    statusLabel: proof.health === 'verified' ? 'Devnet receipt verified' : 'Needs proof review',
    phaseLabel: 'Proof-ready civic prototype',
    sourceDatasetLabel: 'Fixture dataset, not a public authority data source',
    signals: ward12Signals,
    outcomes: ward12Outcomes,
    sponsorPool: {
      ...ward12SponsorPool,
      availableLabel: productCampaign?.rewardPoolRemainingLabel ?? ward12SponsorPool.availableLabel,
      actionRewardLabel: productCampaign?.visitorRewardLabel ?? ward12SponsorPool.actionRewardLabel,
    },
    evidence: {
      cluster: proof.cluster,
      programId: proof.programId,
      growthCampaignPda: String(manifest.pdas?.growthCampaign ?? ''),
      receiptId: proof.receiptId,
      receiptPda: String(manifest.pdas?.causalReceipt ?? ''),
      nullifierPda: String(manifest.pdas?.nullifierRecord ?? ''),
      settlementPda: String(manifest.pdas?.settlementRecord ?? ''),
      recordTx: signatureValue(manifest.signatures?.recordCausalReceipt),
      settleTx: signatureValue(manifest.signatures?.settleReceiptReward),
      gauntletLabel: gauntletLabel(proof.gauntlet),
      verifierOk:
        verifier.ok === true &&
        verifier.terminalVerified === true &&
        verifier.visitorVerified === true &&
        verifier.nullifierVerified === true &&
        verifier.settlementVerified === true,
      artifactLinks: [
        { label: 'Civic market packet', href: civicArtifactHref('civic-market-ward12-water-repair.json') },
        { label: 'Civic ledger', href: civicArtifactHref('civic-ledger.json') },
        { label: 'Receipt adapter', href: civicArtifactHref('civic-receipt-latest.json') },
        { label: 'Civic proof sidecar', href: civicArtifactHref('civic-proof-sidecar.json') },
        ...civicSourceArtifacts.map((artifact) => ({
          label: artifact.id,
          href: civicArtifactHref(artifact.file),
        })),
      ],
    },
    proofBoundary: civicProofBoundary,
  };
}

export function getCivicMarket(slug: string) {
  return slug === WARD_12_MARKET_SLUG ? getFeaturedCivicMarket() : null;
}

export function getCivicMarkets() {
  return [getFeaturedCivicMarket()];
}
