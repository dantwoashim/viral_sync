# Premium Benchmark Board

Week 4 defines the design bar. These benchmarks are not for copying visual style; they define product qualities Viral Sync must match.

## Sources Reviewed

- Linear: https://linear.app/homepage
- Stripe Dashboard basics: https://docs.stripe.com/dashboard/basics
- Stripe app design guidance: https://docs.stripe.com/stripe-apps/design
- Vercel dashboard docs: https://vercel.com/docs/concepts/dashboard-features
- Vercel new dashboard: https://vercel.com/try/new-dashboard
- Apple Wallet: https://www.apple.com/wallet/
- Framer animations: https://www.framerapp.com/features/animations/index.html
- Notion: https://www.notion.com/en-US
- Airbnb app listing: https://apps.apple.com/us/app/airbnb/id401626263

## Benchmark Lessons

| Benchmark | What to steal | What not to steal | Viral Sync application |
|---|---|---|---|
| Linear | Calm density, sharp hierarchy, keyboard-speed product feel | Dark-tech imitation for its own sake | Merchant dashboard and ops shell should feel fast, sparse, and exact. |
| Stripe | Trust-first financial UX, restrained dashboards, object detail pages | Generic fintech gradients | Receipt page should behave like a payment detail page: status, amount, parties, timeline, proof. |
| Vercel | Scope switching, deployment/status clarity, command/search patterns | Over-indexing on developer-only aesthetic | Relayer and developer shells should expose status and actions without theatrical styling. |
| Apple Wallet | Tactile pass objects, clear state, consumer trust | Overdecorated fake wallet UI | Visitor pass can be physical and memorable, but must remain readable and operational. |
| Airbnb | Mobile trust, task flow clarity, booking confidence | Lifestyle imagery unrelated to proof | Claim/redeem should make the next action obvious and reduce anxiety. |
| Framer | Motion as comprehension, not decoration | Constant animation that hides poor hierarchy | Use motion to move users between proof steps and status changes only. |
| Notion | Progressive disclosure and flexible workspace mental model | Blank-canvas ambiguity | Developer and docs surfaces should be calm, readable, and composable. |

## Visual Direction

Use:

- off-white or zinc neutral base;
- deep green or charcoal proof modules;
- one action accent;
- mono only for hashes, signatures, amounts, and program IDs;
- no permanent fake mobile status bars on desktop;
- no broad beige/brown saturation across the entire product;
- no decorative background patterns except inside pass/proof objects.

## Layout Direction

### Demo

```text
Left: step rail
Center: current proof action
Right: live transaction / receipt state
```

### Merchant

```text
Top: campaign and vault health
Middle: visits, settlements, pending risk
Bottom: ledger and recent receipts
```

### Visitor

```text
Top: pass/reward state
Middle: one next action
Bottom: history and proof summary
```

### Developer

```text
Top: verify a receipt
Middle: SDK code sample
Bottom: graph and webhook references
```

## Motion Direction

- Step transitions use transform and opacity only.
- Transaction states use small status motion.
- Receipt settlement can use one satisfying completion transition.
- Disable decorative perpetual motion in data dashboards.
- Respect reduced motion.

## Trust Direction

Every core screen should show one trust object:

- vault balance;
- transaction signature;
- receipt PDA;
- nullifier status;
- settlement record;
- replay rejection;
- audit limitation.

## Premium Bar

The design is not premium until a first-time user can answer these in ten seconds:

1. What does Viral Sync do?
2. Who pays?
3. What gets verified?
4. Where is the Solana proof?
5. Why can the reward not be claimed twice?
