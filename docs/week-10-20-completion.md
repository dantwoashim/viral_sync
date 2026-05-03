# Week 10-20 Completion

This block turns the localnet proof path into a repeatable judge evidence package and fixes the first real validator-discovered protocol bug.

## Week 10 - Real Local Validator Execution

Completed:

- Installed/used Agave `solana-test-validator` through WSL, the Solana-documented Windows development path.
- Started a local validator on `http://127.0.0.1:8899`.
- Loaded `target/deploy/viral_sync.so` at program id `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46`.
- Ran the localnet Causal Commerce path against real program accounts.

Evidence:

- `solana-cli 3.1.14`
- `solana-test-validator 3.1.14`
- `npm run localnet:smoke`

## Week 11 - Validator-Found Bug Fix

Completed:

- The first replay-check run exposed an Anchor seed constraint bug in `RecordCausalReceipt`.
- The account context was annotating only `receipt_id_hash` and `claimer_nullifier_hash`, but Anchor maps instruction arguments positionally. Because `parent_receipt_id_hash` is the second function argument, the nullifier PDA was being constrained against the parent hash instead of the claimer nullifier hash.
- Fixed the Rust account annotation to include the preceding instruction arguments before `claimer_nullifier_hash`.

Evidence:

- [../programs/viral_sync/src/instructions/causal_commerce.rs](../programs/viral_sync/src/instructions/causal_commerce.rs)
- Localnet rerun passed duplicate nullifier rejection after rebuild.

## Week 12 - Full Smoke Command

Completed:

- Added `npm run localnet:smoke`.
- The smoke command runs the golden localnet path with replay checks, then independently verifies the produced receipt.
- It writes:
  - `tmp/localnet-causal-commerce.json`
  - `tmp/localnet-causal-commerce-verifier.json`

Evidence:

- [../scripts/smoke-localnet-causal-commerce.ts](../scripts/smoke-localnet-causal-commerce.ts)

## Week 13 - Independent Verifier Output

Completed:

- Extended the verifier with `--output`.
- Verifier output includes `ok`, failures, receipt account, campaign, escrow, settlement, and nullifier state.
- This lets generated evidence docs depend on verifier results instead of trusting the runner.

Evidence:

- [../scripts/verify-causal-receipt-localnet.ts](../scripts/verify-causal-receipt-localnet.ts)

## Week 14 - Proof Graph Export

Completed:

- Added `npm run localnet:proof-graph`.
- The exporter reads the localnet manifest and writes a Mermaid proof graph.
- The graph shows the path from merchant authority to config, Growth Bounty, escrow state, invite/nullifier, visit attestation, receipt, and settlement record.

Evidence:

- [localnet-proof-graph.md](localnet-proof-graph.md)
- [../scripts/export-localnet-proof-graph.ts](../scripts/export-localnet-proof-graph.ts)

## Week 15 - Judge Evidence Report

Completed:

- Added `npm run localnet:evidence-report`.
- The report reads both manifest and verifier output.
- It summarizes verifier status, replay checks, inputs, proof accounts, settlement split, and known limitations.

Evidence:

- [localnet-evidence-report.md](localnet-evidence-report.md)
- [../scripts/write-localnet-evidence-report.ts](../scripts/write-localnet-evidence-report.ts)

## Week 16 - Replay And Settlement Hardening

Completed:

- The smoke path requires duplicate campaign nullifier rejection.
- The smoke path requires duplicate receipt settlement rejection.
- The independent verifier checks that settled amount equals reward amount and the settlement split adds up.

Evidence:

- `replayChecks` in `tmp/localnet-causal-commerce.json`
- `failures: []` in `tmp/localnet-causal-commerce-verifier.json`

## Week 17 - README/Reproducibility Update

Completed:

- README now points judges to the full localnet proof loop.
- Reproducibility docs now include validator startup, smoke, graph export, and evidence report commands.
- Docs index includes weeks 10-20 and generated evidence artifacts.

Evidence:

- [../README.md](../README.md)
- [reproducibility.md](reproducibility.md)
- [README.md](README.md)

## Week 18 - Regression Coverage

Completed:

- Added tests that require the week 10-20 commands to exist.
- Added tests that check the verifier can write output.
- Added tests that guard the `RecordCausalReceipt` instruction annotation against the positional-argument bug found on localnet.

Evidence:

- [../tests/week-10-20-artifacts.spec.ts](../tests/week-10-20-artifacts.spec.ts)

## Week 19 - Public Demo Evidence Packet

Completed:

- The judge-facing evidence packet now consists of:
  - `docs/winner-scope.md`
  - `docs/golden-demo-path.md`
  - `docs/localnet-proof-graph.md`
  - `docs/localnet-evidence-report.md`
  - `docs/week-10-20-completion.md`

## Week 20 - Current Status

Completed:

- Localnet validator path is now actually exercised, not just scripted.
- Full project verification passes after the program bug fix and week 10-20 tooling.

Still not complete for mainnet:

- `fund_growth_bounty` and `settle_receipt_reward` still update protocol escrow state only. SPL vault custody remains the next hardening step before real funds.
- Hosted app still needs relayer/wallet wiring to submit these live transactions from the UI.

