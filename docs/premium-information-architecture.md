# Premium Information Architecture

Week 3 defines the product structure that should replace the current route sprawl.

## Architecture Principle

One shell per audience. No consumer passbook chrome on admin pages. No judge checklist pages inside the customer product. No protocol experiments in the first-time user path.

## Target Shells

### 1. Proof Demo Shell

Route root: `/demo`

Purpose: two-minute judge and customer proof.

Navigation:

- Proof
- Invite
- Claim
- Confirm
- Receipt
- Replay
- SDK Verify

Design direction: full-width desktop workspace with a persistent step rail and live transaction panel. Mobile collapses to one task per screen.

### 2. Visitor Shell

Route roots:

- `/`
- `/invite`
- `/offer/[token]`
- `/redeem`
- `/passbook`

Purpose: claim and redeem a verified-visit reward.

Navigation:

- Pass
- Claim
- Redeem
- History

Design direction: Apple Wallet-adjacent pass object, but with clearer proof and less decorative texture.

### 3. Merchant Shell

Route roots:

- `/merchant/today`
- `/merchant/campaigns`
- `/merchant/scan`
- `/merchant/ledger`
- `/merchant/settings`

Purpose: fund bounty, verify visits, inspect settlements.

Navigation:

- Today
- Campaigns
- Scan
- Ledger
- Settings

Design direction: Stripe/Vercel-style operational dashboard. Dense, quiet, table-friendly, and proof-first.

### 4. Ops Shell

Route roots:

- `/admin/relayer`
- `/admin/security`
- `/admin/support`
- `/admin/pilot`

Purpose: safety, relayer, support, and capped pilot control.

Navigation:

- Relayer
- Security
- Support
- Pilot

Design direction: sober internal tooling. No ticket metaphor.

### 5. Developer Shell

Route roots:

- `/developer`
- `/example-receipt-graph`
- `/api/actions/causal-receipt/[id]`

Purpose: SDK, verification, API, composability.

Navigation:

- Verify receipt
- SDK
- Actions
- Example app

Design direction: Vercel/Stripe docs quality: copyable code, status badges, live sample receipt.

### 6. Lab Shell

Route roots:

- `/compression`
- `/oracle`
- `/multi-hop`
- `/fraud-graph`
- `/risk`

Purpose: experimental protocol surfaces.

Navigation:

- Compression
- Oracle
- Multi-hop
- Risk
- Fraud graph

Design direction: clearly labeled experimental lab, not primary product.

## Top-Level Navigation Rule

Primary product nav should expose only:

```text
Demo
Merchant
Visitor
Developers
Docs
```

Everything else is nested or hidden.

## URL Migration Table

| Current route | Target location |
|---|---|
| `/submission` | `docs/frontier-submission-packet.md` and `/demo` sidebar only |
| `/performance` | `/ops/performance` or docs |
| `/legal` | docs |
| `/polish` | docs |
| `/hardening` | docs |
| `/traction` | docs or merchant report |
| `/growth` | merchant reports after redesign |
| `/business` | docs/business packet |
| `/consumer/*` | visitor shell |
| `/partners`, `/creators`, `/marketplace` | lab/archive until core proof is premium |

## First Premium Navigation Milestone

Implement `/demo` as the primary entry point before redesigning the rest. A world-class narrow flow beats a broad mediocre app.
