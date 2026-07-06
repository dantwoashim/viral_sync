# Civic Impact Markets

Verified civic forecasting and sponsor-funded action rewards, settled with Viral Sync receipt evidence on Solana.

Civic Impact Markets separates three ideas that are often incorrectly combined:

1. Forecast signals organize attention around a public outcome.
2. Sponsors fund useful civic actions, not correct predictions.
3. Solana receipts settle rewards only after the required authority, verifier, participant, nullifier, and settlement records align.

The current prototype uses a Ward 12 water repair scenario and a real Solana devnet receipt path. It does not claim that a blockchain independently proves physical-world facts. Municipal data and privacy-preserving identity remain explicit integration boundaries.

## Live Product

| Surface | Route |
|---|---|
| Product | `/` |
| Civic market | `/market/ward12-water-repair` |
| Participation | `/participate/ward12-water-repair` |
| Verification station | `/verify/ward12-water-repair` |
| Public ledger | `/ledger` |
| Sponsor view | `/for-sponsors` |
| Guided demo | `/demo` |
| Machine-readable evidence | `/proofs/*.json` |

## What Works

- Signed, stateless participation passes
- Capped, non-transferable conviction signals
- Sponsor-funded action reward model independent of forecast choice
- Verifier-station confirmation
- Solana devnet receipt and settlement evidence
- Nullifier-backed replay rejection
- Public proof sidecars bound to source artifacts
- SDK helpers for receipt verification and PDA derivation
- Explicit Janamat and privacy-adapter integration boundaries

## Proof Boundary

Proven:

- The Anchor program records receipt, nullifier, and settlement state.
- Published devnet artifacts contain transaction signatures and account addresses.
- The verifier checks the receipt bundle and source-artifact bindings.
- Duplicate and invalid protocol paths are covered by negative tests.
- Forecast credits cannot transfer, be redeemed, or trigger settlement.

Not yet proven:

- The Ward 12 fixture is not a live municipal data feed.
- Private identity verification is specified but not integrated.
- Physical-world completion still requires an authorized data source or field verifier.
- The system has not completed an external security audit for real-value mainnet use.

## Verify Locally

Requirements:

- Node.js 20+
- Rust and Cargo
- Solana CLI and Anchor for program builds

```bash
npm ci
npm run claims:scan
npm run civic:assert-routes
npm run civic:assert-artifacts
npm run civic:verify-receipt
npm run lint --workspace app
npm run build --workspace app
npm run build --workspace viral-sync-sdk
cargo check --manifest-path programs/viral_sync/Cargo.toml
npm run test:protocol
```

SDK verification:

```ts
import {
  fetchCivicReceiptVerificationBundle,
  verifyCivicReceiptArtifacts,
} from "viral-sync-sdk";

const bundle = await fetchCivicReceiptVerificationBundle(
  "https://your-app.example",
);
const result = verifyCivicReceiptArtifacts(bundle);

if (!result.ok) {
  throw new Error(result.failures.join(", "));
}
```

## Architecture

```text
app/                  Next.js product and public proof surfaces
programs/viral_sync/  Anchor receipt and settlement program
relayer/              Sponsored transaction relayer
sdk/                  Verification and PDA helper package
schemas/              Proof artifact schemas
scripts/              Proof generation and validation commands
tests/                Protocol and security regression tests
```

## Core Flow

```text
Civic issue
  -> forecast signal
  -> sponsor action pool
  -> signed participation pass
  -> verifier confirmation
  -> Solana receipt
  -> nullifier check
  -> reward settlement
  -> public ledger
```

The product is a devnet prototype. Real-value deployment requires an external security review, durable replay storage, production key management, monitoring, incident response, and an authorized civic data source.
