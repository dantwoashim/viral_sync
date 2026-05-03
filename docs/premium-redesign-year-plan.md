# Premium Redesign Year Plan

This is the credible 52-week execution plan. It is deliberately stricter than the earlier high-level plan: each week has a concrete deliverable and evidence gate.

## Phase 1: Strategy And Foundation

| Week | Outcome | Deliverable | Evidence Gate |
|---:|---|---|---|
| 1 | Product narrative reset | Premium narrative, audience, copy rules | `premium-product-narrative.md` exists and removes weak copy from target language. |
| 2 | Route sprawl controlled | Route inventory with keep/rebuild/archive decisions | Primary demo route set is seven routes or fewer. |
| 3 | Information architecture reset | Audience-specific shells | Consumer, Merchant, Ops, Developer, Lab, Demo shells defined. |
| 4 | Benchmark board | Premium reference board and design rules | Benchmark lessons map to Viral Sync-specific decisions. |
| 5 | Design tokens | Premium token map for color, spacing, type, radius, elevation, motion | Tokens exist in code and docs; old beige/brown dominance is marked deprecated. |
| 6 | Typography system | Font pairing, type scale, mono usage rules | App uses one UI sans and mono only for proof data. |
| 7 | Color and material system | Neutral base, proof dark, one action accent, semantic states | CSS variables and contrast notes exist; no new broad gradients. |
| 8 | Core components | Button, input, surface, proof row, status badge, shell primitives | Components render in a design-system page and build cleanly. |

## Phase 2: Core Proof Flow Rebuild

| Week | Outcome | Deliverable | Evidence Gate |
|---:|---|---|---|
| 9 | Proof-first homepage | `/` explains verified-visit rewards immediately | First viewport has promise, proof object, CTA, trust line. |
| 10 | `/demo` route | One orchestrated proof route | Demo shell shows step rail, active step, live proof panel. |
| 11 | Demo transaction panel | Status module for signatures, PDAs, vault, settlement | Uses localnet manifest when available; graceful empty state otherwise. |
| 12 | Visitor invite rebuild | `/invite` becomes task-first and mobile-safe | No horizontal clipping at 390px; primary CTA obvious. |
| 13 | Offer claim rebuild | `/offer/[token]` communicates reward, requirement, expiry, proof | Bottom nav cannot cover content; action path is one clear CTA. |
| 14 | Redeem screen rebuild | `/redeem` becomes a counter handoff surface | Code, expiry, and staff instruction visible above fold. |
| 15 | Staff scan rebuild | `/merchant/scan` handles camera/manual/permission states | Manual code and confirm button never crop on mobile. |
| 16 | Receipt proof rebuild | `/receipts/[id]` becomes flagship proof object | Shows receipt PDA, tx signature, settlement, replay status. |
| 17 | Causal graph rebuild | `/causal-graph` shows sample/live graph states | Empty state has sample graph or action; no dead white panel. |
| 18 | Replay proof inline | Replay attack becomes part of `/demo` | Success then replay failure visible in same flow. |
| 19 | Mobile QA hardening | Core routes pass mobile screenshots | 390px screenshots stored or generated; no clipping. |
| 20 | Desktop QA hardening | Core routes use full desktop space intelligently | 1440px screenshots show no phone-only dead canvas. |

## Phase 3: Trust, Conversion, And Shell Depth

| Week | Outcome | Deliverable | Evidence Gate |
|---:|---|---|---|
| 21 | Merchant shell foundation | Merchant navigation and dashboard frame | No consumer chrome in merchant pages. |
| 22 | Merchant Today premium | Vault, visits, settlements, risk, next action | No permanent skeletons; loaded demo state exists. |
| 23 | Campaign management | Funded bounty creation/status UI | Funding, cap, and close states are explicit. |
| 24 | Ledger proof table | Merchant ledger for receipts and settlements | Rows include signatures, status, amount, copy action. |
| 25 | Ops shell foundation | Admin pages moved into sober ops shell | No passbook visual metaphor in ops. |
| 26 | Relayer ops polish | Relayer status, caps, replay, error states | Policy and replay protection are clear. |
| 27 | Developer shell foundation | SDK/docs page rebuilt around verification | Code sample, receipt verifier, graph fetch visible. |
| 28 | Example app integration | Example receipt verifier linked from UI | A third-party developer can verify receipt from docs. |
| 29 | Trust copy pass | Remove hackathon/internal language from product screens | Search shows no banned phrases in primary UI files. |
| 30 | Conversion pass | CTAs and next actions standardized | Every core screen has one primary action. |
| 31 | Empty/error states | Real empty/error/pending/success components | Each core async path has all four states. |
| 32 | Accessibility pass 1 | Keyboard, labels, focus, contrast | Axe/manual checklist doc produced; critical failures fixed. |

## Phase 4: Premium Interaction And Perceived Speed

| Week | Outcome | Deliverable | Evidence Gate |
|---:|---|---|---|
| 33 | Motion language | Step transitions and proof status motion | Transform/opacity only; reduced motion respected. |
| 34 | Tactile controls | Buttons, chips, tabs, proof rows get polished states | Hover, active, focus, disabled, loading states verified. |
| 35 | Transaction pending UX | Pending, confirmed, failed tx states feel fast | User always knows what is happening and why. |
| 36 | Proof completion moment | Settlement and replay failure get memorable completion states | Motion supports comprehension, not decoration. |
| 37 | Screenshot QA tooling | Automated screenshots for core routes | Desktop/mobile screenshots generated by command. |
| 38 | Visual regression checklist | Clipping/blank/loading audits documented | CI or script catches blank/oversized screens. |
| 39 | Performance pass | Fonts, bundles, route loading, data fetches improved | Build passes; perceived speed notes documented. |
| 40 | Accessibility pass 2 | Screen reader and reduced-motion refinement | No critical accessibility blockers remain. |

## Phase 5: Premium Product Finish

| Week | Outcome | Deliverable | Evidence Gate |
|---:|---|---|---|
| 41 | Visual refinement sprint | Spacing, rhythm, density, surface cleanup | Before/after screenshots reviewed. |
| 42 | Copy refinement sprint | Concrete, trust-led copy across core screens | No filler or unsupported claims. |
| 43 | Demo rehearsal UI | `/demo` works under two minutes | Timer, fallback, and proof path tested. |
| 44 | Backup package | Localnet fallback package and video checklist | `frontier:submission` aligns with UI proof. |
| 45 | First-time user test | 5 users explain product in 10 seconds | Confusion log and fixes documented. |
| 46 | Merchant trust test | 3 merchant-style users assess funding trust | Objection log and fixes documented. |
| 47 | Developer test | 2 builders verify a receipt with SDK/example | Friction log and fixes documented. |
| 48 | Judge rehearsal | Mock judge flow and Q&A | Top confusion fixed in UI or script. |
| 49 | Final mobile polish | Core flow at 320, 390, 430px | No overlap, clipping, or hidden CTA. |
| 50 | Final desktop polish | Core flow at 1024, 1440, wide | Layout feels intentional, not stretched mobile. |
| 51 | Release candidate | Full build, tests, screenshots, packet | All verification commands pass. |
| 52 | Freeze and submit | Only blocker fixes; final package preserved | Final scorecard reaches premium target or lists exact deltas. |

## Hard Rule

From week 5 onward, a week is not complete unless it has code, UI, screenshot, test, or measurable verification evidence. Strategy-only completion is no longer enough.
