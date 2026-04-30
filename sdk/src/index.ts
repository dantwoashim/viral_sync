export type ReceiptVerificationStatus = 'verified' | 'pending' | 'failed' | 'not_found';

export interface ReceiptVerification {
  ok: boolean;
  status: ReceiptVerificationStatus;
  receiptId: string;
  receiptPda?: string;
  settlementStatus?: string;
  txSignature?: string;
  compressedProof?: {
    root: string;
    leaf: string;
    leafIndex: number;
    treeId: string;
    siblings: string[];
  };
  reason?: string;
}

export interface CausalGraphPayload {
  nodes: Array<{ id: string; label: string; kind: string; privateLabel?: boolean }>;
  edges: Array<{ source: string; target: string; label: string }>;
}

export interface InviteAction {
  label: string;
  href: string;
  type: 'post';
}

export function verifyReceipt(payload: ReceiptVerification): boolean {
  return payload.ok &&
    payload.status === 'verified' &&
    Boolean(payload.receiptPda) &&
    Boolean(payload.txSignature) &&
    payload.settlementStatus === 'settled';
}

export async function fetchGraph(baseUrl: string, fetcher: typeof fetch = fetch): Promise<CausalGraphPayload> {
  const response = await fetcher(new URL('/api/launch/causal-graph', baseUrl));
  if (!response.ok) {
    throw new Error(`Graph fetch failed: ${response.status}`);
  }
  return response.json() as Promise<CausalGraphPayload>;
}

export function buildInviteAction(baseUrl: string, token: string): InviteAction {
  return {
    label: 'Claim Viral Sync offer',
    href: new URL(`/offer/${encodeURIComponent(token)}`, baseUrl).toString(),
    type: 'post',
  };
}

export function deriveReceiptSeed(campaignId: string, receiptIdHash: string) {
  return ['causal_receipt', campaignId, receiptIdHash] as const;
}

export function deriveCampaignPdaSeed(merchantConfig: string, campaignIdHash: string) {
  return ['growth_campaign', merchantConfig, campaignIdHash] as const;
}

export function deriveNullifierSeed(campaign: string, nullifierHash: string) {
  return ['campaign_nullifier', campaign, nullifierHash] as const;
}

export function isValidWebhookSignature(params: { payload: string; signature: string; expectedSignature: string }) {
  return params.signature.length > 0 && params.signature === params.expectedSignature;
}
