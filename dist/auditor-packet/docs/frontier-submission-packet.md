# Frontier Submission Packet

Generated: 2026-05-04T10:14:06.156Z

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
| Generated | `2026-05-04T10:13:46.801Z` |
| Intent checked | `2026-05-04T10:13:46.799Z` |
| Campaign | `4Jfn2Lf1qtDMJ5uxgAzCEcNwsAU3JXqHLHpTeSE9mMFA` |
| Reward escrow | `AbYRUoyUq154QrVCBWZMuF9f7we8LdDmSF9yPhbTQQ7w` |
| Reward vault | `3FsPyad9dAGNdpn86dQzhVY5JZ2ywu3r2yHS2tfZc8gY` |
| Causal receipt | `BCMjUfviPJtFWgGD35mMnrtUgm1yMCQeUMB3Yhc3nMrd` |
| Nullifier | `D5mhiJZBxzUpcxGPfJzffZ5azTNHNMf2B11DsRgWJdWF` |
| Intent manifest hash | `d090b6d9c32d6917d2d93ffdfc2a014d1fb51e7f1bf07a7a31394bb1a77c4274` |
| Visit attestation hash | `f0b9e4b17953f6641c65b202ad6ed7534fde8dd3714f6fd307e7a1a498891723` |
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
| register_merchant | `5XTr8MsxkueZ8nuL5pSDXiSQYz3JxY2mAcqDBVSBgAAMdfA85SJQmbgLhYtHqg3UESUPLyNGTFKbHTvFmUi5VwG4` | https://explorer.solana.com/tx/5XTr8MsxkueZ8nuL5pSDXiSQYz3JxY2mAcqDBVSBgAAMdfA85SJQmbgLhYtHqg3UESUPLyNGTFKbHTvFmUi5VwG4?cluster=devnet |
| create_growth_campaign | `38b61FxF1Q8KmjVGVothPynzaSqxcoU3c3adzGsnW6KsAKtnZNCEZqMesSDNo74RrmBsFbNcg1KiirntzU4dGAPE` | https://explorer.solana.com/tx/38b61FxF1Q8KmjVGVothPynzaSqxcoU3c3adzGsnW6KsAKtnZNCEZqMesSDNo74RrmBsFbNcg1KiirntzU4dGAPE?cluster=devnet |
| enroll_terminal_device | `3Zjw16rEmjnsbg72j9wLTUQM1wacNqgeLYtRMNc1aat41Lm2FpfqP36BjKMHfMp9jLQrv5XjCgqZNtYhPGznkgjb` | https://explorer.solana.com/tx/3Zjw16rEmjnsbg72j9wLTUQM1wacNqgeLYtRMNc1aat41Lm2FpfqP36BjKMHfMp9jLQrv5XjCgqZNtYhPGznkgjb?cluster=devnet |
| issue_claim_pass | `51DaoJ4dfs6vEokcwe7tbKuyiKLug8uWEYAjzniTPKpzwzu9VdG4jRnw6uJi9xacWqkDdrZFD8byApNQQMxndRnc` | https://explorer.solana.com/tx/51DaoJ4dfs6vEokcwe7tbKuyiKLug8uWEYAjzniTPKpzwzu9VdG4jRnw6uJi9xacWqkDdrZFD8byApNQQMxndRnc?cluster=devnet |
| fund_growth_bounty | `21dB9bkHAcKqEQ2q4mdWdpuftQWj1Sbk1PwdrMHjXEpak54pCF41VAns7nP6NB2Rgy63M3PYAsEPkqiqp3HPNZXT` | https://explorer.solana.com/tx/21dB9bkHAcKqEQ2q4mdWdpuftQWj1Sbk1PwdrMHjXEpak54pCF41VAns7nP6NB2Rgy63M3PYAsEPkqiqp3HPNZXT?cluster=devnet |
| record_causal_receipt | `4ksSZhzyjTkwbW2F2X821oodZHkN8FHJVq3TbpZv2wWdvzssbXr6G7CNptMNxuz3nvg3dbPMngw79ezaGsWBBbJJ` | https://explorer.solana.com/tx/4ksSZhzyjTkwbW2F2X821oodZHkN8FHJVq3TbpZv2wWdvzssbXr6G7CNptMNxuz3nvg3dbPMngw79ezaGsWBBbJJ?cluster=devnet |
| settle_receipt_reward | `2gqirka4Hrn28iiQVb59HiJyYvaFNu12jSYmTkaz94bz4JbfVCNUtgEEd58xmEnQT84VCNoazKajDqSfETfQoWRd` | https://explorer.solana.com/tx/2gqirka4Hrn28iiQVb59HiJyYvaFNu12jSYmTkaz94bz4JbfVCNUtgEEd58xmEnQT84VCNoazKajDqSfETfQoWRd?cluster=devnet |

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
