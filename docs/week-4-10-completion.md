# Week 4-10 Completion

This completes the next block of the zero-budget winning plan by turning the Causal Commerce program instructions into a judge-runnable localnet path.

## Week 4 - Create Growth Bounty

Completed:

- Added a localnet runner that derives the Growth Campaign PDA from `["growth_campaign", merchant_config, campaign_id_hash]`.
- The runner creates or reuses the Causal Merchant config, creates a reward mint when one is not supplied, and submits `create_growth_campaign`.
- The campaign uses explicit reward, cap, depth, split-rule commitment, fraud-policy commitment, start time, and expiry.

Evidence:

- [../scripts/run-causal-commerce-localnet.ts](../scripts/run-causal-commerce-localnet.ts)
- `npm run localnet:causal-commerce -- --help`

## Week 5 - Fund Reward Escrow State

Completed:

- The runner derives the Reward Escrow PDA from `["reward_escrow", growth_campaign, reward_mint]`.
- The runner submits `fund_growth_bounty` with a bounded amount that defaults to `reward_per_visit * max_redemptions`.
- The output manifest records the escrow PDA, funding transaction signature, and fetched escrow state.

Important limitation:

- Current `fund_growth_bounty` is protocol escrow accounting, not SPL vault custody. It updates `RewardEscrow.total_funded` and campaign totals, but it does not transfer tokens into a vault account yet.

Evidence:

- [../programs/viral_sync/src/instructions/causal_commerce.rs](../programs/viral_sync/src/instructions/causal_commerce.rs)
- [../scripts/run-causal-commerce-localnet.ts](../scripts/run-causal-commerce-localnet.ts)

## Week 6 - Record Causal Receipt

Completed:

- The runner creates deterministic commitments for receipt id, parent receipt, referrer, claimer nullifier, invite, visit attestation, and risk score.
- The runner derives the Causal Receipt PDA from `["causal_receipt", growth_campaign, receipt_id_hash]`.
- The runner derives the Nullifier Record PDA from `["campaign_nullifier", growth_campaign, claimer_nullifier_hash]`.
- The runner submits `record_causal_receipt` and fetches the receipt/nullifier accounts into the manifest.

Evidence:

- `recordCausalReceipt` call in [../scripts/run-causal-commerce-localnet.ts](../scripts/run-causal-commerce-localnet.ts)

## Week 7 - Settle Reward And Prove Replay Rejection

Completed:

- The runner derives the Settlement Record PDA from `["settlement", causal_receipt]`.
- The runner submits `settle_receipt_reward`.
- With `--replay-check`, the runner requires duplicate nullifier replay and duplicate settlement replay to fail.
- The output manifest records the settlement transaction signature and fetched settlement state.

Evidence:

- `npm run localnet:causal-commerce -- --replay-check`

## Week 8 - Independent Receipt Verifier

Completed:

- Added a separate verifier script that can read the runner manifest or a receipt PDA directly.
- The verifier fetches receipt, campaign, reward escrow, settlement record, and nullifier record accounts.
- The verifier checks campaign consistency, escrow mint consistency, nullifier first receipt, settlement split math, settled status, settled amount, and escrow settled total.

Evidence:

- [../scripts/verify-causal-receipt-localnet.ts](../scripts/verify-causal-receipt-localnet.ts)
- `npm run localnet:verify-receipt -- --help`

## Week 9 - Fresh-Clone Golden Path

Completed:

- Added package commands for the golden localnet path and verifier.
- The runner writes a JSON manifest to `tmp/localnet-causal-commerce.json` by default.
- The manifest includes the follow-up verifier command so a judge can verify without trusting the runner output.

Commands:

```bash
npm ci
npm run build:program
npm run localnet:causal-commerce -- --replay-check
npm run localnet:verify-receipt -- --manifest tmp/localnet-causal-commerce.json
```

Environment requirement:

- A running local validator with the Viral Sync program deployed at `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46`.

## Week 10 - Hardening Baseline

Completed:

- Scripts typecheck independently under the repo's strict TypeScript settings.
- CLI help works for both commands.
- `npm run verify` remains green after the week 4-10 changes.
- The limitation around state-only escrow accounting is explicitly documented in the runner manifest and this completion note.

Verification:

```bash
npm run verify
npx tsc --noEmit --target ES2022 --lib ES2022 --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck --resolveJsonModule scripts/run-causal-commerce-localnet.ts
npx tsc --noEmit --target ES2022 --lib ES2022 --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck --resolveJsonModule scripts/verify-causal-receipt-localnet.ts
npm run localnet:causal-commerce -- --help
npm run localnet:verify-receipt -- --help
```

