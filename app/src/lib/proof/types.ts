export type ProofSignature = string | null | { signature?: string | null; reused?: boolean };

export type ProofManifest = {
  kind?: string;
  cluster?: string;
  proofStatus?: string | null;
  proofStatusNote?: string;
  generatedAt?: string;
  effectCheckedAt?: string;
  programId?: string;
  programSourceHash?: string | null;
  idlHash?: string | null;
  proofGeneratorHash?: string | null;
  verifierHash?: string | null;
  rawVerifierHash?: string | null;
  publishedVerifierHash?: string | null;
  wallet?: string;
  rewardMintSymbol?: string;
  rewardMintDecimals?: number;
  inputs?: {
    orgId?: string;
    campaignId?: string;
    receiptId?: string;
    rewardPerVisit?: string;
    maxRedemptions?: number;
    merchantAlias?: string;
  };
  hashes?: Record<string, string | undefined>;
  intentManifest?: {
    expiresAt?: string;
    expirySemantics?: string;
    rewardAmount?: number;
    referrerBeneficiary?: string;
    visitorBeneficiary?: string;
    terminalAuthority?: string;
    visitorAuthority?: string;
    lineageProofHash?: string;
    merchantAlias?: string;
  };
  pdas?: Record<string, string | number | undefined>;
  signatures?: Record<string, ProofSignature>;
  transactions?: Record<string, string | null | undefined>;
  accounts?: Record<string, unknown>;
  explorerLinks?: {
    transactions?: Record<string, string | null | undefined>;
    accounts?: Record<string, string | null | undefined>;
  };
  childLineageProof?: {
    depth?: number;
    parentReceipt?: string;
    childReceipt?: string;
    childClaimPass?: string;
    parentReceiptIdHash?: string;
    childReceiptIdHash?: string;
    childNullifierHash?: string;
    childLineageProofHash?: string;
    issueChildClaimPass?: string;
    recordChildCausalReceipt?: string;
    onChainParentReceiptVerified?: boolean;
  };
  attackEvidence?: FraudCase[];
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  settlementVerified?: boolean;
  nullifierVerified?: boolean;
  attestationModel?: string;
  proofLevel?: string;
  targetProofLevel?: string;
  targetAttestationModel?: string;
  limitation?: string;
};

export type VerifierArtifact = {
  ok?: boolean;
  terminalVerified?: boolean;
  visitorVerified?: boolean;
  lineageVerified?: boolean;
  settlementVerified?: boolean;
  nullifierVerified?: boolean;
  receipt?: { status?: unknown; settledAmount?: string };
  settlementRecord?: { referrerAmount?: string; visitorAmount?: string; protocolFee?: string };
  tokenBalances?: Record<string, string>;
  terminalChecks?: Record<string, boolean>;
  lineageChecks?: Record<string, boolean>;
  settlementChecks?: Record<string, boolean>;
  nullifierChecks?: Record<string, boolean>;
  tokenAccountChecks?: Record<string, boolean>;
};

export type FraudCase = {
  id: string;
  title?: string;
  attack?: string;
  expectedError?: string;
  expectedErrorCode?: string;
  actualError?: string;
  observed?: string;
  expected?: string;
  expectedErrorMatched?: boolean;
  accountsMutationVerified?: boolean;
  accountsMutated?: boolean;
  proofSource?: string;
  failureKind?: string;
  reason?: string;
};

export type FraudGauntlet = {
  proofStatus?: string;
  summary?: { blocked?: number; totalCases?: number; missing?: number; failed?: number };
  cases?: FraudCase[];
};

export type ProgramIdConsistency = {
  programIdConsistency?: {
    matches?: boolean;
    anchorToml?: string;
    declareId?: string;
    deployKeypair?: string | null;
  };
};

export type FrontierReadiness = {
  status?: string;
  hashesVerified?: boolean;
  hashFailures?: string[];
};

export type ProofHealth = 'verified' | 'stale' | 'mock' | 'pending' | 'missing' | 'failed';

export type NormalizedReceiptProof = {
  health: ProofHealth;
  statusLabel: string;
  receiptId: string;
  merchantName: string;
  cluster: string;
  programId: string;
  proofLevel: string;
  attestationModel: string;
  rewardAmountLabel: string;
  manifest: ProofManifest;
  verifier: VerifierArtifact;
  gauntlet: FraudGauntlet;
  programIdConsistency: ProgramIdConsistency;
  readiness: FrontierReadiness;
};
