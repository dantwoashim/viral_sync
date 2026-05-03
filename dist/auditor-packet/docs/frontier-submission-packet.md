# Frontier Submission Packet

Generated: 2026-05-03T22:10:37.908Z

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
| Generated | `2026-05-03T22:10:19.737Z` |
| Intent checked | `2026-05-03T22:10:19.735Z` |
| Campaign | `NW4DiF2wYuvS1ygqbsnhontvW8q8xCz1KMZrvizcHRD` |
| Reward escrow | `CWw2VS75xqJxpWysYJ87fjKjmpUGm5PttsJ8EwbiVMeb` |
| Reward vault | `FdwNmB8wj5Tvm2pMtje9CPB8dvmiYCqgTMmrqr17DJZz` |
| Causal receipt | `Hvaos2q61tnsJ43EdyCGpskhgZ3ZbzhmQWWvcgt9JkYi` |
| Nullifier | `276yEybe1QYVFyuA5jsR4NsCMsQxkqzAJAudHBKvY6VE` |
| Intent manifest hash | `cf4e2dbd135da76d26331f494d9bd94277e70c5fddd1af7460541888a4751303` |
| Visit attestation hash | `f096dafaf241d6827f7b02159c65fc292a9f7c921eb40774078670ed4959ab8a` |
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
| register_merchant | `mv6qgafpddWdKzWDG9AGtwKaZNKBEQwKYN4dCKiu2LQxpwTRMqCreDzZp81dBgtbdPdhNUAMGCrciU3zjZAxiTw` | https://explorer.solana.com/tx/mv6qgafpddWdKzWDG9AGtwKaZNKBEQwKYN4dCKiu2LQxpwTRMqCreDzZp81dBgtbdPdhNUAMGCrciU3zjZAxiTw?cluster=devnet |
| create_growth_campaign | `38CThZc6hnhiikwJiYBJFxwyvoJjXUwGz8rejByqB8BZWkV8tMKksKfi64sVTJgoQbtao6tU4KifLmMVMPYoFEQM` | https://explorer.solana.com/tx/38CThZc6hnhiikwJiYBJFxwyvoJjXUwGz8rejByqB8BZWkV8tMKksKfi64sVTJgoQbtao6tU4KifLmMVMPYoFEQM?cluster=devnet |
| enroll_terminal_device | `4uMZUmcQAxy5oVSVuJ6UszVz6Vvku9pH8jeqsCcDCX5wMrM4vBwc5VfrMnCGDQvn2eGdES6vp8BMQeeE5KMRwawy` | https://explorer.solana.com/tx/4uMZUmcQAxy5oVSVuJ6UszVz6Vvku9pH8jeqsCcDCX5wMrM4vBwc5VfrMnCGDQvn2eGdES6vp8BMQeeE5KMRwawy?cluster=devnet |
| issue_claim_pass | `4xWpPk8P85ru2LodJaYGgdKLrKHhfC6nq5fsdLVD9kx7oDWBX4ohJvPpmXXszcgvK9vev91BSgdzXamscMpHnE2E` | https://explorer.solana.com/tx/4xWpPk8P85ru2LodJaYGgdKLrKHhfC6nq5fsdLVD9kx7oDWBX4ohJvPpmXXszcgvK9vev91BSgdzXamscMpHnE2E?cluster=devnet |
| fund_growth_bounty | `5EGuB7NqfxcqaocJ7raNdVXkc3m4wVsLxUyxwzLJT2yQk448Zo68keu5fhJyEXSgUEiDdpK27igH8BTfoXQgf2f1` | https://explorer.solana.com/tx/5EGuB7NqfxcqaocJ7raNdVXkc3m4wVsLxUyxwzLJT2yQk448Zo68keu5fhJyEXSgUEiDdpK27igH8BTfoXQgf2f1?cluster=devnet |
| record_causal_receipt | `fmYHqAkWXpgBtuCG3YPDeQsuHBoxS8AEQk87X7gvhU3v2XzZGn3xTPsbxSJnPcpwJdhSEYRLwC9LBvaGyLUB4m8` | https://explorer.solana.com/tx/fmYHqAkWXpgBtuCG3YPDeQsuHBoxS8AEQk87X7gvhU3v2XzZGn3xTPsbxSJnPcpwJdhSEYRLwC9LBvaGyLUB4m8?cluster=devnet |
| settle_receipt_reward | `3wiLJq3vUF5ohfg17NXQt6fE4rfMU3xTb8BijLAzMymZVFzYsWPTJ5F8vvBfHy8Ywb9deDNjCzBM9sG8vw7ZXxyo` | https://explorer.solana.com/tx/3wiLJq3vUF5ohfg17NXQt6fE4rfMU3xTb8BijLAzMymZVFzYsWPTJ5F8vvBfHy8Ywb9deDNjCzBM9sG8vw7ZXxyo?cluster=devnet |

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
