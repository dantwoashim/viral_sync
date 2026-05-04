# Frontier Submission Packet

Generated: 2026-05-04T02:25:51.485Z

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
| Generated | `2026-05-04T02:20:23.737Z` |
| Intent checked | `2026-05-04T02:20:23.735Z` |
| Campaign | `EqhGE4hoV7q5bmq7AL53wAy7622gqadnRr76CTKAjq6u` |
| Reward escrow | `4TsjFHmMPU6oLLAL8GHeT7s6EBP7SKkrMfCc3oGTu1dU` |
| Reward vault | `EH9koJRcUFekkkZHsurRn5GNpbnzt8CjENpRdoudmGJR` |
| Causal receipt | `H6c17KFD81Sig4gE4cZigZabXjCu7R2zL7E2JJ8og7mj` |
| Nullifier | `CeUe5MchERWBSSo1LCLuTFsoysrSe4314KBpxqhcpVrm` |
| Intent manifest hash | `a2d0dae7c1de417b2e73acdd53ee3f9f4b34f1f6c3548ad5fc144cd1a884671f` |
| Visit attestation hash | `b3be06bce3a4ce925a162bb1693d037aa0940bbb5a63b7cffc96d0969a0849cf` |
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
| register_merchant | `Pw4sWCfwaFzygTLoyLTpYvfoxmZvhWnmzeTWRttxYrpSytSwVwxGB1B8EtmyB6NcMkH9UFnsWvDHtg32bH5ZvQU` | https://explorer.solana.com/tx/Pw4sWCfwaFzygTLoyLTpYvfoxmZvhWnmzeTWRttxYrpSytSwVwxGB1B8EtmyB6NcMkH9UFnsWvDHtg32bH5ZvQU?cluster=devnet |
| create_growth_campaign | `4DUE4UxCnhhbG4aHTZ6ww7Pz27sL3xc6ZXTYXKZYMUXRdNhRCqx8aUtpkwhQTYtUM5rNpFCC2zezW4y5zAcHqRxB` | https://explorer.solana.com/tx/4DUE4UxCnhhbG4aHTZ6ww7Pz27sL3xc6ZXTYXKZYMUXRdNhRCqx8aUtpkwhQTYtUM5rNpFCC2zezW4y5zAcHqRxB?cluster=devnet |
| enroll_terminal_device | `2DEjVxa5vR77rKaVy88ZUDA2V5bWWEZo5GS22eATnB5aQztb5BGMDnbFCwqjy8u2RZoA23bTr9QzCMxSA3xfVnjC` | https://explorer.solana.com/tx/2DEjVxa5vR77rKaVy88ZUDA2V5bWWEZo5GS22eATnB5aQztb5BGMDnbFCwqjy8u2RZoA23bTr9QzCMxSA3xfVnjC?cluster=devnet |
| issue_claim_pass | `NbwDbT9PLEZJthwtykbMYUnSbUDjDotKBKx2p7KeJoY8M3faEtXqZhxM4SUi2jXRBPMuQgmcDswqTmqusKCEDDk` | https://explorer.solana.com/tx/NbwDbT9PLEZJthwtykbMYUnSbUDjDotKBKx2p7KeJoY8M3faEtXqZhxM4SUi2jXRBPMuQgmcDswqTmqusKCEDDk?cluster=devnet |
| fund_growth_bounty | `29jk4m5ncVMYEoTmcmqSqoebRDYEcihM5A4UXJ84MbvDKUUFPPDD38R6s97NvTYanYyQbbhW3EZe92wi2ZPULvje` | https://explorer.solana.com/tx/29jk4m5ncVMYEoTmcmqSqoebRDYEcihM5A4UXJ84MbvDKUUFPPDD38R6s97NvTYanYyQbbhW3EZe92wi2ZPULvje?cluster=devnet |
| record_causal_receipt | `5aJtPSTbYHxU2knrqvwFvwVKGg3NGpbd32j9yRVpNmeypLZ5Ud1DS8rP34RYB4Yf3HxGbXcaaCWEeP6CkkSNSX8d` | https://explorer.solana.com/tx/5aJtPSTbYHxU2knrqvwFvwVKGg3NGpbd32j9yRVpNmeypLZ5Ud1DS8rP34RYB4Yf3HxGbXcaaCWEeP6CkkSNSX8d?cluster=devnet |
| settle_receipt_reward | `3qmnwJkbZZn21XrTA4aQn5LvfgAB5aK4jZD7pKyJACpHFnLThR1AEUDFXokk1ZHnZd4fXUdNGfrV9qpZM42uLNsd` | https://explorer.solana.com/tx/3qmnwJkbZZn21XrTA4aQn5LvfgAB5aK4jZD7pKyJACpHFnLThR1AEUDFXokk1ZHnZd4fXUdNGfrV9qpZM42uLNsd?cluster=devnet |

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

- Devnet proof page: `/proof`
- Merchant Proof Passport: `/merchant-passport`
- Policy: `GET /api/launch/relayer/policy`
- Causal Commerce intent builder: `GET|POST /api/launch/relayer/causal-commerce`
- Sponsored transaction simulator: `POST /api/launch/relayer/sponsor`

## Honest Limitations

devnet proof path verifies counter attestation (merchant + enrolled terminal + visitor), claim-pass account lineage, SPL custody, nullifier replay rejection, payout, and intent manifest hash commitment. It does not claim GPS or independent physical-world oracle proof.
