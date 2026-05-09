export type ProductLoopCheck = {
  label: string;
  ok: boolean;
  source: 'proof_manifest' | 'verifier_artifact' | 'fraud_gauntlet' | 'terminal_request' | 'pass_lifecycle';
  detail: string;
};

export type ProductLoopCampaign = {
  slug: string;
  title: string;
  merchantAlias: string;
  category: string;
  status: string;
  proofBacked: boolean;
  proofLevel: string;
  attestationModel: string;
  rewardLabel: string;
  visitorRewardLabel: string;
  routerRewardLabel: string;
  protocolFeeLabel: string;
  rewardPoolRemainingLabel: string;
  maxRedemptions: number | null;
  settledCount: number;
  publicPath: string;
  claimPath: string;
  receiptPath: string;
  proofPath: string;
  actionApiPath: string;
  receiptPda: string;
  claimPassPda: string;
  terminalDevicePda: string;
  recordTx: string | null;
  settleTx: string | null;
  expiresAt: string | null;
};

export type VisitPassPacket = {
  ok: true;
  type: 'viral_sync_visit_pass';
  status: 'issued';
  campaign: ProductLoopCampaign;
  token: string;
  passId: string;
  nonce: string;
  mode: 'demo_replay' | 'pilot_server_issued' | 'on_chain_claim_pass';
  passCode: string;
  passMac: string;
  qrPayload: string;
  issuedAt: string;
  expiresAt: string | null;
  checks: ProductLoopCheck[];
};

export type TerminalConfirmation = {
  ok: boolean;
  type: 'viral_sync_terminal_confirmation';
  status: 'verified' | 'rejected';
  reason: string;
  passCode: string;
  passId?: string;
  mode?: 'demo_replay' | 'pilot_server_issued' | 'on_chain_claim_pass';
  campaign: ProductLoopCampaign;
  receiptPath: string;
  receiptPda: string;
  recordTx: string | null;
  settleTx: string | null;
  checks: ProductLoopCheck[];
};
