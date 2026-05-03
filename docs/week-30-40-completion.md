# Week 30-40 Completion: Vault Close and Hosted Relayer Wiring

Week 30-40 moves the Causal Commerce demo from payout-only custody to a complete campaign lifecycle.

## Completed Scope

- Added the on-chain `close_growth_bounty` instruction.
- Reclaims unused SPL reward tokens from the PDA-owned reward vault back to the merchant reward account.
- Requires `reward_escrow.total_reserved == 0` before close, so unsettled receipts cannot be stranded.
- Closes the SPL reward vault token account after reclaim using the `RewardEscrow` PDA signer.
- Marks the `GrowthCampaign` as `Closed` and emits `GrowthBountyClosed`.
- Updated localnet smoke to run `--replay-check --close-check`.
- Updated the verifier to prove the vault account close and merchant reclaimed balance.
- Added hosted app relayer policy for the full Causal Commerce instruction set.
- Added `/api/launch/relayer/causal-commerce` for wallet-facing sponsored intent creation.

## Judge Demo Path

1. Start localnet with the deployed Viral Sync program.
2. Run `npm run localnet:smoke`.
3. Confirm the manifest shows:
   - reward vault funded during `fund_growth_bounty`
   - referrer and visitor token payouts during `settle_receipt_reward`
   - merchant token reclaim during `close_growth_bounty`
   - reward vault account state `closed`
4. Run `npm run localnet:proof-graph`.
5. Run `npm run localnet:evidence-report`.

## Hosted Relayer Contract

The hosted relayer path is now wired through the Next.js app.

The hosted app now exposes:

- `GET /api/launch/relayer/causal-commerce`
- `POST /api/launch/relayer/causal-commerce`

The POST endpoint accepts an action, wallet account, and named account map. It validates the action against the relayer policy, checks required accounts for each instruction, signs the intent payload, and returns a base64 transaction envelope for the wallet/relayer handoff.

Allowed Causal Commerce actions:

- `register_merchant`
- `create_growth_campaign`
- `fund_growth_bounty`
- `record_causal_receipt`
- `settle_receipt_reward`
- `close_growth_bounty`

## Remaining Mainnet Condition

This is localnet-complete and app-wired. Before uncapped mainnet use, the program and relayer should still receive external review, funded relayer key management, and production incident runbooks.
