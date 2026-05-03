# Week 20-30 Completion

This block upgrades the winning localnet path from escrow accounting to SPL Token custody and payout.

## Week 20 - Escrow Custody Scope

Completed:

- Promoted reward custody from a documented limitation to an implemented localnet requirement.
- `RewardEscrow` now records the SPL reward vault token account.
- The winning path now proves both account state and token balances.

## Week 21 - Fund Growth Bounty With SPL Transfer

Completed:

- `fund_growth_bounty` now requires:
  - merchant reward token account
  - reward vault associated token account
  - reward mint
  - SPL token program
  - associated token program
- Funding transfers SPL tokens from merchant token account into the reward vault using `transfer_checked`.
- Funding still updates campaign/escrow totals after the token CPI succeeds.

Evidence:

- [../programs/viral_sync/src/instructions/causal_commerce.rs](../programs/viral_sync/src/instructions/causal_commerce.rs)

## Week 22 - Settlement Pays Token Accounts

Completed:

- `settle_receipt_reward` now transfers SPL tokens out of the reward vault.
- Reward vault authority is the Reward Escrow PDA.
- Settlement uses PDA signer seeds and pays:
  - 80% to the referrer reward token account
  - 20% to the visitor reward token account
- Settlement state updates after CPI payout succeeds.

## Week 23 - Localnet Runner Token Setup

Completed:

- The localnet runner now creates a local SPL mint.
- It creates associated token accounts for:
  - merchant reward account
  - reward vault owned by the Reward Escrow PDA
  - referrer reward account
  - visitor reward account
- It mints the full bounty amount to the merchant reward account before funding.

Evidence:

- [../scripts/run-causal-commerce-localnet.ts](../scripts/run-causal-commerce-localnet.ts)

## Week 24 - Independent Token Verification

Completed:

- The verifier now fetches SPL token balances independently.
- It checks referrer token balance equals settlement referrer amount.
- It checks visitor token balance equals settlement visitor amount.
- It checks the escrow's recorded reward vault matches the manifest reward vault.

Evidence:

- [../scripts/verify-causal-receipt-localnet.ts](../scripts/verify-causal-receipt-localnet.ts)

## Week 25 - Real Smoke Result

Completed against `solana-test-validator`:

```text
merchant reward account: 10000 -> 0
reward vault: 0 -> 9000
referrer reward account: 0 -> 800
visitor reward account: 0 -> 200
verifier ok: true
```

Replay checks still pass:

- duplicate campaign nullifier rejected
- duplicate receipt settlement rejected

## Week 26 - Evidence Packet Upgrade

Completed:

- Localnet proof graph now includes SPL reward vault and payout token accounts.
- Localnet evidence report now includes token balance before/after table.
- The old “state-only escrow” limitation has been replaced with the narrower remaining limits: audit, vault reclaim/close flow, hosted relayer/wallet wiring.

Evidence:

- [localnet-proof-graph.md](localnet-proof-graph.md)
- [localnet-evidence-report.md](localnet-evidence-report.md)

## Week 27 - Regression Tests

Completed:

- Added tests that require custody accounts in the runner.
- Added tests that require verifier token balance checks.
- Added tests that require docs to show SPL custody instead of state-only escrow.

Evidence:

- [../tests/week-20-30-artifacts.spec.ts](../tests/week-20-30-artifacts.spec.ts)

## Week 28 - Stack Hardening

Completed:

- Boxed larger Anchor account wrappers in Causal Commerce contexts after the first custody build produced SBF stack-frame overflow warnings.
- `anchor build` now completes without those stack-frame overflow warnings.

## Week 29 - Updated Known Limits

Remaining limits:

- No external audit.
- No vault close/reclaim instruction yet.
- Hosted app still needs wallet/relayer wiring for live UI submission.
- Mainnet remains blocked until security and operational gates are complete.

## Week 30 - Status

Week 20-30 is complete for localnet: the golden path now moves real SPL tokens into a reward vault, records and settles a Causal Receipt, pays referrer/visitor token accounts, rejects replay, and independently verifies state plus balances.

