# Frontier Submission Packet

Generated: 2026-05-03T21:41:29.037Z

## One-Sentence Pitch

Viral Sync turns counter-attested offline visits into portable proof-of-local-commerce for small merchants.

## Submission Thesis

Viral Sync is a counter-attested Causal Commerce protocol for Solana. A merchant funds a capped SPL reward vault. A visitor claims an invite. At the counter, an enrolled terminal and the visitor participate in the receipt path. The program records a Causal Receipt PDA, rejects duplicate nullifiers, commits the `intent_manifest_hash`, and settles rewards only through the verified program path.

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

1. Merchant registers a Causal Commerce config.
2. Merchant enrolls a terminal device for counter attestation.
3. Merchant creates and funds a Growth Bounty.
4. Visitor claim/lineage context is committed into the receipt path.
5. The program records a Causal Receipt with a campaign-scoped nullifier.
6. The receipt stores the `intent_manifest_hash` commitment.
7. The program settles exactly once from the SPL reward vault.
8. The passport exports privacy-preserving proof-of-local-commerce.

## Devnet Evidence

| Field | Value |
|---|---|
| Cluster | `devnet` |
| Program | `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46` |
| RPC | `https://api.devnet.solana.com` |
| Generated | `2026-05-03T21:40:59.192Z` |
| Intent checked | `2026-05-03T21:40:59.188Z` |
| Campaign | `FDc6hUAeYTBDKDxtc3AgnJdMUVQAfT3nYBfn9quFcZCn` |
| Reward escrow | `5qTj41yaA4NRMxD29gPSJcJK2tYxLAesW51ia5Z9Zj75` |
| Reward vault | `GBDJzjhW2FBF3kSssyGQpr1m3nqyRx4PaKgT9FubW76V` |
| Causal receipt | `EeN6uwtUpc46AMREojuAG77LKGvh7VSWBSQo38WC3JBb` |
| Nullifier | `9MgZzLgh3xDrJ1AoQCeyeLQQvaGKX2H5j23RQL6CJkX4` |
| Intent manifest hash | `4ef33d31d7fd868e3800ddb017c834cea31cb836dd01fed206daef79d9822575` |
| Visit attestation hash | `5391b9e743593a9312443855c4b27d51bd535e5f4d0fa859b7e64cfdb43deb29` |
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
| register_merchant | `VpjLyzVc24zY2SFRbd3VJtNMkmJNZeVcsvHEzgxE5BTzZ8MzE38wB7fqYYoSZARRYkVCMbQsUntLCCqtQjRxkVA` | https://explorer.solana.com/tx/VpjLyzVc24zY2SFRbd3VJtNMkmJNZeVcsvHEzgxE5BTzZ8MzE38wB7fqYYoSZARRYkVCMbQsUntLCCqtQjRxkVA?cluster=devnet |
| create_growth_campaign | `2aCiRcuqJ8ubbXDwosr4k156jr3G8fCv7qKehkf9F7ChafGs4yF1U5XGpzezpzfJ6BjXDKTPWwvS5fKGahj3i2Gy` | https://explorer.solana.com/tx/2aCiRcuqJ8ubbXDwosr4k156jr3G8fCv7qKehkf9F7ChafGs4yF1U5XGpzezpzfJ6BjXDKTPWwvS5fKGahj3i2Gy?cluster=devnet |
| enroll_terminal_device | `5CSLtss2dKStJ26pC9DvfcZ2MNHj3togtFw4tFKDfwX9PvdY4eD8NTv1b91qVoc2q3PikWfZ88CU7akfyQwQfwCH` | https://explorer.solana.com/tx/5CSLtss2dKStJ26pC9DvfcZ2MNHj3togtFw4tFKDfwX9PvdY4eD8NTv1b91qVoc2q3PikWfZ88CU7akfyQwQfwCH?cluster=devnet |
| issue_claim_pass | `5MMwu8aK2tuG769TRchNuYANY1sQt3ofZKZ89m4Zcji4McQxC41JX55jNj8H4ym5tLwpTbzLM1ZXxzJ5uCf8DfXE` | https://explorer.solana.com/tx/5MMwu8aK2tuG769TRchNuYANY1sQt3ofZKZ89m4Zcji4McQxC41JX55jNj8H4ym5tLwpTbzLM1ZXxzJ5uCf8DfXE?cluster=devnet |
| fund_growth_bounty | `3vKr3EZ4dVHh2ZL7uJ3FSKxV9PfRz1s1V6QhebHc7cJk9pfSr8A24bZqM6p6YGjTmq83AY7Qy5HPyneMiL9y5HGA` | https://explorer.solana.com/tx/3vKr3EZ4dVHh2ZL7uJ3FSKxV9PfRz1s1V6QhebHc7cJk9pfSr8A24bZqM6p6YGjTmq83AY7Qy5HPyneMiL9y5HGA?cluster=devnet |
| record_causal_receipt | `kBbsnRkRn2SRUXoyMMmbQemsZmar9SK3GTaqZKy3m3ycwPgz91tsKATx9FMxio6C6HqDMHH3YNRGztsi1PCGigc` | https://explorer.solana.com/tx/kBbsnRkRn2SRUXoyMMmbQemsZmar9SK3GTaqZKy3m3ycwPgz91tsKATx9FMxio6C6HqDMHH3YNRGztsi1PCGigc?cluster=devnet |
| settle_receipt_reward | `2KUDpJvZB3o8uDZCNEAqaeQ4MDbiMD7g8gQBjTEkDMF2f27NaB94MrYz6UyNa5Ht8Jb5LLUastnCTmWwpLF5BQXt` | https://explorer.solana.com/tx/2KUDpJvZB3o8uDZCNEAqaeQ4MDbiMD7g8gQBjTEkDMF2f27NaB94MrYz6UyNa5Ht8Jb5LLUastnCTmWwpLF5BQXt?cluster=devnet |

## SPL Custody Ledger

This public proof focuses on record + settle; the script supports close-check with `--close-check`, but vault reclaim is not claimed as proven in this artifact.

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | `10000` | `0` | `missing` |
| Reward vault | `0` | `9000` | `missing` |
| Referrer reward account | `0` | `800` | `missing` |
| Visitor reward account | `0` | `200` | `missing` |

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

- Devnet proof page: `/frontier-proof`
- Merchant Proof Passport: `/merchant-passport`
- Policy: `GET /api/launch/relayer/policy`
- Causal Commerce intent builder: `GET|POST /api/launch/relayer/causal-commerce`
- Sponsored transaction simulator: `POST /api/launch/relayer/sponsor`

## Honest Limitations

devnet proof path verifies counter attestation (merchant + enrolled terminal + visitor), claim-pass account lineage, SPL custody, nullifier replay rejection, payout, and intent manifest hash commitment. It does not claim GPS or independent physical-world oracle proof.
