# Auditor Start Here

This packet is the first pass for an external reviewer. Viral Sync is still not cleared for uncapped mainnet funds.

## Scope To Review

- Anchor program: `programs/viral_sync/src/instructions/causal_commerce.rs`
- Causal state: `programs/viral_sync/src/state/causal_commerce.rs`
- Program errors/events: `programs/viral_sync/src/errors.rs`, `programs/viral_sync/src/events.rs`
- Hosted launch ledger and API: `app/src/lib/launch/server.ts`, `app/src/lib/launch/api.ts`, `app/src/lib/launch/security.ts`
- Relayer policy: `/api/launch/relayer/*` routes and `getRelayerPolicy()`
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
- The hosted app still uses a JSONB launch ledger abstraction before full normalized production tables.
- Production login is token-backed pilot RBAC, not full enterprise SSO.
- Staff-device signatures are represented by enrolled device identifiers in the hosted app; hardware-backed device signing remains a hardening step.
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
