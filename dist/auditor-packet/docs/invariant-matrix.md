# Viral Sync Invariant Matrix

## Receipt Requires Merchant

- ID: receipt-requires-merchant
- Why it matters: Prevents anonymous receipt creation
- Enforced by: merchant_authority signer + campaign has_one
- Tested by: merchant-only-receipt
- Proof evidence: fraud-gauntlet.json → merchant-only-receipt
- Status: PASS_ON_FRESH_PROOF

## Receipt Requires Terminal

- ID: receipt-requires-terminal
- Why it matters: Prevents merchant-only fake conversions
- Enforced by: terminal_authority signer + terminal_device PDA
- Tested by: wrong-terminal-signer
- Proof evidence: fraud-gauntlet.json → wrong-terminal-signer
- Status: PASS_ON_FRESH_PROOF

## Terminal Bound To Merchant

- ID: terminal-bound-to-merchant
- Why it matters: Prevents another shop terminal from attesting
- Enforced by: terminal_device.merchant_config equality
- Tested by: different-merchant-terminal
- Proof evidence: fraud-gauntlet.json → different-merchant-terminal
- Status: PASS_ON_FRESH_PROOF

## Terminal Signer Matches Account

- ID: terminal-signer-matches-account
- Why it matters: Prevents terminal identity spoofing
- Enforced by: terminal_device.terminal_authority equality
- Tested by: terminal-account-signer-mismatch
- Proof evidence: fraud-gauntlet.json → terminal-account-signer-mismatch
- Status: PASS_ON_FRESH_PROOF

## Visitor Signs Receipt

- ID: visitor-signs-receipt
- Why it matters: Prevents staff redeeming for visitor
- Enforced by: visitor_authority signer
- Tested by: visitor-signer-mismatch
- Proof evidence: fraud-gauntlet.json → visitor-signer-mismatch
- Status: PASS_ON_FRESH_PROOF

## Visitor Beneficiary Bound

- ID: visitor-beneficiary-bound
- Why it matters: Prevents payout redirect
- Enforced by: visitor signer equals visitor beneficiary
- Tested by: visitor-beneficiary-mismatch
- Proof evidence: fraud-gauntlet.json → visitor-beneficiary-mismatch
- Status: PASS_ON_FRESH_PROOF

## Claim Pass Single Use

- ID: claim-pass-single-use
- Why it matters: Prevents screenshot/code reuse
- Enforced by: claim_pass.status transition
- Tested by: claim-pass-reused
- Proof evidence: fraud-gauntlet.json → claim-pass-reused
- Status: PASS_ON_FRESH_PROOF

## Claim Pass Campaign Bound

- ID: claim-pass-campaign-bound
- Why it matters: Prevents cross-campaign coupon reuse
- Enforced by: claim_pass.campaign equality
- Tested by: claim-pass-campaign-mismatch
- Proof evidence: fraud-gauntlet.json → claim-pass-campaign-mismatch
- Status: PASS_ON_FRESH_PROOF

## Max Depth Enforced

- ID: max-depth-enforced
- Why it matters: Caps referral tree risk
- Enforced by: claim_pass.depth <= campaign.max_depth
- Tested by: claim-pass-depth-exceeds-max-depth
- Proof evidence: fraud-gauntlet.json → claim-pass-depth-exceeds-max-depth
- Status: PASS_ON_FRESH_PROOF

## Nullifier Exact Once

- ID: nullifier-exact-once
- Why it matters: Prevents duplicate receipt record
- Enforced by: campaign_nullifier PDA init
- Tested by: duplicate-nullifier
- Proof evidence: fraud-gauntlet.json → duplicate-nullifier
- Status: PASS_ON_FRESH_PROOF

## Reward Cap Enforced

- ID: reward-cap-enforced
- Why it matters: Prevents campaign overfund/overpay
- Enforced by: total_funded <= max_capacity + manifest reward cap
- Tested by: inflated-reward-amount
- Proof evidence: fraud-gauntlet.json → inflated-reward-amount
- Status: PASS_ON_FRESH_PROOF

## Reward Mint Bound

- ID: reward-mint-bound
- Why it matters: Prevents fake reward mint
- Enforced by: reward_mint equals campaign.reward_mint
- Tested by: wrong-reward-mint
- Proof evidence: fraud-gauntlet.json → wrong-reward-mint
- Status: PASS_ON_FRESH_PROOF

## Vault Bound To Escrow

- ID: vault-bound-to-escrow
- Why it matters: Prevents vault substitution
- Enforced by: reward_escrow.reward_vault equality
- Tested by: wrong-reward-vault
- Proof evidence: fraud-gauntlet.json → wrong-reward-vault
- Status: PASS_ON_FRESH_PROOF

## Settlement Exact Once

- ID: settlement-exact-once
- Why it matters: Prevents double payout
- Enforced by: settlement PDA init per receipt
- Tested by: settlement-replay
- Proof evidence: fraud-gauntlet.json → settlement-replay
- Status: PASS_ON_FRESH_PROOF

## Campaign Active Window

- ID: campaign-active-window
- Why it matters: Blocks stale campaigns
- Enforced by: campaign status + starts/expires checks
- Tested by: paused-or-expired-campaign
- Proof evidence: fraud-gauntlet.json → paused-or-expired-campaign
- Status: PASS_ON_FRESH_PROOF

## Intent Hash Committed

- ID: intent-hash-committed
- Why it matters: Binds human intent to receipt
- Enforced by: receipt.intent_manifest_hash stored
- Tested by: verifier
- Proof evidence: verifier JSON intent hash check
- Status: PASS_ON_FRESH_PROOF

## Receipt Status Settled

- ID: receipt-status-settled
- Why it matters: Shows finality of payout
- Enforced by: receipt.status + settlement record
- Tested by: verifier
- Proof evidence: verifier JSON receipt.status
- Status: PASS_ON_FRESH_PROOF

## Split Bps Enforced

- ID: split-bps-enforced
- Why it matters: Controls referrer/visitor payout split
- Enforced by: referrer_split_bps arithmetic
- Tested by: verifier
- Proof evidence: token balances 800/200 or configured split
- Status: PASS_ON_FRESH_PROOF

## Escrow Custody

- ID: escrow-custody
- Why it matters: Merchant cannot bypass payout path
- Enforced by: SPL vault owned by program PDA
- Tested by: verifier
- Proof evidence: rewardEscrow + rewardVault accounts
- Status: PASS_ON_FRESH_PROOF

## Proof Artifact Hashes

- ID: proof-artifact-hashes
- Why it matters: Makes proof machinery reproducible
- Enforced by: programSourceHash + idlHash + verifierHash
- Tested by: proof:schema
- Proof evidence: all proof artifacts
- Status: PASS_ON_FRESH_PROOF

## No Stale Final Artifacts

- ID: no-stale-final-artifacts
- Why it matters: Prevents stale proof submission
- Enforced by: frontier:assert-final
- Tested by: assert-no-stale-artifacts
- Proof evidence: no stale flags under app/public/proofs
- Status: PASS_ON_FRESH_PROOF
