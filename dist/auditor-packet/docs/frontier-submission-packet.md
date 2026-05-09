# Frontier Submission Packet

Generated: 2026-05-09T11:03:45.418Z

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
| Generated | `2026-05-04T17:47:55.817Z` |
| Intent checked | `2026-05-04T17:47:55.815Z` |
| Campaign | `6JBQesdPSFJ6rPPMgTNAqVGW6y5GzTsHQxkrrmWaXmYu` |
| Reward escrow | `64pbedivLxw36iWwQpwbHSfv934nLqKVwmfHBay3fMhG` |
| Reward vault | `6s9gxHpQiSsXzc7nQ3igNt2etsK7Ryv4XY4ZCFNviyr5` |
| Causal receipt | `7EUshkEVxJLiVS2NuGLSBqiGyKr6r8pALpFnUHPxuYAK` |
| Nullifier | `b3HQW1N19kP9pd97BPQtM4ucxMihfiYYZzYdfdJMFQF` |
| Intent manifest hash | `430031a3346388cd307468345b264ac816dd42eda8dbb6c8677d8f1589479cbc` |
| Visit attestation hash | `cd3f2064d7be480c4f2e09e2fd51a36aa886342af318c0f851809527b0b11e33` |
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
| register_merchant | `5UBLiXLfo86FDXNHc1viPCQxZ44zW4fQ367cqRhVCQFvQFVu8yxfPNPpDvbmqwXAQcUP3zLXPYai9wMeh2FKAbaz` | https://explorer.solana.com/tx/5UBLiXLfo86FDXNHc1viPCQxZ44zW4fQ367cqRhVCQFvQFVu8yxfPNPpDvbmqwXAQcUP3zLXPYai9wMeh2FKAbaz?cluster=devnet |
| create_growth_campaign | `2KbtgjA5Rx6f4paA76nz3Pn7UmSE4SZSyK64kxwCU4yu3u34GdQcXZpg39kLHsGE97xR27XAR2SvvFBieVmEMxL7` | https://explorer.solana.com/tx/2KbtgjA5Rx6f4paA76nz3Pn7UmSE4SZSyK64kxwCU4yu3u34GdQcXZpg39kLHsGE97xR27XAR2SvvFBieVmEMxL7?cluster=devnet |
| enroll_terminal_device | `ejYBVVxfn6V3VTo6zU8jkUwSsnCPRo8vpgsNk5KCCpJTmoULxBxo2TabCRxjN9WFtL8FHYFxHaBPMWjL6m4XSnw` | https://explorer.solana.com/tx/ejYBVVxfn6V3VTo6zU8jkUwSsnCPRo8vpgsNk5KCCpJTmoULxBxo2TabCRxjN9WFtL8FHYFxHaBPMWjL6m4XSnw?cluster=devnet |
| issue_claim_pass | `4VXMrtBB2m7P3q934m9ysaE57R867PaHBFCx2BTa8dFCho9N8EWUocnd7YPi5i5y4P5GJsiKxXoFi3X7RF94woeD` | https://explorer.solana.com/tx/4VXMrtBB2m7P3q934m9ysaE57R867PaHBFCx2BTa8dFCho9N8EWUocnd7YPi5i5y4P5GJsiKxXoFi3X7RF94woeD?cluster=devnet |
| fund_growth_bounty | `2fqZnKcB5mFYBtRUKCUEp5bPmYqvqKBct24c5zyavWQoqTajtP9QiYiraZxmvF6vbJxKZKp2VEa655VX7JgrqMmC` | https://explorer.solana.com/tx/2fqZnKcB5mFYBtRUKCUEp5bPmYqvqKBct24c5zyavWQoqTajtP9QiYiraZxmvF6vbJxKZKp2VEa655VX7JgrqMmC?cluster=devnet |
| record_causal_receipt | `3ZvR2WMtG6XnPXcuvBGXVjnEmfmptXw4BXUbiNeYR7iSB3U5vo4B54aNn5gPotWa7Gw59aFmTm7rCoJvsVTmXu1` | https://explorer.solana.com/tx/3ZvR2WMtG6XnPXcuvBGXVjnEmfmptXw4BXUbiNeYR7iSB3U5vo4B54aNn5gPotWa7Gw59aFmTm7rCoJvsVTmXu1?cluster=devnet |
| settle_receipt_reward | `mRq3RerMgQvwtqqjcujHJFn2WWTwNUtvuj4ztE1XRWogCvFV3ErnioiNCzsRQPHfguaR3uL7GuENXzia4tvJRM6` | https://explorer.solana.com/tx/mRq3RerMgQvwtqqjcujHJFn2WWTwNUtvuj4ztE1XRWogCvFV3ErnioiNCzsRQPHfguaR3uL7GuENXzia4tvJRM6?cluster=devnet |

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
