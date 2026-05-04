# Frontier Submission Packet

Generated: 2026-05-04T05:15:09.849Z

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
| Generated | `2026-05-04T05:14:52.531Z` |
| Intent checked | `2026-05-04T05:14:52.529Z` |
| Campaign | `BL8VRETAY9Zpv1WkCWo8neGCCr3Czf5ihRkGWkBQtmSN` |
| Reward escrow | `EwGJfELtH7e8Bmf85T6ABmBJi4eYovZrpemNntXcY4jq` |
| Reward vault | `7LUds8ojbUhhQY1rYshmsXkhHb8gsyQa3m9EhwntMQK` |
| Causal receipt | `7yiym4ehexoghmKwygCeYjvRdzQLCpjQwFyUkxUbLemU` |
| Nullifier | `5XFMdUwvCz6qXAtqNiK6xZzLeWFxFbUFduWkgKh7TXVn` |
| Intent manifest hash | `7905df81cc2e23d825394d4faff02843ad8504f9131acce8b8559c4eb590bb5a` |
| Visit attestation hash | `43c9212d1fb5604b21a1e06d1af8e42012b983d2a9ef50d4e66e2deaabc4f72b` |
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
| register_merchant | `5nqTeaH83zRfdxhAaFg2ZVyyN5gU5Zw9SBNm8vGyKhLTCTTbbxrZ5uXokiyw6a2ry7XF6LfagfP4JSGCQRcQCZqa` | https://explorer.solana.com/tx/5nqTeaH83zRfdxhAaFg2ZVyyN5gU5Zw9SBNm8vGyKhLTCTTbbxrZ5uXokiyw6a2ry7XF6LfagfP4JSGCQRcQCZqa?cluster=devnet |
| create_growth_campaign | `B8gFjjzMpy9pHwXZSenTzQB9FFMBifTcDHuTyoJRLv5DW5XddqT139igdWpLdg6U27Rru9sVABsF1Ji4cEsZrjg` | https://explorer.solana.com/tx/B8gFjjzMpy9pHwXZSenTzQB9FFMBifTcDHuTyoJRLv5DW5XddqT139igdWpLdg6U27Rru9sVABsF1Ji4cEsZrjg?cluster=devnet |
| enroll_terminal_device | `4TeM7MD23unuuzjJekZdSzQUcULJzAGV8mnGA5vE8LixTNmFVpDJMupTZNDwNaGQG8QX9hKeAAwcUvgKznfaZZm3` | https://explorer.solana.com/tx/4TeM7MD23unuuzjJekZdSzQUcULJzAGV8mnGA5vE8LixTNmFVpDJMupTZNDwNaGQG8QX9hKeAAwcUvgKznfaZZm3?cluster=devnet |
| issue_claim_pass | `5uzLNRdo6BBi1tdybKNzcfNQez1AbcAEmUmmTxKotadSWPDhKGQZVVmygKKKaguErdEp7KtD8iodRx8HcJti695E` | https://explorer.solana.com/tx/5uzLNRdo6BBi1tdybKNzcfNQez1AbcAEmUmmTxKotadSWPDhKGQZVVmygKKKaguErdEp7KtD8iodRx8HcJti695E?cluster=devnet |
| fund_growth_bounty | `dtpYvQoNzBji114oAouUeaqk4TpT31VR1cTC8tXykMhc3TLkV3XF5Mw7et7aHyXfh6vCNhxbAdAQsAyXDycyCVm` | https://explorer.solana.com/tx/dtpYvQoNzBji114oAouUeaqk4TpT31VR1cTC8tXykMhc3TLkV3XF5Mw7et7aHyXfh6vCNhxbAdAQsAyXDycyCVm?cluster=devnet |
| record_causal_receipt | `5WPV9HCEM4CHKTD6qnx5BYgbcyP7sm1JAXjaePfH2KNAiS3411bKpPQxqTNkrbDBuBvPskfgwC5zAWtprZgAqJMh` | https://explorer.solana.com/tx/5WPV9HCEM4CHKTD6qnx5BYgbcyP7sm1JAXjaePfH2KNAiS3411bKpPQxqTNkrbDBuBvPskfgwC5zAWtprZgAqJMh?cluster=devnet |
| settle_receipt_reward | `5gyQ4ySSHyfDPJU4ZR3ZBTsGcDvVqbda7sTpEBgA4v3BurEeT9kqUjfNUExfAeTmw6YsWraxEuwnBCeddBHN4ARE` | https://explorer.solana.com/tx/5gyQ4ySSHyfDPJU4ZR3ZBTsGcDvVqbda7sTpEBgA4v3BurEeT9kqUjfNUExfAeTmw6YsWraxEuwnBCeddBHN4ARE?cluster=devnet |

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
