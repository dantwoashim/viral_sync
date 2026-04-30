# Current State Audit

This audit maps the visible repository to the first Viral Sync implementation plan. The goal is to keep the Frontier story honest while the Causal Receipts work moves from prototype to protocol.

## Claim Labels

| Area | Label | Current truth |
|---|---|---|
| Consumer passbook | Real prototype | The app exposes home, invite, redeem, passbook, profile, and offer claim routes backed by the launch ledger. |
| Referral creation and claim | Real prototype | Referral links, open counts, claim records, self-referral blocking, and duplicate claim reuse are implemented in the launch service. |
| Merchant dashboard | Real prototype | Merchant summary, queue, customers, alerts, and ledger views are generated from the launch ledger. |
| Merchant confirmation | Real prototype / capped beta | Counter code confirmation, temporary staff PIN/API key gate, merchant sessions, role checks, staff-device enrollment/revocation, audit events, and manager void flow exist. Replace temporary PIN with production RBAC before broad beta. |
| QR display | Partial / labeled | QR rendering and manual fallback exist for the demo path. Scanner-grade capture remains a roadmap item and should stay labeled accordingly. |
| Launch ledger | Real prototype | The app can use Postgres through `LAUNCH_DATABASE_URL`; local JSON remains a development fallback only. Repository/service boundaries, migrations, idempotency, outbox, and seed/reset paths are implemented for pilot rehearsal. |
| Solana program | Experimental / verified build | The Anchor program includes merchant config, token generation, referral, commission, session, escrow/oracle primitives, and Causal Commerce account scaffolding. `cargo check`, Anchor build, and protocol tests pass locally. |
| Growth Bounty | Experimental / state path | Growth Campaign and reward escrow account shapes exist with state-level funding and settlement invariants. Full audited token movement remains a pre-mainnet requirement. |
| Causal Receipt | Real prototype / not audited | Product receipt metadata, signed invite/nullifier/challenge flow, receipt explorer, graph, verification API, compression proof metadata, and settlement-state tests exist. Uncapped mainnet settlement still requires external review/audit. |
| Solana Actions | Experimental | The Actions service exists, but the README must keep the launch flow focused on mobile web until Actions are wired for live receipt transactions. |
| Production security | Capped beta only | Input validation, rate limits, CSRF/origin checks, security headers, session handling, staff-device flow, audit events, fraud review, relayer policy, spend caps, incident runbooks, security gates, and disclosure docs exist. External audit and production RBAC remain blockers for uncapped mainnet. |

## Honest Claims Today

- Viral Sync is a working prototype of a Solana-native referral and loyalty loop for a pilot merchant.
- The launch app demonstrates invite, claim, redeem code, merchant confirmation, and attribution ledger flow.
- The protocol direction is Causal Receipts: proving that word-of-mouth caused a real merchant-confirmed visit.
- The demo path now records signed Causal Invite, nullifier, one-time challenge, dual-attestation hash, and receipt metadata.
- The codebase is not audited and is not mainnet-ready for funds.
- Local JSON storage is development-only; deployed pilots should use Postgres.

## Unsupported Claims To Avoid

- Do not claim fraud-proof referrals.
- Do not claim audited mainnet settlement.
- Do not claim real QR scanning until scanner-grade QR generation and scan handling are implemented.
- Do not claim POS integration beyond adapters and planned pilot hooks.
- Do not headline Token-2022 transfer hooks as a finished product path until receipt settlement uses them end to end.

## Verification Baseline

Primary command:

```bash
npm run verify
```

Expected coverage:

- Next.js lint and production build.
- Workspace TypeScript builds.
- Rust `cargo check`.
- Anchor build.
- Protocol test suite.

Any failing command should be recorded in this file or the PR notes before a public claim is made.

Latest run:

```text
2026-04-29: npm run verify passed.
2026-04-29 Day 10-20: npm run verify passed after Growth Bounty, Causal Receipt, challenge, and attestation work.
2026-04-29 Day 20-30: npm run verify passed after receipt explorer, causal graph, fraud demo, Frontier docs, and server-issued guest sessions.
2026-04-29 Day 30-40: auth, staff device, audit, migration, repository, seed/reset, reward ledger, and idempotency baseline implemented.
2026-04-29 Day 30-40: npm run verify passed with 23 protocol tests.
2026-04-29 Day 40-50: outbox, production DB guard, formal state machines, cryptographic redeem codes, idempotent confirmation, manager void, and UI screen barrel implemented.
2026-04-29 Day 40-50: npm run verify passed with 26 protocol tests.
2026-04-29 Day 50-60: real QR rendering, scanner/manual fallback copy, loading/error polish, DB-derived dashboard metrics, runtime validation, common API error shape, CSRF origin checks, and security headers implemented.
2026-04-29 Day 50-60: npm run verify passed with 28 protocol tests.
2026-04-29 Day 70-80: fraud review report, merchant onboarding, campaign publishing, staff training mode, launch kit, support search console/API, pilot playbook/FAQ/staff guide, go/no-go, merchant #1 onboarding, live-test plan, and blocker notes implemented.
2026-04-29 Day 70-80: npm run verify passed with 32 protocol tests.
2026-04-29 Day 80-90: merchant #2/#3 reusable roster, pilot metrics dashboard, weekly memo, funnel leak analysis, richer sharing copy, faster staff terminal entry, campaign templates, weekly merchant report, and testimonial collection implemented.
2026-04-29 Day 80-90: npm run verify passed with 37 protocol tests.
2026-04-29 Day 90-100: weekly iteration review, receipt verification Action use case, Action metadata/POST intent endpoints, Blink receipt share, walletless fallback docs, Blinks review page, relayer policy, and sponsored transaction simulation API implemented.
2026-04-29 Day 90-100: npm run verify passed with 41 protocol tests.
2026-04-29 Day 100-112: sponsored tx replay protection, spend caps, relayer monitoring, receipt submit/index outbox, attack review, program event indexer, receipt reconciliation, causal graph API/UI, multi-hop demo, graph privacy review, and technical review docs implemented.
2026-04-29 Day 100-112: npm run verify passed with 46 protocol tests.
2026-04-29 Day 112-122: reward liability dashboard, billing event model, cost per verified visit, invoice CSV/export, paid pilot proposal and ask, weekly business review, partner accounts, partner source attribution, payout rules, and partner dashboard implemented.
2026-04-29 Day 112-122: npm run verify passed with 51 protocol tests.
2026-04-29 Day 123-133: partner dashboard review, cross-merchant campaign, partner fraud controls, weekly partner review, evidence confidence model, manual receipt IDs, CSV import, attributed spend metrics, Solana Pay reference prototype, POS research, and weekly evidence review implemented.
2026-04-29 Day 123-133: npm run verify passed with 55 protocol tests.
2026-04-29 Day 134-144: threat model v2, CSRF/XSS/session notes and tests, secret/dependency scan workflow, program security review, relayer abuse drill, incident runbooks, weekly security gate, capped beta scope, upgrade authority policy, deployment rehearsal, and migration rehearsal implemented.
2026-04-29 Day 134-144: npm run verify passed with 59 protocol tests.
2026-04-29 Day 145-155: external review packet, high-severity fix tracking, weekly beta go/no-go, capped beta deployment scope, real merchant campaign runbook, receipt reconciliation/proof asset checklist, failure recovery plan, published technical docs summary, beta memo, and 30-lead merchant pipeline implemented.
2026-04-29 Day 145-155: npm run verify passed with 64 protocol tests.
2026-04-29 Day 156-166: onboarding conversion, merchant health scoring, campaign recommendations, weekly merchant reports, paid conversion asks, weekly growth review, final pitch, architecture diagram, traction dashboard, case studies, and technical deep-dive script implemented.
2026-04-29 Day 156-166: npm run verify passed with 71 protocol tests.
2026-04-29 Day 167-177: 90-second demo package, weekly submission review, privacy-safe fraud graph, partner quality scoring, risk simulation suite, merchant fraud education, settlement hold tuning, fraud case study, weekly fraud review, compression scope, and no-PII Merkle leaf schema implemented.
2026-04-29 Day 167-177: npm run verify passed with 79 protocol tests.
2026-04-29 Day 178-188: local compressed receipt tree proof, receipt explorer proof metadata, compression cost/fallback/review docs, public SDK surface/package, verification API, example receipt graph app, developer docs, and signed webhook helper implemented.
2026-04-29 Day 178-188: npm run verify passed with 87 protocol tests.
2026-04-29 Day 189-199: weekly developer review blocker log, neighborhood route/pass marketplace, merchant discovery, cross-promotion split setup, route-pass redemption, marketplace controls, small neighborhood test, weekly marketplace review, creator campaign spec, creator onboarding, and creator link analytics implemented.
2026-04-29 Day 189-199: npm run verify passed with 96 protocol tests.
2026-04-29 Day 200-210: creator payout settlement, fraud-aware leaderboard, micro-creator test, weekly creator review, campaign assistant spec, rule-based assistant, liability simulator, copy generator, fraud-safe recommendations, assistant analytics, and weekly assistant review implemented.
2026-04-29 Day 200-210: npm run verify passed with 106 protocol tests.
2026-04-29 Day 211-221: selected POS CSV/import path, adapter skeleton, payment-to-redemption matching, reconciliation UI, failure handling, one-merchant POS pilot, weekly POS review, unified passbook model, reward history UI, nearby opt-in campaigns, and notification preferences implemented.
2026-04-29 Day 211-221: npm run verify passed with 116 protocol tests.
2026-04-29 Day 222-232: fraud-safe referral streaks, 10-user passbook feedback, weekly passbook review, location hierarchy, location campaign targeting, location analytics, staff transfer/revocation, regional manager role, two-location simulation, weekly multi-location review, and finalized usage/take-rate/SaaS fee model implemented.
2026-04-29 Day 222-232: npm run verify passed with 126 protocol tests.
2026-04-29 Day 233-244: automated invoicing, secure manual/local payment collection path, friendly dunning, revenue dashboard, paid merchant push, weekly billing review, audit prep checklist, invariant docs, expanded negative coverage, external review tracker, high-severity disclosure fix, and known-limitations update implemented.
2026-04-29 Day 233-244: npm run verify passed with 137 protocol tests.
2026-04-29 Day 245-255: weekly security review with mainnet caps, formal audit prep handoff, formal invariant docs, negative/property coverage targets, external review tracker, high-severity regression tracking, formal disclosure update, security launch checklist, and strict-cap mainnet beta assistant/spec/liability simulator implemented.
2026-04-29 Day 245-255: npm run verify passed with 148 protocol tests.
2026-04-29 Day 256-286: mainnet beta copy/recommendation analytics, ops SLOs/alerts/restore/outbox/status reviews, canonical analytics/cohort/ROI/data-quality/export reviews, retention playbooks/templates/adherence/case study, and partner network expansion plan/core/integration/hardening/measurement/pilot implemented.
2026-04-29 Day 256-286: npm run verify passed with 177 protocol tests.
2026-04-29 Day 287-331: partner network weekly review, SDK/developer ecosystem v2, public verification and signed webhook review, load/performance/mobile review, legal/compliance drafts, UX/mobile/copy/dashboard/receipt/accessibility polish, fresh-clone/CI/protocol/security/demo-data hardening, final traction assets, README plan, investor memo, and timed demo script implemented.
2026-04-29 Day 287-331: npm run verify passed with 222 protocol tests.
2026-04-29 Day 332-365: final video/deep-dive/deck/visual asset plan, judge/technical/business/security Q&A, rehearsal/mock judging/freeze/submission archive, follow-up demo/investor/merchant/postmortem/milestone/restabilization plans, POS import-first next-stage plan, and Day 365 operating backlog implemented.
2026-04-29 Day 332-365: npm run verify passed with 256 protocol tests.
2026-04-29 Coverage audit: implementation plan has 365 day entries, `docs/*day-*.md` has 365 matching day artifacts, and missing day artifact count is 0.
```
