# Frontier Submission Packet

Generated: 2026-05-04T08:52:44.302Z

## One-Sentence Pitch

Viral Sync is the Solana settlement layer for outcome-based marketing: merchants escrow bounties, creators or agents route customers, and payouts only release when the customer actually converts.

## Submission Thesis

Every payout is backed by a POC-1 receipt: a PDA-based Solana proof signed by the merchant, an enrolled terminal, and the visitor, with nullifier replay protection and settlement-time intent checks.

## Merchant Proof Passport

The proof passport is a privacy-preserving merchant-owned packet built from the devnet proof manifest and verifier output. It publishes verifiable commerce facts without publishing customer names, phone numbers, emails, or GPS coordinates.

| Field | Value |
|---|---|
| Passport | PASS |
| Merchant | `Thamel Brew House` |
| Network | `solana-devnet` |
| Proof level | `counter_attested` |
| Attestation model | `merchant_terminal_visitor_signed` |
| Privacy model | No customer names, phone numbers, emails, raw staff notes, or GPS coordinates are published. Public data is limited to proof objects, amounts, hashes, and verifier results. |
| Passport artifact | `app/public/proofs/merchant-passport.json` |

## Proof-of-Conversion Orderbook

The orderbook demonstrates the broader primitive: merchants can publish conversion bounties, referrers/creators/agents can route demand, and Solana settlement remains blocked until a POC-1 receipt verifies.

Artifacts:

- `app/public/proofs/conversion-orderbook.json`
- `app/public/proofs/campaign-links.json`
- `app/public/proofs/merchant-validation-kit.json`

Routes:

- `/conversion-orderbook`
- `/campaign/thamel-brew-counter-attested-visits`
- `/api/actions/campaign/thamel-brew-counter-attested-visits`
- `/merchant-validation`

## Judge-Facing Proof Path

1. Merchant registers an outcome settlement config.
2. Merchant enrolls a terminal device for counter attestation.
3. Merchant creates and funds a Growth Bounty.
4. Visitor claim/lineage context is committed into the receipt path.
5. The program records a Causal Receipt with a campaign-scoped nullifier.
6. The receipt stores the `intent_manifest_hash` commitment.
7. The program settles exactly once from the SPL reward vault.
8. The passport exports privacy-preserving proof of outcome settlement.

## Devnet Evidence

| Field | Value |
|---|---|
| Cluster | `devnet` |
| Program | `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46` |
| RPC | `https://api.devnet.solana.com` |
| Generated | `2026-05-04T08:52:26.338Z` |
| Intent checked | `2026-05-04T08:52:26.336Z` |
| Campaign | `BjidxhA6HsNeS6QMZ8Mt28VEb3aUDKJyic5CP9oQDXNt` |
| Reward escrow | `3crDWVB7MqAnUjDocbGaznTSCX8CfnfHvt61wZPQ3H1D` |
| Reward vault | `EBmCs1hJ1jSsc6ReihxcxhAexvpoqiZf1PYFA4u2qAZL` |
| Causal receipt | `7wGtDkbzTuFUtKuyLUJ1YmcjujKApYP1fsLpQEY5Az3y` |
| Nullifier | `2QmjowcPKAJWCFCjg8Q4rEkQNvKQooUC2LX6Qa6R9Xnu` |
| Intent manifest hash | `fc4f640ee84816da5f369c2e2059d9fd8d0cd5396f2fd2ce432bddbf2fe35d17` |
| Visit attestation hash | `d935a8bf3b2af002020de2aa37a3c033a85515dedeb8b9fc4840f9c7ee6710d4` |
| Replay checks | PASS |
| Intent validation checks | PASS |
| Required verifier | PASS |
| Attestation model | `merchant_terminal_visitor_signed` |
| Proof level | `counter_attested` |
| Terminal verified | PASS |
| Visitor verified | PASS |
| Lineage verified | PASS |

## Core Transaction Links

| Step | Signature | Explorer |
|---|---|---|
| register_merchant | `34Wx4ahp3woErAxkAe16V61U3MG7Wz5N8WmcTzpkZk42EfDom9cFZZ4WfCRzYgVRag5fE9v5fn4NPCaptju8VgAz` | https://explorer.solana.com/tx/34Wx4ahp3woErAxkAe16V61U3MG7Wz5N8WmcTzpkZk42EfDom9cFZZ4WfCRzYgVRag5fE9v5fn4NPCaptju8VgAz?cluster=devnet |
| create_growth_campaign | `xC53Yn6qCJo6KZ1te9aGf2qeU2gvXfrHzHpPuT81sBSqRanejSEuEGtZ8r7cTMjngotEfu8yZjiZ5CLYoa5Fz5C` | https://explorer.solana.com/tx/xC53Yn6qCJo6KZ1te9aGf2qeU2gvXfrHzHpPuT81sBSqRanejSEuEGtZ8r7cTMjngotEfu8yZjiZ5CLYoa5Fz5C?cluster=devnet |
| enroll_terminal_device | `3bW2xRLjm2Y7WDQnzgAe1Kh1RFmAi8dUjioswPrREasNa2LN4hrTDmjnHbNru9gWtQDFRoCk7igsxwPsLTQjyvbf` | https://explorer.solana.com/tx/3bW2xRLjm2Y7WDQnzgAe1Kh1RFmAi8dUjioswPrREasNa2LN4hrTDmjnHbNru9gWtQDFRoCk7igsxwPsLTQjyvbf?cluster=devnet |
| issue_claim_pass | `LCNiRs3bBYSeqWKAVBp5YnZoVwvz1Ufmf8mP3Esy57xX3L6s9cryQcL7tmmztpHGASWo1EQZ8STGnAoqZ2KDyVr` | https://explorer.solana.com/tx/LCNiRs3bBYSeqWKAVBp5YnZoVwvz1Ufmf8mP3Esy57xX3L6s9cryQcL7tmmztpHGASWo1EQZ8STGnAoqZ2KDyVr?cluster=devnet |
| fund_growth_bounty | `2JCybBzCUNj75kCwpwufoT9yrsw8iUnUi8yPeLTbc7eu7dGWpCpx8FCQtTydJJXWp9vFGrPfGbRqdiZDTT3M51LQ` | https://explorer.solana.com/tx/2JCybBzCUNj75kCwpwufoT9yrsw8iUnUi8yPeLTbc7eu7dGWpCpx8FCQtTydJJXWp9vFGrPfGbRqdiZDTT3M51LQ?cluster=devnet |
| record_causal_receipt | `3unL4uYpzuuf3qiXZ6NFHMv2eYiomLPRx6KnR9jPLoDvwj3X21Hr12NbMgncEfhHLbfqdztywYV7huGAVRjf8zhy` | https://explorer.solana.com/tx/3unL4uYpzuuf3qiXZ6NFHMv2eYiomLPRx6KnR9jPLoDvwj3X21Hr12NbMgncEfhHLbfqdztywYV7huGAVRjf8zhy?cluster=devnet |
| settle_receipt_reward | `3fjD1PsDkbmMx54cMD5gpLd1ews8SMWv7XL86WN9Q4g4EfAUx5dU4YyNND8JWYvRdNM8puSE1vZwS9yXjFA3Y9u4` | https://explorer.solana.com/tx/3fjD1PsDkbmMx54cMD5gpLd1ews8SMWv7XL86WN9Q4g4EfAUx5dU4YyNND8JWYvRdNM8puSE1vZwS9yXjFA3Y9u4?cluster=devnet |

## SPL Custody Ledger

This public proof focuses on record + settle; the script supports close-check with `--close-check`, but vault reclaim is not claimed as proven in this artifact.

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | `10000` | `0` | `missing` |
| Reward vault | `0` | `9000` | `missing` |
| Referrer reward account | `0` | `792` | `missing` |
| Visitor reward account | `0` | `198` | `missing` |

## Verifier Copies

`tmp/devnet-causal-commerce-verifier.json` is the raw verifier output from the local command.
`app/public/proofs/devnet-causal-commerce-verifier.json` is the published copy with publication metadata for the web app and auditor packet.

## Commands For Judges

```bash
npm ci
npm run frontier:offline-preflight
npm run frontier:mock-final
# fund the configured devnet wallet first
npm run frontier:final
```

## Hosted App Proof Surface

- Devnet proof page: `/proof`
- Receipt proof: `/receipt/[id]`
- Campaign action metadata: `GET /api/actions/campaign/[slug]`
- Receipt action metadata: `GET|POST /api/actions/causal-receipt/[id]`

## Honest Limitations

devnet proof path verifies counter attestation (merchant + enrolled terminal + visitor), claim-pass account lineage, SPL custody, nullifier replay rejection, payout, and intent manifest hash commitment. It does not claim GPS or independent physical-world oracle proof.
