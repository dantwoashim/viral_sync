# Frontier Submission Packet

Generated: 2026-05-02T18:07:33.008Z

## One-Sentence Pitch

Viral Sync is a Causal Commerce protocol for Solana: merchants fund rewards and pay only when a staff-confirmed offline visit produces an on-chain causal receipt that commits to the visit evidence, campaign nullifier, and intent manifest hash.

## Judge-Facing Proof Path

1. Merchant registers a Causal Commerce config.
2. Merchant creates and funds a Growth Bounty.
3. The program records a Causal Receipt with a campaign-scoped nullifier.
4. The receipt stores the `intent_manifest_hash` commitment.
5. The program settles exactly once from the SPL reward vault.
6. The proof page shows explorer links and Causal Receipt Intent Validator results.

## Devnet Evidence

> Current committed proof status: `stale-devnet-snapshot-needs-verifier-regeneration`. Regenerate the devnet proof and verifier before final submission.

| Field | Value |
|---|---|
| Cluster | `devnet` |
| Program | `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46` |
| RPC | `https://api.devnet.solana.com` |
| Generated | `2026-05-02T16:40:00.000Z` |
| Intent checked | `2026-05-02T16:40:00.000Z` |
| Campaign | `34GkfA2fWygoKtgs7kQkpeiXwjMZiqSBZ4YN7WdgR4bC` |
| Reward escrow | `2vL4MN95KtjXX4VjSco9KhxH6etf2wFjSRjrz8Xmua1r` |
| Reward vault | `7g6R9ohAC3srQaJqjM2DyeB3ymo1JKUP8NPfSY6f1tBH` |
| Causal receipt | `52xZUCvJQZmw9dja4p6cB3AZ5A866i8scn8BeqmTMQpX` |
| Nullifier | `HS5e7sRLWrp42FGF7ADpK4dDZfp51zfRxY7mw3kiP6HB` |
| Intent manifest hash | `6f3a5453d7f7de7879b69018d9ccb4423b64d434627b9806c2209d909e6c7384` |
| Visit attestation hash | `4fb018529e0abc3c2d8e5f33763a8447691776107ae9360a00a617b30bc71faa` |
| Replay checks | PASS |
| Intent validation checks | PASS |
| Required verifier | MISSING |

## Core Transaction Links

| Step | Signature | Explorer |
|---|---|---|
| register_merchant | `5RckxgGvCpyghD8FMyHZpd2evV1azkSZbXViv2qVudqu4fe5mC5w1pErb4tyEZRxDmMzVVTpqoo91Jn5kXYigBjR` | https://explorer.solana.com/tx/5RckxgGvCpyghD8FMyHZpd2evV1azkSZbXViv2qVudqu4fe5mC5w1pErb4tyEZRxDmMzVVTpqoo91Jn5kXYigBjR?cluster=devnet |
| create_growth_campaign | `3usEUSP6sx34AXMDkSZ5fq7XDbMvPY2N3ZjSZ3RGUeTGaWDkD6tqYKy7JwwAZvwr4QRkV5RxcTWWG1UmQhyXmsb7` | https://explorer.solana.com/tx/3usEUSP6sx34AXMDkSZ5fq7XDbMvPY2N3ZjSZ3RGUeTGaWDkD6tqYKy7JwwAZvwr4QRkV5RxcTWWG1UmQhyXmsb7?cluster=devnet |
| fund_growth_bounty | `gAnzJ6J6VNZvYQ74QQVNzdgzNryfgU4SvE1JQcsjzkJ4jfSjfYhFW8L4mKcas3gYU2AMe9WPj4R3dkBFiR1Q5MV` | https://explorer.solana.com/tx/gAnzJ6J6VNZvYQ74QQVNzdgzNryfgU4SvE1JQcsjzkJ4jfSjfYhFW8L4mKcas3gYU2AMe9WPj4R3dkBFiR1Q5MV?cluster=devnet |
| record_causal_receipt | `3xqhpituh8FGYH8rb8GJZpo6UnhnYTuEdSrrU81tJRnpgw5QQMvmQqZMAhtfVsW7cUWKVevJHLsf5W5kHQ6g7hrH` | https://explorer.solana.com/tx/3xqhpituh8FGYH8rb8GJZpo6UnhnYTuEdSrrU81tJRnpgw5QQMvmQqZMAhtfVsW7cUWKVevJHLsf5W5kHQ6g7hrH?cluster=devnet |
| settle_receipt_reward | `2ivKkiSWZMzLmpyHTUpeppmRPsNLqeUGYgBZJPnS5Thv74BrJdXB3fuwBub44xBqusUzdpcHdYX4Fsoc999Y2GuJ` | https://explorer.solana.com/tx/2ivKkiSWZMzLmpyHTUpeppmRPsNLqeUGYgBZJPnS5Thv74BrJdXB3fuwBub44xBqusUzdpcHdYX4Fsoc999Y2GuJ?cluster=devnet |

## SPL Custody Ledger

This public proof focuses on record + settle; the script supports close-check with `--close-check`, but vault reclaim is not claimed as proven in this artifact.

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | `10000` | `0` | `missing` |
| Reward vault | `0` | `9000` | `missing` |
| Referrer reward account | `0` | `800` | `missing` |
| Visitor reward account | `0` | `200` | `missing` |

## Commands For Judges

```bash
npm ci
npm run build:program
npm run devnet:causal-commerce
npm run devnet:verify-receipt -- --output tmp/devnet-causal-commerce-verifier.json
npm run frontier:submission
```

## Hosted App Proof Surface

- Devnet proof page: `/frontier-proof`
- Policy: `GET /api/launch/relayer/policy`
- Causal Commerce intent builder: `GET|POST /api/launch/relayer/causal-commerce`
- Sponsored transaction simulator: `POST /api/launch/relayer/sponsor`

## Honest Limitations

devnet proof path records SPL Token custody, payout, vault reclaim when close-check is enabled, and intent manifest hash commitment; production mainnet still requires external audit and funded relayer operations.
