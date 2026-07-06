export type CivicEvidenceStatus = 'verified_devnet' | 'phase_one_specified' | 'not_integrated';

export type CivicProofBoundary = {
  proven: string[];
  notProven: string[];
  requiredForProduction: string[];
};

export type CivicSignal = {
  id: string;
  label: string;
  value: string;
  direction: 'higher' | 'lower' | 'stable';
  source: string;
};

export type CivicOutcome = {
  id: string;
  label: string;
  target: string;
  current: string;
  resolutionRule: string;
  verificationStatus: CivicEvidenceStatus;
};

export type CivicSponsorPool = {
  sponsorLabel: string;
  assetLabel: string;
  availableLabel: string;
  actionRewardLabel: string;
  releaseRule: string;
  custodyStatus: CivicEvidenceStatus;
};

export type ConvictionCreditAllocation = {
  repairLikely: number;
  repairDelayed: number;
  transferable: false;
  cashValue: '0';
};

export type ConvictionChoice = 'repair_likely' | 'repair_delayed' | 'abstain';

export type CivicConvictionSignalCommitment = {
  ok: true;
  type: 'civic_conviction_signal';
  version: 1;
  status: 'signed_app_artifact';
  marketSlug: string;
  choice: ConvictionChoice;
  creditsCommitted: number;
  creditCap: number;
  confidenceBps: number;
  signalHash: string;
  participantCommitment: string;
  participantAuthority: string;
  growthCampaign: string;
  convictionSignalPda: string;
  convictionSignalBump: number;
  duplicatePrevention: {
    method: 'conviction_signal_pda_init';
    seedPrefix: 'conviction_signal';
    scope: 'one_signal_per_campaign_participant_and_signal_hash';
  };
  transfer: {
    transferable: false;
    tokenMint: null;
    cashValue: '0';
  };
  settlement: {
    dependsOnConviction: false;
    dependsOnForecast: false;
    dependsOnReceipt: true;
    releaseCondition: string;
  };
  onChainInstruction: {
    name: 'commit_conviction_signal';
    implemented: true;
    deployedInCurrentDevnetProof: false;
  };
  signedAt: string;
  artifactToken: string;
};

export type CivicReceiptReference = {
  receiptId: string;
  receiptPda: string;
  nullifierPda: string;
  settlementPda: string;
  recordTx: string | null;
  settleTx: string | null;
};

export type CivicMarketEvidence = {
  cluster: string;
  programId: string;
  growthCampaignPda: string;
  receiptId: string;
  receiptPda: string;
  nullifierPda: string;
  settlementPda: string;
  recordTx: string | null;
  settleTx: string | null;
  gauntletLabel: string;
  verifierOk: boolean;
  artifactLinks: Array<{ label: string; href: string }>;
};

export type CivicMarket = {
  slug: string;
  title: string;
  locality: string;
  category: string;
  summary: string;
  question: string;
  statusLabel: string;
  phaseLabel: string;
  sourceDatasetLabel: string;
  signals: CivicSignal[];
  outcomes: CivicOutcome[];
  sponsorPool: CivicSponsorPool;
  evidence: CivicMarketEvidence;
  proofBoundary: CivicProofBoundary;
};

export type CivicParticipationPass = {
  ok: true;
  type: 'civic_participation_pass';
  version: 2;
  status: 'issued';
  marketSlug: string;
  actionLabel: string;
  participantLabel: string;
  participantCommitment: string;
  passId: string;
  passToken: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  verifierStation: string;
  verifierPath: string;
  receiptPath: string;
  replayProofPath: string;
  forecastCredits: ConvictionCreditAllocation;
  convictionSignal: CivicConvictionSignalCommitment | null;
  settlement: {
    dependsOnForecast: false;
    releaseCondition: string;
  };
  receipt: CivicReceiptReference;
  boundary: CivicProofBoundary;
};

export type CivicPassVerification = {
  ok: boolean;
  status: 'verified' | 'rejected';
  reason: string;
  marketSlug?: string;
  passId?: string;
  participantCommitment?: string;
  receiptPath?: string;
  ledgerPath?: string;
  replayProofPath?: string;
  receipt?: CivicReceiptReference;
  forecastCredits?: ConvictionCreditAllocation;
  settlement?: {
    dependsOnForecast: false;
    releaseCondition: string;
  };
};

export type CivicReplayProof = {
  ok: true;
  status: 'replay_rejected';
  reason: string;
  marketSlug: string;
  passId?: string;
  nullifierPda: string;
  sourceArtifact: string;
  negativePathCases: string;
  settlementDependsOnForecast: false;
};
