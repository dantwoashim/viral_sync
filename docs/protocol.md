# Viral Sync Protocol v0

Viral Sync is the Causal Commerce Protocol for Solana: it proves when word-of-mouth causes real-world visits and settles rewards from merchant-funded escrow.

## Core Primitive

A Causal Receipt is a Solana-verifiable proof that a referral path caused a real merchant-confirmed visit and triggered reward settlement without exposing the customer's private identity.

## Terms

| Term | Definition |
|---|---|
| Growth Bounty | A merchant-funded campaign escrow that promises payment for verified visits. |
| Causal Invite | A signed referral capability that creates a verifiable causal path into a campaign. |
| Campaign Nullifier | A privacy-preserving uniqueness hash for a claimant inside one campaign. |
| Dual-Attested Visit | A one-time physical challenge signed by both customer device and merchant/staff terminal. |
| Causal Receipt | The on-chain proof tying referral path, merchant attestation, and settlement state. |
| Causal Graph | The graph of verified referral-to-visit edges. |

## Lifecycle

1. Merchant registers an authority and org commitment.
2. Merchant creates a Growth Bounty with reward, cap, expiry, split policy, and fraud policy commitments.
3. Customer creates a Causal Invite.
4. Friend claims the invite with a campaign nullifier.
5. Merchant terminal emits a one-time visit challenge.
6. Customer device signs the challenge.
7. Staff terminal signs the same challenge.
8. Backend verifies both attestations, fraud policy, budget, and uniqueness.
9. Solana records a Causal Receipt.
10. Rewards settle from merchant-funded escrow.

## Privacy Rules

- Do not store names, emails, phone numbers, raw device IDs, or receipt photos on-chain.
- Store only commitments, hashes, public campaign metadata, and settlement state on-chain.
- Keep raw session identity and fraud signals in the server-side product database.
- Use campaign nullifiers to prevent duplicate claims without exposing customer identity.

## Growth Bounty Account

```rust
pub struct GrowthCampaign {
    pub merchant_config: Pubkey,
    pub merchant_authority: Pubkey,
    pub campaign_id_hash: [u8; 32],
    pub reward_mint: Pubkey,
    pub reward_per_verified_visit: u64,
    pub max_redemptions: u32,
    pub max_depth: u8,
    pub split_rules_hash: [u8; 32],
    pub fraud_policy_hash: [u8; 32],
    pub starts_at: i64,
    pub expires_at: i64,
    pub total_funded: u64,
    pub total_settled: u64,
    pub status: CampaignStatus,
    pub bump: u8,
}
```

## Causal Invite Shape

```ts
export type CausalInvite = {
  version: '0.1';
  campaignId: string;
  merchantId: string;
  referrerCommitment: string;
  parentReceiptId?: string;
  inviteNonce: string;
  expiresAt: number;
  signature: string;
};
```

Validation rules:

- Campaign must be live.
- Invite must not be expired.
- Referrer session must be valid.
- Parent receipt, when present, must belong to the same campaign family.
- Invite signature must match the expected signer.
- Invite token must map to an internal database row.

## Dual-Attested Visit

The merchant terminal creates a one-time challenge commitment:

```ts
visitChallenge = sha256(JSON.stringify({
  version: 'visit-challenge-v1',
  merchantId,
  locationId,
  terminalId,
  campaignId,
  claimId,
  issuedAt,
  expiresAt,
  nonce
}));
```

The customer signs the challenge with a session or wallet key. The staff terminal signs the same challenge with an enrolled merchant device key. The backend rejects expired, consumed, mismatched, unauthenticated, or high-risk challenges before submitting a receipt transaction.

## PDA Seeds

| Account | Seeds |
|---|---|
| Causal merchant config | `["causal_merchant", merchant_authority, org_id_hash]` |
| Growth campaign | `["growth_campaign", merchant_config, campaign_id_hash]` |
| Future nullifier record | `["campaign_nullifier", campaign, nullifier_hash]` |
| Future causal receipt | `["causal_receipt", campaign, receipt_id_hash]` |
| Future settlement record | `["settlement", receipt]` |

## Settlement Rules

Minimum Frontier path:

```text
Direct referrer: 80%
Visitor reward: 20%
```

Invariants:

- Settlement must never exceed escrow remaining.
- Settlement must be idempotent.
- Duplicate receipts cannot settle twice.
- High-risk receipts can be held for review.
- Closed campaigns can reclaim unused funds only through explicit campaign close flow.

## Current Implementation Status

Day 1-20 implements the spec, documentation, demo honesty patches, merchant confirmation gate, merchant registration, Growth Campaigns, state-only Growth Bounty funding, nullifier records, Causal Receipt records, state-only receipt settlement, signed Causal Invites, server-side claim nullifiers, one-time visit challenges, demo customer/staff challenge signatures, and product receipt metadata storage.

Current limitation: the product stores a deterministic receipt PDA/transaction reference for the demo path while the Anchor instructions now expose the account model for on-chain proof. Full live transaction submission from the hosted app is still pending relayer/wallet wiring and devnet funding tests.
