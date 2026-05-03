# Week 29-38 Premium Redesign Completion

Weeks 29-38 complete the first broad trust and polish hardening pass: product copy cleanup, conversion discipline, real async states, accessibility pass, motion language, tactile states, transaction pending UX, proof completion moments, screenshot tooling, and a visual regression checklist.

## Week 29: Trust Copy Pass

Completed:

- Removed visible week/judge/internal language from primary product screens.
- Added `npm run premium:copy` to scan primary UI files for banned product-screen copy.
- Updated the graph headline from judge-specific language to product-facing inspection language.

Evidence:

- `scripts/audit-premium-copy.mjs`
- `/causal-graph` now says `A visit graph anyone can inspect.`

## Week 30: Conversion Pass

Completed:

- Core screens keep a single dominant primary action in the first viewport.
- Offer claim, redeem, staff scan, merchant today, campaign publish, ledger, relayer, developer, and example app actions now map to the next actual task.
- Secondary actions remain lower-emphasis links or buttons.

Evidence:

- Primary actions remain explicit: `Claim this visit`, `Generate code`, `Confirm visit`, `Publish funded bounty`, `Open example app`.

## Week 31: Empty/Error States

Completed:

- Added reusable `PremiumAsyncState`.
- Applied loading, empty, pending, success, and error states to the core async paths.
- Campaign publish, offer loading/error, redeem empty/pending/error, and staff scan result/error now share the same state language.

Evidence:

- `app/src/components/premium/PremiumUi.tsx` exports `PremiumAsyncState`.
- `app/src/app/offer/[token]/page.tsx`, `app/src/app/redeem/page.tsx`, `app/src/app/merchant/scan/page.tsx`, and `app/src/app/merchant/campaigns/page.tsx` use it.

## Week 32: Accessibility Pass 1

Completed:

- Added visible `:focus-visible` rules for primary links, buttons, nav items, inputs, table actions, and graph edges.
- Added `aria-live` status regions for async and transaction state components.
- Preserved form labels on core inputs.
- Added a visual gate check for focus-visible CSS presence.

Evidence:

- `app/src/app/globals.css` includes `:focus-visible`.
- `PremiumAsyncState` uses `role="status"` or `role="alert"` with `aria-live="polite"`.

## Week 33: Motion Language

Completed:

- Added restrained entrance motion for premium route sections.
- Added status pulse and completion shimmer.
- Added `prefers-reduced-motion: reduce` handling.
- Motion uses transform and opacity rather than layout-changing properties.

Evidence:

- `premiumRise`, `premiumPulse`, and `premiumShimmer` live in `app/src/app/globals.css`.
- Reduced motion override is included in the same file.

## Week 34: Tactile Controls

Completed:

- Buttons, nav links, proof rows, table rows, and graph edges now have polished hover, active, focus, disabled, and status states.
- Proof rows have tactile hover/active treatment without changing layout.

Evidence:

- `.premium-button:active`, `.premium-proof-row:hover`, `.premium-table-action:focus-visible`, and `.premium-button:disabled` are present in CSS.

## Week 35: Transaction Pending UX

Completed:

- Added reusable `PremiumTransactionStatus`.
- The demo route now shows pending, confirmed, and failed transaction states in one visible proof sequence.

Evidence:

- `app/src/components/premium/PremiumUi.tsx` exports `PremiumTransactionStatus`.
- `/demo` includes `Recording receipt`, `Settlement confirmed`, and `Replay rejected`.

## Week 36: Proof Completion Moment

Completed:

- Added reusable `PremiumCompletionMoment`.
- The demo route now marks the proof completion as a specific moment: one verified visit creates one settlement.

Evidence:

- `app/src/components/premium/PremiumUi.tsx` exports `PremiumCompletionMoment`.
- `/demo` includes `Reward settled once`.

## Week 37: Screenshot QA Tooling

Completed:

- Added `npm run premium:screenshots`.
- The script launches headless Chrome, captures 12 primary/secondary premium routes at 1440px and 390px, and writes a manifest.

Evidence:

- `scripts/capture-premium-screenshots.mjs`
- `tmp/premium-week-29-38-screenshots/manifest.json`

## Week 38: Visual Regression Checklist

Completed:

- Added `npm run premium:visual-gate`.
- Added a documented manual/automated visual regression checklist.
- Visual gate checks overflow, blank pages, missing h1, old chrome, banned copy, and focus-visible styles.

Evidence:

- `scripts/audit-premium-visuals.mjs`
- `docs/premium-visual-regression-checklist.md`

## Verification Run

Completed during this tranche:

- `npm run premium:copy`
- `npm run premium:gate`
- `npm run test:protocol -- --grep "week 29-38 premium redesign"`
- `npm run build --workspace app`
- `npm run premium:screenshots`
- `npm run premium:visual-gate tmp/premium-week-29-38-screenshots/manifest.json`

Final full-repo gate:

- `npm run verify`
