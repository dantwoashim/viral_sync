# Auditor Start Here

Viral Sync is the Solana settlement layer for outcome-based marketing: merchants escrow bounties, creators or agents route customers, and payouts only release when the customer actually converts.

Every payout is backed by a POC-1 receipt: a PDA-based Solana proof signed by the merchant, an enrolled terminal, and the visitor, with nullifier replay protection and settlement-time intent checks. This packet is the first pass for an external reviewer. Viral Sync is still not cleared for uncapped mainnet funds.

## Scope To Review

- Anchor program: `programs/viral_sync/src/instructions/causal_commerce.rs`
- Causal state: `programs/viral_sync/src/state/causal_commerce.rs`
- Program errors/events: `programs/viral_sync/src/errors.rs`, `programs/viral_sync/src/events.rs`
- Focused public app routes: `/`, `/campaign/[slug]`, `/claim/[token]`, `/merchant/scan`, `/merchant/today`, `/receipt/[id]`, `/proof`
- Action APIs: `/api/actions/campaign/[slug]` and `/api/actions/causal-receipt/[id]`
- Test baseline: `tests/viral_sync.ts`
- Production gates: `docs/production-readiness.md`, `scripts/validate-production-readiness.mjs`
- Production schema/read models: `docs/migrations/001_launch_core.sql`, `docs/migrations/002_production_rbac_and_ops.sql`

## Critical Invariants

- A merchant config PDA is unique to merchant authority plus org hash.
- A growth campaign PDA is unique to merchant config plus campaign hash.
- Funding cannot exceed reward-per-visit times maximum redemptions.
- A nullifier record is unique per campaign and claimant nullifier.
- A causal receipt PDA is unique per campaign and receipt hash.
- Receipt recording reserves exactly one reward amount.
- Settlement can happen once because the receipt must be recorded and the settlement PDA is initialized once.
- Closing a bounty requires no reserved rewards and returns only unreserved vault balance.
- Paused merchant/campaign state blocks new setup or receipt recording.
- App-level relayer sponsorship requires service auth, signed intent, replay nonce, allowlisted instruction, account validation, and spend caps.

## Known Limits

- External audit is not complete.
- The hosted app keeps a legacy JSON ledger fallback for local development; normalized tables are the intended production read/write path.
- Production login is token-backed pilot RBAC, not full enterprise SSO.
- Staff-device signatures use enrolled terminal keys in the hosted app; hardware-backed non-extractable keys remain a hardening step.
- POS webhook depth is still import-first for capped pilots.
- Uncapped mainnet reward custody remains blocked.

## Suggested Review Order

1. Reproduce local build and tests with `npm run verify`.
2. Review PDA seeds and account constraints.
3. Review token vault funding, settlement, and close flows.
4. Review nullifier and receipt uniqueness behavior.
5. Review pause/status transition instructions.
6. Review relayer policy and replay protection.
7. Review hosted auth/RBAC and route-level authorization.
8. Review production readiness gates and deployment assumptions.

## Frontier Proof Ritual

```bash
npm ci
npm run frontier:offline-preflight
npm run frontier:mock-final
# fund the configured devnet wallet
npm run frontier:final 2>&1 | tee dist/final-command-transcript.txt
```

`frontier:mock-final` is a fixture-only artifact pipeline rehearsal. It is not submission evidence.

## Artifact Hashes

- `programSourceHash`: hash of `programs/viral_sync/src`.
- `idlHash`: hash of `target/idl/viral_sync.json`.
- `proofGeneratorHash`: hash of proof-generator scripts.
- `verifierHash`: hash of verifier and SDK verification source.
- `artifactHash`: hash of a generated proof artifact, when present.
- `rawVerifierHash`: hash of `tmp/devnet-causal-commerce-verifier.json`.
- `publishedVerifierHash`: hash of `app/public/proofs/devnet-causal-commerce-verifier.json`.

The raw verifier is the command output. The published verifier is the web/auditor copy with publication metadata.
