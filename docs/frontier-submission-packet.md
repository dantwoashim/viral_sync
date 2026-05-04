# Frontier Submission Packet

Generated: 2026-05-04T09:59:06.981Z

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
| Generated | `2026-05-04T09:58:47.692Z` |
| Intent checked | `2026-05-04T09:58:47.690Z` |
| Campaign | `2d4iwaAtoz2uzAVCm5mqx8SuZexaWzfKhZBNQTxG4Wcp` |
| Reward escrow | `9kMxr1bJmVLdtZZX5RNeWLsDQAuc5cYP3v8JXVEcJhJ8` |
| Reward vault | `J5WPB4PpuGJgHsSAUWFZ6x4ksyu6acPTrLm8CnEwnzR9` |
| Causal receipt | `2zVPrjAJzuVBkkppofweHRL9ZsCTbcBaw53nqbAGU5wC` |
| Nullifier | `FwZYA2nk71hMGPdyCRvsmhvUmHeDVRzj82WQpbNZeUgs` |
| Intent manifest hash | `9afb544e2d8797d112323d77bbb47f1322bdfade73617ab391fec6444263a856` |
| Visit attestation hash | `39f7fae4683a8f0f712a0d715aabca09ca28cd875056f8d92d14f0413cf936fb` |
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
| register_merchant | `35X2yvYrt1PxH1kE8QpSD8krLDHeP153VtGXE9oPfxpziKcT3NPNAgVMtkpoNEzBfcsv76hUaffgiFoGNYgVVxRa` | https://explorer.solana.com/tx/35X2yvYrt1PxH1kE8QpSD8krLDHeP153VtGXE9oPfxpziKcT3NPNAgVMtkpoNEzBfcsv76hUaffgiFoGNYgVVxRa?cluster=devnet |
| create_growth_campaign | `apQxQHHN8zUqKhCLoYiNDV5Ysm32SucRDf6ebJMHMz8XUHFVFJkUzas2KYZwJrTGqUkkCQ126nbSvHaRjHxJMMJ` | https://explorer.solana.com/tx/apQxQHHN8zUqKhCLoYiNDV5Ysm32SucRDf6ebJMHMz8XUHFVFJkUzas2KYZwJrTGqUkkCQ126nbSvHaRjHxJMMJ?cluster=devnet |
| enroll_terminal_device | `4Uuv33JvLQuxpUVigbRrzwCeTLy1iAgm9snbwX5zS31ob8TVFVJYQ5U8FmU52sseULEuVYVi3aecRx7hMUR4dsVK` | https://explorer.solana.com/tx/4Uuv33JvLQuxpUVigbRrzwCeTLy1iAgm9snbwX5zS31ob8TVFVJYQ5U8FmU52sseULEuVYVi3aecRx7hMUR4dsVK?cluster=devnet |
| issue_claim_pass | `634M1vgXUn8UVQR2LeuFJXBSD9k2wRAccTUUUk1HBZrpzhJafGDurxcteVbMYfd8K8KxK8kB7JLikRWTPTvuLuSs` | https://explorer.solana.com/tx/634M1vgXUn8UVQR2LeuFJXBSD9k2wRAccTUUUk1HBZrpzhJafGDurxcteVbMYfd8K8KxK8kB7JLikRWTPTvuLuSs?cluster=devnet |
| fund_growth_bounty | `65FZF4x4DkuoP6dgGT3EAEaN6M1JsVTVqczJQDTdtDcCdgpMQJJvaVbeFS22qhSR2NuwmbLAcgKPPesWFzHmEJ86` | https://explorer.solana.com/tx/65FZF4x4DkuoP6dgGT3EAEaN6M1JsVTVqczJQDTdtDcCdgpMQJJvaVbeFS22qhSR2NuwmbLAcgKPPesWFzHmEJ86?cluster=devnet |
| record_causal_receipt | `4g5P3bQDkQYcU27sWnc4eviz11RVFH3LbhX3dMn2sXHWBGWjjoBAqUP1jLVUDqaSGv9cGedHgoydupTWYEPjBCk7` | https://explorer.solana.com/tx/4g5P3bQDkQYcU27sWnc4eviz11RVFH3LbhX3dMn2sXHWBGWjjoBAqUP1jLVUDqaSGv9cGedHgoydupTWYEPjBCk7?cluster=devnet |
| settle_receipt_reward | `YYaW69DsHYs3N3kSPA6qSxVqS9VMpJ1YVhsdT6NNzP1gWpsK11oVf3tf2ZiHgGg2iaSArcrPjcTUHn5dub3pJXV` | https://explorer.solana.com/tx/YYaW69DsHYs3N3kSPA6qSxVqS9VMpJ1YVhsdT6NNzP1gWpsK11oVf3tf2ZiHgGg2iaSArcrPjcTUHn5dub3pJXV?cluster=devnet |

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
