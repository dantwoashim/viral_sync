# Frontier Submission Packet

Generated: 2026-05-03T02:23:39.025Z

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

| Field | Value |
|---|---|
| Cluster | `devnet` |
| Program | `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46` |
| RPC | `https://api.devnet.solana.com` |
| Generated | `2026-05-03T02:19:45.903Z` |
| Intent checked | `2026-05-03T02:19:45.902Z` |
| Campaign | `6N5WX7dzdbX9pxaKTmx33RNVTCcZ9uipCG8bj1DzFpmv` |
| Reward escrow | `Di7Q9Zg2G75U5tej4mpWXgQuhds6ZnxDahkJSyqBzNYx` |
| Reward vault | `CdcWzWPQxpyyTG7UpAagrkbKdwGcDFbBgkWFtLy3dN4a` |
| Causal receipt | `AdbQrEQHMaSkshS6bykEA33FPQj6ymRwaQz88AkhQUBN` |
| Nullifier | `8wbj9DY9Vw1hK6sLx6TMALYkaFQgGPFFn4NDBc5QEGSm` |
| Intent manifest hash | `d3e4b835bf7029d301dbad83d53456cdd3272af636ed2d83b35a532dec9ee8d3` |
| Visit attestation hash | `479afa8d6284844fef6be29cacc281137363200708c767d0bb5a5a7e7b80673f` |
| Replay checks | PASS |
| Intent validation checks | PASS |
| Required verifier | PASS |

## Core Transaction Links

| Step | Signature | Explorer |
|---|---|---|
| register_merchant | `2aetwMZ1iVzctY2zc1NKrmHc5rb7iLsNh9aGHhKKYZ9z2HgGTfYhT4r6qFnczSQQVTWxiVXCvEcyR6sd5waGf9z2` | https://explorer.solana.com/tx/2aetwMZ1iVzctY2zc1NKrmHc5rb7iLsNh9aGHhKKYZ9z2HgGTfYhT4r6qFnczSQQVTWxiVXCvEcyR6sd5waGf9z2?cluster=devnet |
| create_growth_campaign | `5aKGgmuCepEKFPwtpo1Go1mUYnGZa7Y5N116vUuJuvMSfKG7Hbg7hGiy6cvBswuYpbqJz4fYq8SfT1EuDAhyx5Eu` | https://explorer.solana.com/tx/5aKGgmuCepEKFPwtpo1Go1mUYnGZa7Y5N116vUuJuvMSfKG7Hbg7hGiy6cvBswuYpbqJz4fYq8SfT1EuDAhyx5Eu?cluster=devnet |
| fund_growth_bounty | `5438ZH9GgcKfnxiQBTYx2FeHDDV47geryjHmUcorHHzZKrjEGnaTQyHJC4jBWLXR1gRyNurhA4R62ecddfEUo7WP` | https://explorer.solana.com/tx/5438ZH9GgcKfnxiQBTYx2FeHDDV47geryjHmUcorHHzZKrjEGnaTQyHJC4jBWLXR1gRyNurhA4R62ecddfEUo7WP?cluster=devnet |
| record_causal_receipt | `5HifvhHX4Fz7e7ThtykCDBnCQdkNEes6DpeFBJEFKJnPEumJz9r6R2pRW9etVaM2CQYX9hCKLMU1wqdqUNiWqkhw` | https://explorer.solana.com/tx/5HifvhHX4Fz7e7ThtykCDBnCQdkNEes6DpeFBJEFKJnPEumJz9r6R2pRW9etVaM2CQYX9hCKLMU1wqdqUNiWqkhw?cluster=devnet |
| settle_receipt_reward | `7LmCR2i2yeiaBziTE7bRAGH85kRiCo2K2CqnLv4UTtFSQxezgK2s3tyQyxMCCuSdD7HQETCaUmrzbCFk7SsdoUS` | https://explorer.solana.com/tx/7LmCR2i2yeiaBziTE7bRAGH85kRiCo2K2CqnLv4UTtFSQxezgK2s3tyQyxMCCuSdD7HQETCaUmrzbCFk7SsdoUS?cluster=devnet |

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
