# Frontier Submission Packet

Generated: 2026-05-04T04:25:49.935Z

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
| Generated | `2026-05-04T03:03:12.609Z` |
| Intent checked | `2026-05-04T03:03:12.608Z` |
| Campaign | `EuhUPPx4R1tHdxRvD6uftmAAocc4HBYmFzJS2cVJvNQC` |
| Reward escrow | `BLv64CPsfRASQW3Qm6Nbsbc5k7iWcqt7Q3jobojQC9Hc` |
| Reward vault | `4QB52w3CGCK85WdqDWAYHn4EiQmZ6Yf3FHozNTbk18EC` |
| Causal receipt | `DsUAoFo69gyhegyB83Ky4dxXBt5WSLmmob7nLGit4sTg` |
| Nullifier | `44pkVAaNuhRjDWxQo4SUyD8d1jA4k1sK4dnPiNspghaT` |
| Intent manifest hash | `9470113ffffc28d6c4b8809deb332de5b808f6e6a6110f14d3746718604a6e58` |
| Visit attestation hash | `563141d2d0fa0c3efa6f547537b243e22f475ed1ef02635abeec32772903b25a` |
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
| register_merchant | `fAK1rsaqBC8SYP3K41WgQvVx9B4AYffkWVjheMENWvHZBxyLcewB1KEBuHsssyh9u5BXMLfKnYbSX5YPSAqn29d` | https://explorer.solana.com/tx/fAK1rsaqBC8SYP3K41WgQvVx9B4AYffkWVjheMENWvHZBxyLcewB1KEBuHsssyh9u5BXMLfKnYbSX5YPSAqn29d?cluster=devnet |
| create_growth_campaign | `2R8HiGj8rjnmreN7nrd1Mn8MwHRZGidWiWRxkxVUHVCemQcEL9Wcj3ekpqXKNMHDtBD2iBtPZJxrSKKuCuy7oDf` | https://explorer.solana.com/tx/2R8HiGj8rjnmreN7nrd1Mn8MwHRZGidWiWRxkxVUHVCemQcEL9Wcj3ekpqXKNMHDtBD2iBtPZJxrSKKuCuy7oDf?cluster=devnet |
| enroll_terminal_device | `tbK4CBDUqZqTaUNtrdBMH1QMd2qLtoJ6wBB5m1E8KEAqpziLsTB2TA283Gvvf9Rgzy3PM5X6tfwYG9WbbY1w5AU` | https://explorer.solana.com/tx/tbK4CBDUqZqTaUNtrdBMH1QMd2qLtoJ6wBB5m1E8KEAqpziLsTB2TA283Gvvf9Rgzy3PM5X6tfwYG9WbbY1w5AU?cluster=devnet |
| issue_claim_pass | `2GCJgEtbSDn11rhv1Snj57xgW2hk5HjCpSuwBU3M12hJfdS9DNqnGU3b3PhTqNEP2RNZM93tT8TwXqfkTqbxsFt9` | https://explorer.solana.com/tx/2GCJgEtbSDn11rhv1Snj57xgW2hk5HjCpSuwBU3M12hJfdS9DNqnGU3b3PhTqNEP2RNZM93tT8TwXqfkTqbxsFt9?cluster=devnet |
| fund_growth_bounty | `5wZh9fpZUDdTCxJySKgkPiAe9AGZBzwhxJ2UaZP4DMBeKFoadqHLswThNQ6ij9Pcs76HsDthtoQVAx1x4rqrpUYL` | https://explorer.solana.com/tx/5wZh9fpZUDdTCxJySKgkPiAe9AGZBzwhxJ2UaZP4DMBeKFoadqHLswThNQ6ij9Pcs76HsDthtoQVAx1x4rqrpUYL?cluster=devnet |
| record_causal_receipt | `5PLgoHsQccgRtLi3T2VCiX9UrP6rqSbDySNUasugsgtsbJEoGvwmPM23HdxAzewruJnD7kY51Vzut56eCR1s7XUd` | https://explorer.solana.com/tx/5PLgoHsQccgRtLi3T2VCiX9UrP6rqSbDySNUasugsgtsbJEoGvwmPM23HdxAzewruJnD7kY51Vzut56eCR1s7XUd?cluster=devnet |
| settle_receipt_reward | `Ccr7kTSHZnRpmnYoGxVAwd94iPBrZn1YwyvF6jya56qb9EM3LHQ4UW8C9Q6ubsg2d8YeaaoEeQMnjjYkJ6gxEdZ` | https://explorer.solana.com/tx/Ccr7kTSHZnRpmnYoGxVAwd94iPBrZn1YwyvF6jya56qb9EM3LHQ4UW8C9Q6ubsg2d8YeaaoEeQMnjjYkJ6gxEdZ?cluster=devnet |

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
