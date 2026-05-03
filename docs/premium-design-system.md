# Premium Design System

This is the week 5-8 product foundation for the premium redesign. It replaces the old passbook-first visual language on the primary judge surfaces with a restrained proof-first system.

## Tokens

The source of truth lives in `app/src/lib/premium/design-system.ts` and the CSS variables live in `app/src/app/globals.css`.

| Area | Decision |
|---|---|
| Background | `#f7f8f5`, a near-neutral product base. |
| Surface | White and off-white raised surfaces only. |
| Proof material | `#0b1714`, used for transaction panels and receipt proof modules. |
| Action accent | `#246b58`, reserved for primary action, active proof states, and success emphasis. |
| Semantic states | Success, warning, and danger exist only for status interpretation. |
| Radius | 6px, 8px, 12px. Large soft toy-like cards are deprecated. |
| Elevation | Two shadows: soft product elevation and darker proof elevation. |

The old broad beige/brown passbook dominance is deprecated for primary conversion routes. It can remain in archived or legacy screens until those routes are rebuilt, but it must not be extended into new premium routes.

## Typography

The app shell now uses Geist for UI text and Geist Mono for proof data. Mono is reserved for addresses, signatures, PDAs, vault IDs, receipt IDs, and developer code. It should not be used for marketing copy, body copy, or navigation labels.

Type hierarchy:

| Role | Use |
|---|---|
| `premium-h1` | One dominant promise per page. |
| `premium-h2` | Section-level statement, not generic labels. |
| `premium-lede` | One clear explanation of the product or task. |
| `premium-copy` | Supporting copy only. |
| `PremiumProofRow` | Dense proof data with truncation and mobile wrapping. |

## Components

The reusable primitives live in `app/src/components/premium/PremiumUi.tsx`.

| Component | Purpose |
|---|---|
| `PremiumShell` | Full-page premium route wrapper with responsive width and `100dvh` base. |
| `PremiumNav` | Small, quiet premium navigation for demo/product routes. |
| `PremiumButton` | Primary, secondary, and quiet commands. |
| `PremiumSurface` | Light, raised, or proof material sections. |
| `PremiumStatusBadge` | Compact status language. |
| `PremiumMetric` | Small proof/conversion facts. |
| `PremiumProofRow` | Label, metadata, mono proof value, and state. |
| `PremiumStepRail` | Judge demo progression. |
| `PremiumTransactionPanel` | Dark proof module for signatures and PDAs. |

The component preview route is `/design-system`.

## Route Application

Weeks 9-12 apply the system to visible product surfaces:

| Week | Route | Completion |
|---:|---|---|
| 9 | `/` | Proof-first homepage with verified-visit promise, CTA, trust proof rows, and metrics. |
| 10 | `/demo` | Dedicated proof demo with step rail and active localnet proof panel. |
| 11 | `/demo` | Transaction panel reads `tmp/localnet-causal-commerce.json` when available and has a graceful empty state. |
| 12 | `/invite` | Visitor invite is task-first, one primary CTA, proof rows wrap on mobile. |

## Premium Rules

- No new route should use the old beige/brown passbook metaphor as the primary visual language.
- No primary screen should lead with generic growth, community, or rewards copy before explaining verified visits.
- No proof row may require horizontal page scroll on mobile.
- No transaction panel should show fake signatures as if they are real. If localnet evidence is missing, the UI must say so.
- No broad decorative gradients, blobs, or visual filler should appear on premium routes.
