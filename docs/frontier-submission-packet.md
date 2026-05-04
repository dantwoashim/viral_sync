# Frontier Submission Packet

Generated: 2026-05-04T17:30:06.194Z

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
| Generated | `2026-05-04T17:29:38.048Z` |
| Intent checked | `2026-05-04T17:29:38.047Z` |
| Campaign | `GRA7eJaZWh8YKu8315FYZErPpJdvuwUmi36dRbuvruug` |
| Reward escrow | `5QPL44BvQPkaJ2i3SUoWfwXywia8wQ1nZJo82a4q1PN6` |
| Reward vault | `7236FNcCg9KaJbiBYADEqa3Rm9hQJQgbrMMZHSEbKKtF` |
| Causal receipt | `62gaHWd2pGzgjzC6tYZgQF45MGtDsGJnCkJstSGXr7vB` |
| Nullifier | `2fZxKevZzvYPaUtqxqin4xu2dGkWKfJ8go7rX4WVKuxy` |
| Intent manifest hash | `f383c4b9b4615080a08b2fd0a4ebe6259e9c97d94a589e7ab312abf0f665cd7a` |
| Visit attestation hash | `5eae679fe2b9f2869632398761e17b775d23e203820fa11d6c83d69a37765157` |
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
| register_merchant | `3jhhvNSdxs6kAZMNWC2Y1QAzgsGBmUp4P1wQWx5dhVx5oNQe8EQWj8NnsQKUJHMtV239cwrzA5kvyu5NwBDa15Bg` | https://explorer.solana.com/tx/3jhhvNSdxs6kAZMNWC2Y1QAzgsGBmUp4P1wQWx5dhVx5oNQe8EQWj8NnsQKUJHMtV239cwrzA5kvyu5NwBDa15Bg?cluster=devnet |
| create_growth_campaign | `4ZfEvidLmZmtEd7zf4zkiDMUjY9rEak9WeaGcTizk8baf83JXVSrhDCxE1sBc4WjJHfFt5ehzZWtQj15Ug2bmyFb` | https://explorer.solana.com/tx/4ZfEvidLmZmtEd7zf4zkiDMUjY9rEak9WeaGcTizk8baf83JXVSrhDCxE1sBc4WjJHfFt5ehzZWtQj15Ug2bmyFb?cluster=devnet |
| enroll_terminal_device | `5B9C3scX6ZiKtGbzGqexmraErh37FfKFkfRedepjo7WwqrF63upp49Nyb39DKbQhfDotumZm2EqyiW9VBhUAVX5X` | https://explorer.solana.com/tx/5B9C3scX6ZiKtGbzGqexmraErh37FfKFkfRedepjo7WwqrF63upp49Nyb39DKbQhfDotumZm2EqyiW9VBhUAVX5X?cluster=devnet |
| issue_claim_pass | `5TNJ4s38PXjUmabWPxaZxBkMgWjNzRinm2VDtZAXyfeRfkexvVBp4uKTSJ5cQ4VRmsuS7yMAW9K5tcZaKwdvH8Am` | https://explorer.solana.com/tx/5TNJ4s38PXjUmabWPxaZxBkMgWjNzRinm2VDtZAXyfeRfkexvVBp4uKTSJ5cQ4VRmsuS7yMAW9K5tcZaKwdvH8Am?cluster=devnet |
| fund_growth_bounty | `4ZsoAtTk7w5qV1Cb9V7tu8LsHzajdb8UA5ygdw1dmxq1hRA2ayxNE7pinTyz74WvhocmybhbNW98Ss7E2eYzzenB` | https://explorer.solana.com/tx/4ZsoAtTk7w5qV1Cb9V7tu8LsHzajdb8UA5ygdw1dmxq1hRA2ayxNE7pinTyz74WvhocmybhbNW98Ss7E2eYzzenB?cluster=devnet |
| record_causal_receipt | `4WzYp1qvhLwEPe6MkJwkbWcqq9gTnAwbrDyUyVw5FVH4hU7Ki2cqm9ULWhfYb4G25oRwZLyMTcTQswcZr3d4q37z` | https://explorer.solana.com/tx/4WzYp1qvhLwEPe6MkJwkbWcqq9gTnAwbrDyUyVw5FVH4hU7Ki2cqm9ULWhfYb4G25oRwZLyMTcTQswcZr3d4q37z?cluster=devnet |
| settle_receipt_reward | `4ofsZWohe6KQkkexBDKuTg8eRWFpHk1tCNUzPeeaHCpRTWWeY8Uh8RFijGuunKrur8PMexarzUzy4zt29nV7baz8` | https://explorer.solana.com/tx/4ofsZWohe6KQkkexBDKuTg8eRWFpHk1tCNUzPeeaHCpRTWWeY8Uh8RFijGuunKrur8PMexarzUzy4zt29nV7baz8?cluster=devnet |

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
