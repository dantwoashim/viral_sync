# Fraud Model

The negative-path suite is a machine-readable POC-1 artifact, not a marketing page. A final proof must reject every required case with expected errors, exact proof sources, and account mutation checks.

| Threat | Status | Mechanism | Remaining risk |
|---|---|---|---|
| Merchant-only fake receipt | Prevented | `record_causal_receipt` requires terminal and visitor signatures. | Merchant, terminal, and visitor can still collude. |
| Wrong terminal signer | Prevented | Terminal PDA seeds and terminal authority checks. | Compromised terminal key remains possible until revoked. |
| Different merchant terminal | Prevented | Terminal device must match merchant config and merchant authority. | None for POC-1 account model. |
| Visitor mismatch | Prevented | Claim pass visitor authority must match receipt visitor signer. | Visitor Sybil remains a business/risk-layer issue. |
| Claim pass reuse | Prevented | Claim pass transitions from active to recorded. | None for duplicate use of the same pass. |
| Duplicate nullifier | Prevented | Nullifier PDA initializes once per campaign and nullifier hash. | Off-chain identity rotation is outside POC-1. |
| Inflated reward amount | Prevented | Receipt reward amount must match campaign terms. | Campaign creator can choose weak economics. |
| Inflated split bps | Prevented | Settlement-time `IntentMismatch` check. | Future dynamic split proofs are roadmap. |
| Wrong reward mint or vault | Prevented | Account constraints bind mint, vault, and escrow. | Token extension edge cases remain experimental. |
| Settlement replay | Prevented | Settlement PDA initializes once per receipt. | None for replay of same settlement account. |
| Paused or expired campaign | Prevented | Campaign status and time-window checks. | Clock drift assumptions follow Solana runtime. |
| Merchant/terminal/visitor collusion | Accepted for POC-1 | Counter-attestation makes collusion explicit, not impossible. | Payment-bound mode, staking, rate limits, and challenge windows are the next hardening layer. |
| Relayer griefing | Mitigated | Allowlisted instructions, signed intents, replay nonce, spend caps. | Production relayer should move replay/rate state out of memory. |
| Upgrade authority risk | Accepted until multisig transfer | Program ID consistency and source binding are published. | Move authority to Squads before uncapped mainnet value. |
