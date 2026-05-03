# Week 13-20 Premium Redesign Completion

Weeks 13-20 complete the first end-to-end premium core flow: offer claim, redeem, staff confirmation, receipt proof, causal graph, replay proof, and screenshot QA.

## Week 13: Offer Claim Rebuild

Completed:

- Rebuilt `/offer/[token]` with premium primitives.
- Preserved real `fetchReferralDetail`, `recordReferralOpen`, and `claimReferralLink` behavior.
- Added loading, error, blocked, and claim-ready states.
- Made the first viewport explain reward, merchant, expiry, and proof requirement before the claim action.

Evidence:

- `app/src/app/offer/[token]/page.tsx` no longer imports the legacy ticket surface.
- Primary CTA is `Claim this visit`.

## Week 14: Redeem Screen Rebuild

Completed:

- Rebuilt `/redeem` with premium code and QR handoff UI.
- Preserved real `fetchConsumerSummary` and `createRedeemCode` behavior.
- Kept the counter code as the main object above supporting copy.
- Added empty, loading, error, and message states.

Evidence:

- `app/src/app/redeem/page.tsx` no longer imports `RedeemScreen`.
- QR and manual code fallback are both visible.

## Week 15: Staff Scan Rebuild

Completed:

- Rebuilt `/merchant/scan` with first-class manual code entry.
- Preserved real `fetchMerchantSummary` and `confirmMerchantCode` behavior.
- Added explicit camera fallback language without requesting camera permission.
- Added staff PIN, optional receipt ID, clear, refresh, and receipt proof link states.

Evidence:

- `app/src/app/merchant/scan/page.tsx` no longer imports `StaffTerminalScreen`.
- Manual confirmation is visible above fold on mobile.

## Week 16: Receipt Proof Rebuild

Completed:

- Rebuilt `/receipts/[id]` as a flagship proof object.
- Shows receipt PDA, tx signature, attestation, settlement, Blink URL, public commitments, web fallback, compressed proof root, and privacy-safe path.
- Preserves `getReceiptExplorer` as the data source.

Evidence:

- `app/src/app/receipts/[id]/page.tsx` uses premium proof components and not the old proof page classes.

## Week 17: Causal Graph Rebuild

Completed:

- Rebuilt `/causal-graph` as a premium inspectable proof graph.
- Uses live `getCausalGraphData()` when receipts exist.
- Uses `getMultiHopDemo()` sample data when the ledger is empty so judges never see a dead panel.
- Every live edge links to receipt proof.

Evidence:

- Empty state is now a composed sample graph, not a blank explanation box.

## Week 18: Replay Proof Inline

Completed:

- Added inline replay proof to `/demo`.
- The demo now shows accepted claim, paid-once settlement, and rejected replay in the same judge-visible flow.

Evidence:

- `/demo` contains the "Replay proof" section and `.premium-replay-strip`.

## Week 19: Mobile QA Hardening

Completed:

- Added premium mobile rules for flow grids, proof grids, graph edges, replay strips, code displays, and mono proof rows.
- Kept route chrome immersive for `/offer/[token]`, `/redeem`, `/merchant/scan`, `/receipts/[id]`, and `/causal-graph`.
- Screenshot QA captures 390px mobile routes.

Evidence:

- `MerchantShell` includes immersive dynamic prefixes for `/offer/` and `/receipts/`.
- Screenshot manifest is generated under `tmp/premium-week-13-20-screenshots/manifest.json`.

## Week 20: Desktop QA Hardening

Completed:

- Desktop routes use full premium two-column layouts instead of phone-only canvases.
- Screenshot QA captures 1440px desktop routes.

Evidence:

- Screenshots are generated for `/offer/[token]`, `/redeem`, `/merchant/scan`, `/receipts/[id]`, `/causal-graph`, and `/demo`.

## Screenshot Evidence

Generated flow manifest:

- `tmp/premium-week-13-20-flow.json`

Screenshot evidence:

- `tmp/premium-week-13-20-screenshots/offer-desktop.png`
- `tmp/premium-week-13-20-screenshots/offer-mobile.png`
- `tmp/premium-week-13-20-screenshots/redeem-desktop.png`
- `tmp/premium-week-13-20-screenshots/redeem-mobile.png`
- `tmp/premium-week-13-20-screenshots/scan-desktop.png`
- `tmp/premium-week-13-20-screenshots/scan-mobile.png`
- `tmp/premium-week-13-20-screenshots/receipt-desktop.png`
- `tmp/premium-week-13-20-screenshots/receipt-mobile.png`
- `tmp/premium-week-13-20-screenshots/causal-graph-desktop.png`
- `tmp/premium-week-13-20-screenshots/causal-graph-mobile.png`
- `tmp/premium-week-13-20-screenshots/demo-desktop.png`
- `tmp/premium-week-13-20-screenshots/demo-mobile.png`
- `tmp/premium-week-13-20-screenshots/manifest.json`

The screenshot manifest reports no horizontal overflow for every captured route at 390px mobile and 1440px desktop.

## Verification Run

Completed during this tranche:

- `npm run build --workspace app`
- `npm run premium:gate`
- `npm run test:protocol -- --grep "week 13-20 premium redesign"`
- Chrome DevTools Protocol screenshot capture for the week 13-20 core routes at 1440px desktop and 390px mobile.

Final full-repo gate:

- `npm run verify`
