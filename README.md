# Viral Sync

Viral Sync is a Solana-backed referral commerce prototype that connects online word-of-mouth to verified in-store visits.

Instead of rewarding impressions, clicks, or self-reported referrals, Viral Sync is built around a stricter unit: a **Causal Receipt**. A Causal Receipt links a referral invite, a customer claim, a merchant-confirmed visit, and reward settlement evidence.

The goal is simple:

```text
Pay for verified visits, not unverifiable clicks.
```

## Why It Exists

Local merchants often rely on referrals, creators, community pages, and customer recommendations, but most tools only measure the easy part: links, clicks, and signups. The hard part is proving that a referral actually caused a real visit.

Viral Sync explores a better attribution loop:

1. A merchant funds a campaign.
2. A customer shares an invite.
3. A friend claims the offer.
4. Staff confirms the visit at the counter.
5. The system creates a receipt-backed proof.
6. Rewards can be settled from campaign escrow.

That makes the product useful for cafes, restaurants, hostels, salons, gyms, events, and neighborhood businesses where the real conversion happens offline.

## What This Repository Contains

This is a full-stack prototype, not just a landing page.

```text
app/                  Next.js app for consumers, merchants, receipts, and dashboards
programs/viral_sync/  Anchor program for Causal Commerce primitives
relayer/              Sponsored transaction relayer service
server/actions/       Solana Actions service path
clients/              Client and POS adapter experiments
cranks/               Background cleanup runner
sdk/                  Public verification and PDA helper package
tests/                Protocol, product, and security regression tests
```

## Core Product Loop

The main flow is intentionally narrow:

```text
Invite -> Claim -> Redeem Code -> Merchant Confirmation -> Receipt Proof -> Causal Graph
```

Key routes:

```text
/invite             Create and share a referral invite
/offer/[token]      Claim an offer from a referral link
/redeem             Generate a counter redemption code
/merchant/scan      Confirm a visit as merchant staff
/receipts/[id]      View receipt proof
/causal-graph       See referral-to-visit attribution
/merchant/today     Merchant operations dashboard
/merchant/ledger    Reward and settlement ledger
/security           Security posture and launch limits
/pricing            Merchant-facing pricing surface
/support            Support and recovery paths
```

## What Is Working

- Consumer invite, claim, passbook, and redeem-code flows.
- Merchant scan, campaign, ledger, and daily operations screens.
- Receipt explorer with public verification states.
- Causal graph showing privacy-safe attribution edges.
- Launch ledger with local JSON fallback and Postgres support for deployed pilots.
- Staff confirmation hardening with enrolled device proof instead of plain bearer headers.
- Causal invite signing with guarded production secrets.
- Relayer policy gates, replay protection, payload caps, and program allowlisting.
- Anchor program primitives for merchants, campaigns, escrow, receipts, settlement, transfer hooks, and account constraints.
- Security regression tests for the highest-risk production gates.

## Current Status

Viral Sync is a **devnet/capped pilot prototype**. It is not an audited mainnet protocol for unrestricted real value.

Recent hardening work focused on the highest-risk areas:

- Receipt recording requires merchant authority.
- Settlement requires merchant authority.
- Settlement destination accounts are bound to stored beneficiaries.
- Campaign time windows are enforced before receipt recording.
- Reward mint constraints are explicit.
- Burn and escrow instructions bind token ownership and mint relationships.
- Unsafe dispute and bond economic stubs fail closed until their vault models are implemented.
- Staff device confirmation requires timestamped proof of possession.
- Relayer signing is no longer an opaque “sign anything” path.

That said, this still needs an independent Solana security audit before real merchant funds are allowed at scale.

## Architecture

Viral Sync has four main layers.

**Consumer app**

Customers can receive an invite, claim an offer, generate a code, and later view their reward/receipt history.

**Merchant app**

Merchants can inspect visits, campaigns, reward liability, staff activity, and proof records. The merchant screens are built around counter tasks rather than abstract analytics.

**Protocol layer**

The Anchor program models Causal Commerce accounts such as merchant configs, growth campaigns, reward escrows, causal receipts, nullifiers, and settlement records.

**Relayer and verification layer**

The relayer supports sponsored transactions under strict policy checks. The SDK exposes helper methods for receipt verification and PDA derivation.

## Security Posture

Viral Sync treats security as part of the product, not a final polish step.

Implemented guardrails include:

- Merchant RBAC for sensitive launch routes.
- Same-origin protection for mutation routes.
- Production secret guards for demo fallback secrets.
- Staff device signature proof for counter confirmations.
- Idempotency checks before redemption confirmation side effects.
- Hashed redeem-code lookup.
- Relayer API authentication.
- Relayer transaction size caps.
- Relayer program allowlisting.
- Protocol constraints for settlement authority, beneficiaries, token mints, and token owners.
- Regression tests for the most important hardening gates.

Known limitations:

- The protocol has not received an external audit.
- Some advanced modules are intentionally disabled until their account and value-flow models are complete.
- The product still uses a launch-ledger model; a normalized production database schema is the next major backend milestone.
- Solana Actions support exists as a service path, but the supported demo path is currently the mobile web flow.

## Running Locally

Install dependencies:

```bash
npm ci
```

Start the app:

```bash
npm run dev --workspace app
```

Run the relayer locally:

```bash
npm run dev --workspace viral-sync-relayer
```

Build the Anchor program:

```bash
anchor build
```

Run the full verification suite:

```bash
npm run verify
```

`npm run verify` runs app lint/build, workspace TypeScript builds, `cargo check`, Anchor build, and the protocol test suite.

## Useful Commands

```bash
npm run typecheck
npm run verify
npm run production:readiness
npm run localnet:smoke
```

The localnet smoke path exercises the Causal Commerce loop with merchant registration, campaign creation, escrow funding, receipt recording, settlement, replay rejection, and vault close behavior.

## Environment Variables

App:

```text
NEXT_PUBLIC_SOLANA_RPC_URL
NEXT_PUBLIC_PROGRAM_ID
NEXT_PUBLIC_MERCHANT_PUBKEY
NEXT_PUBLIC_RELAYER_URL
LAUNCH_DATABASE_URL
LAUNCH_CAUSAL_SECRET
LAUNCH_MERCHANT_ACCESS_TOKEN
LAUNCH_STAFF_PIN
LAUNCH_ALLOWED_ORIGINS
```

Relayer:

```text
RPC_URL
RELAYER_SECRET
RELAYER_API_KEY
CORS_ORIGINS
ALLOWED_PROGRAM_IDS
MAX_TRANSACTION_BYTES=2048
```

Actions service:

```text
PUBLIC_BASE_URL
ACTION_ICON_URL
ACTIONS_ENABLED=false
```

## Verification

The current test suite covers:

- PDA derivation.
- Merchant and campaign account relationships.
- Receipt and nullifier uniqueness.
- Redemption code lifecycle.
- Idempotent reward ledger behavior.
- Staff confirmation gates.
- Relayer policy and replay controls.
- SDK verification helpers.
- Security hardening regressions.

The project currently passes:

```text
npm run verify
326 protocol/product/security tests
Anchor build
Next.js production build
Workspace TypeScript builds
```

## Roadmap

The highest-leverage next steps are:

1. Replace the launch ledger with normalized production tables.
2. Add real Anchor integration tests for every negative attack path.
3. Complete the dispute and bond vault models instead of re-enabling stubs.
4. Wire a production-grade indexer that verifies chain truth before marking receipts settled.
5. Run an external Solana audit before any uncapped mainnet campaign.
6. Move from pilot merchant fixtures to true multi-merchant onboarding.

## Tech Stack

- Next.js
- TypeScript
- Solana
- Anchor
- Rust
- Token-2022
- PostgreSQL
- Express
- Node.js

## License

MIT
