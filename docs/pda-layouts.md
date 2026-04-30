# PDA Layouts

This file records the Day 8 seed and layout baseline for the Causal Commerce path.

## Implemented In This Pass

### CausalMerchantConfig

Seeds:

```text
["causal_merchant", merchant_authority, org_id_hash]
```

Fields:

```text
bump
merchant_authority
org_id_hash
allowed_staff_delegate_root
terminal_authority_root
status
created_at
updated_at
```

### GrowthCampaign

Seeds:

```text
["growth_campaign", causal_merchant_config, campaign_id_hash]
```

Fields:

```text
bump
merchant_config
merchant_authority
campaign_id_hash
reward_mint
reward_per_verified_visit
max_redemptions
max_depth
split_rules_hash
fraud_policy_hash
starts_at
expires_at
total_funded
total_settled
status
created_at
updated_at
```

### RewardEscrow

Seeds:

```text
["reward_escrow", growth_campaign, reward_mint]
```

Fields:

```text
bump
campaign
reward_mint
total_funded
total_reserved
total_settled
created_at
updated_at
```

### NullifierRecord

Seeds:

```text
["campaign_nullifier", growth_campaign, nullifier_hash]
```

Fields:

```text
bump
campaign
nullifier_hash
first_receipt
created_at
```

### CausalReceipt

Seeds:

```text
["causal_receipt", growth_campaign, receipt_id_hash]
```

Fields:

```text
bump
campaign
merchant_config
receipt_id_hash
parent_receipt_id_hash
referrer_commitment
claimer_nullifier_hash
invite_hash
visit_attestation_hash
risk_score_commitment
reward_amount
settled_amount
status
created_at
settled_at
```

### SettlementRecord

Seeds:

```text
["settlement", causal_receipt]
```

Fields:

```text
bump
receipt
campaign
referrer_amount
visitor_amount
settled_at
```

## Parity Rule

Every seed string added in Rust must have a matching TypeScript helper or test vector before public demo claims use it.
