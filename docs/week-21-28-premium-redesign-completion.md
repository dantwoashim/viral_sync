# Week 21-28 Premium Redesign Completion

Weeks 21-28 complete the secondary proof surfaces: merchant operating shell, merchant today, campaign funding, ledger proof table, ops relayer shell, developer verification shell, and example app integration.

## Week 21: Merchant Shell Foundation

Completed:

- Added a dedicated premium workspace shell for merchant routes.
- Removed consumer/passbook chrome from `/merchant/today`, `/merchant/campaigns`, and `/merchant/ledger`.
- Merchant navigation now focuses on Today, Campaigns, Scan, and Ledger.

Evidence:

- `app/src/components/premium/PremiumWorkspace.tsx` defines `Merchant console`.
- `app/src/components/MerchantShell.tsx` makes the rebuilt merchant routes immersive so they do not inherit the old broad consumer shell.

## Week 22: Merchant Today Premium

Completed:

- Rebuilt `/merchant/today` around vault posture, visit desk, settlement state, risk, and next action.
- Uses real `getMerchantSummary()` and `getReceiptReconciliation()` data.
- Loaded demo state exists without permanent skeletons.

Evidence:

- Page headline: `Today shows vault, visits, settlements, risk, and the next action.`
- The route shows live queue rows, alerts, settled/indexed receipt counts, and a primary next action.

## Week 23: Campaign Management

Completed:

- Rebuilt `/merchant/campaigns` with explicit funding, cap, and close states.
- Preserved the real `/api/launch/campaigns` publish path.
- The preview calculates visit trigger, redemption window, and estimated liability.

Evidence:

- Page headline: `Campaigns make funding, cap, and close states explicit.`
- Primary action is `Publish funded bounty`.

## Week 24: Ledger Proof Table

Completed:

- Rebuilt `/merchant/ledger` as a merchant-facing receipt settlement table.
- Rows include receipt link, status badge, amount, transaction signature, and copy action.
- Empty state explains what will appear after confirmation.

Evidence:

- Page headline: `Merchant ledger rows include signatures, status, amount, and copy action.`
- `CopyValueButton` provides the signature copy action.

## Week 25: Ops Shell Foundation

Completed:

- Added a sober ops workspace for `/admin/relayer`.
- Removed the passbook/ticket visual metaphor from the relayer ops route.
- Navigation now treats relayer, security, support, and pilot as internal tools.

Evidence:

- `/admin/relayer` renders inside `PremiumWorkspace` with `audience="ops"`.
- Page includes the exact line `No passbook visual metaphor in ops.`

## Week 26: Relayer Ops Polish

Completed:

- Rebuilt relayer ops around policy, caps, replay attack simulation, queue health, and failure states.
- Uses real `getRelayerMonitoring()`, `getRelayerPolicy()`, `runRelayerAttackSimulation()`, and `getReceiptReconciliation()`.
- Error reasons display as first-class states when present.

Evidence:

- Page headline: `Relayer control room for caps, replay, and failure states.`
- The page shows `Policy simulation required`, wallet/campaign/merchant caps, replay protection, and outbox failed count.

## Week 27: Developer Shell Foundation

Completed:

- Rebuilt `/developer` around receipt verification, SDK helpers, graph fetch, and signed webhooks.
- Added a copyable code sample for `verifyReceipt` and `fetchGraph`.
- Developer shell has focused navigation for verifier, SDK, Actions, and example app.

Evidence:

- Page headline: `Developers can verify receipts without touching the Viral Sync app.`
- The page contains `verifyReceipt`, `fetchGraph`, `Receipt verifier`, and `Copy code`.

## Week 28: Example App Integration

Completed:

- Rebuilt `/example-receipt-graph` as a minimal external app.
- It verifies one receipt, fetches graph data, lists graph nodes, and handles missing receipts.
- Links the example app back to the SDK docs and proof page or demo fallback.

Evidence:

- Page headline: `A third-party developer can verify receipt from docs.`
- The route uses `getPublicReceiptVerification()` and `getCausalGraphData()`.

## Verification Run

Completed during this tranche:

- `npm run lint --workspace app`
- `npm run build --workspace app`
- `npm run premium:gate`
- `npm run test:protocol -- --grep "week 21-28 premium redesign"`

Final full-repo gate:

- `npm run verify`
