# Premium UX Route Inventory

Week 2 inventories the visible product surface and assigns each route a ruthless disposition. The goal is not to delete work; it is to stop the primary demo from feeling like seventy unrelated prototypes.

## Current Problem

The app exposes consumer, merchant, admin, protocol, growth, legal, performance, and submission surfaces with similar visual treatment. That makes internal proof pages look like product pages and makes product pages look like internal dashboards.

## Route Dispositions

| Route group | Current role | Disposition | Reason |
|---|---|---|---|
| `/` | Visitor passbook | Rebuild | First screen must explain verified-visit rewards, not show a loading passbook. |
| `/invite` | Create invite | Keep and rebuild | Core flow, but current ticket metaphor is too decorative and under-explains proof. |
| `/offer/[token]` | Visitor claim | Keep and rebuild | Core flow, currently too wide, clipped on mobile, and unclear about exact next action. |
| `/redeem` | Visitor code | Keep and rebuild | Core flow; must become a focused counter handoff screen. |
| `/merchant/scan` | Staff terminal | Keep and rebuild | Core flow; mobile clipping and camera states must be fixed first. |
| `/receipts/[id]` | Receipt proof | Keep and elevate | This should become the flagship proof artifact. |
| `/causal-graph` | Proof graph | Keep and elevate | Needs real/sample graph state, not a dead empty panel. |
| `/fraud-demo` | Replay proof | Keep, merge into demo | It should appear immediately after success, not as a separate detour. |
| `/merchant/today` | Merchant dashboard | Keep, but after demo | Needs real loaded metrics and a sober dashboard shell. |
| `/merchant/campaigns` | Campaign management | Keep later | Useful after the proof path is polished. |
| `/merchant/customers` | Customer view | Hide from demo | Not essential to verified-visit proof. |
| `/merchant/ledger` | Financial/receipt ledger | Keep later | Potentially high trust if redesigned around settlement records. |
| `/merchant/reports` | Reporting | Hide from demo | Too broad for first conversion. |
| `/merchant/onboarding` | Merchant setup | Keep later | Important for product, not for judge-first proof path. |
| `/merchant/launch-kit` | Marketing kit | Hide from demo | Useful after core value is understood. |
| `/merchant/templates` | Campaign templates | Hide from demo | Not a premium first impression. |
| `/merchant/training` | Staff training | Keep later | Should be linked from scan terminal only. |
| `/admin/*` | Ops/admin | Move to ops shell | Must not inherit consumer sidebar or soft passbook tone. |
| `/developer` | SDK/developer page | Keep as secondary | Needs composability proof and example app. |
| `/example-receipt-graph` | Example app page | Keep as secondary | Good for judges after core proof. |
| `/performance`, `/legal`, `/hardening`, `/submission` | Final package docs in UI | Move to judge package | They read like internal checklists, not product. |
| `/business`, `/billing-model`, `/traction`, `/growth`, `/retention` | Business planning | Archive from app nav | Useful docs, not premium product UI. |
| `/creators`, `/partners`, `/marketplace`, `/network`, `/routes` | Expansion concepts | Archive from primary demo | They dilute the verified-visit primitive. |
| `/compression`, `/oracle`, `/multi-hop`, `/risk`, `/fraud-graph` | Protocol experiments | Move to lab shell | Valuable, but not before the main proof works visually. |
| `/consumer/*`, `/passbook`, `/profile`, `/settings` | Consumer account surface | Merge into visitor passbook | Too many routes for a pilot-stage consumer. |
| `/pos`, `/evidence`, `/evidence/*` | Support tooling | Archive from primary demo | Keep only if proof demo needs it. |

## Primary Demo Route Set

Only these routes should be visible in the week 5-12 redesign:

```text
/demo
/invite
/offer/[token]
/redeem
/merchant/scan
/receipts/[id]
/causal-graph
```

## Secondary Proof Route Set

These can stay visible after the demo succeeds:

```text
/merchant/today
/merchant/campaigns
/merchant/ledger
/developer
/example-receipt-graph
/admin/relayer
```

## Archive Route Set

The remaining routes should move behind `/lab`, `/ops`, or documentation links until they receive a real design pass.

## Screenshots Reviewed

The week 1-4 audit reviewed local captures for:

- `/`
- `/invite`
- `/offer/demo-token`
- `/merchant/today`
- `/merchant/scan`
- `/receipts/receipt-1`
- `/causal-graph`
- `/fraud-demo`
- `/admin/relayer`
- `/submission`

The most damaging failures were mobile clipping, permanent loading states, consumer shell leakage into admin pages, and receipt/proof surfaces that did not carry the product emotionally.
