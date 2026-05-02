# Viral Sync

Viral Sync is the Causal Commerce Protocol for Solana: it proves when word-of-mouth causes real-world visits and settles rewards from merchant-funded escrow.

**Pay per verified visit, not per click.**

The project introduces Causal Receipts: privacy-preserving proofs that connect a referral path, a merchant-confirmed physical visit, and reward settlement. The repository contains the Anchor program, the Next.js launch app, a gas relayer, a Solana Actions service, POS/client adapters, launch tooling, and protocol tests.

## Judge start here

- [Winner scope](docs/winner-scope.md) states the one claim, the non-goals, and the version that should win.
- [Golden demo path](docs/golden-demo-path.md) defines the only walkthrough that matters for judging.
- [Winning demo](docs/winning-demo.md) gives the two-minute judge script.
- [Premium execution contract](docs/premium-execution-contract.md), [premium year plan](docs/premium-redesign-year-plan.md), [product narrative](docs/premium-product-narrative.md), [route inventory](docs/premium-ux-route-inventory.md), [information architecture](docs/premium-information-architecture.md), and [benchmark board](docs/premium-benchmark-board.md) define the premium redesign direction.
- [Premium design system](docs/premium-design-system.md) and [week 5-12 completion](docs/week-5-12-premium-redesign-completion.md) document the first code-backed premium UI tranche: tokens, typography, components, homepage, demo, and invite rebuilds.
- [Week 13-20 premium completion](docs/week-13-20-premium-redesign-completion.md) documents the rebuilt claim, redeem, staff scan, receipt proof, graph, replay, and screenshot QA tranche.
- [Week 21-28 premium completion](docs/week-21-28-premium-redesign-completion.md) documents the merchant shell, merchant today, campaign funding, ledger proof table, ops relayer, developer verifier, and example app tranche.
- [Week 29-38 premium completion](docs/week-29-38-premium-redesign-completion.md) documents trust-copy cleanup, conversion/state/accessibility hardening, motion, transaction UX, completion moments, and screenshot QA tooling.
- [Premium visual regression checklist](docs/premium-visual-regression-checklist.md) defines the automated and manual clipping, blank-screen, focus, and copy gates.
- [Week 39-52 premium completion](docs/week-39-52-premium-redesign-completion.md) documents final performance, accessibility, demo rehearsal, backup package, user-test artifacts, responsive gates, release candidate, and freeze criteria.
- [Premium final scorecard](docs/premium-final-scorecard.md), [premium release candidate](docs/premium-release-candidate.md), [demo rehearsal](docs/premium-demo-rehearsal.md), and [backup package](docs/premium-backup-package.md) define the final premium finish packet.
- [Year plan audit](docs/year-plan-audit.md) checks the 12-month plan against the current repo.
- [Protocol invariants](docs/protocol-invariants.md), [Security model](docs/security-model.md), and [Composability](docs/composability.md) cover defensive depth.
- [Production readiness](docs/production-readiness.md) and [Auditor start here](docs/auditor-start-here.md) define the real-world launch gates and external review packet.
- [Protocol spec v0](docs/protocol.md) defines Causal Receipts, Growth Bounties, nullifiers, and settlement rules.
- [Current state audit](docs/current-state.md) separates working prototype, experimental surfaces, and unsupported claims.
- [Reproducibility baseline](docs/reproducibility.md) keeps setup and verification commands explicit.

## Status

This codebase is ready for devnet pilot rehearsal. It is not audited for mainnet funds.

The Frontier build is scoped to one complete merchant loop: Thamel Brew House launches a Growth Bounty, customers share a Causal Invite, friends claim and redeem it in-store, and the merchant dashboard shows confirmed attribution.

Pilot program ID:

```text
8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9
```

Before mainnet, finish the external security audit, fund production relayer operations, rehearse incident response, and keep uncapped merchant funds disabled.

## Core docs

- [Docs index](docs/README.md)
- [Winner scope](docs/winner-scope.md)
- [Golden demo path](docs/golden-demo-path.md)
- [Winning demo](docs/winning-demo.md)
- [Premium product narrative](docs/premium-product-narrative.md)
- [Premium execution contract](docs/premium-execution-contract.md)
- [Premium redesign year plan](docs/premium-redesign-year-plan.md)
- [Premium UX route inventory](docs/premium-ux-route-inventory.md)
- [Premium information architecture](docs/premium-information-architecture.md)
- [Premium benchmark board](docs/premium-benchmark-board.md)
- [Week 1-4 premium redesign completion](docs/week-1-4-premium-redesign-completion.md)
- [Premium design system](docs/premium-design-system.md)
- [Week 5-12 premium redesign completion](docs/week-5-12-premium-redesign-completion.md)
- [Week 13-20 premium redesign completion](docs/week-13-20-premium-redesign-completion.md)
- [Week 21-28 premium redesign completion](docs/week-21-28-premium-redesign-completion.md)
- [Week 29-38 premium redesign completion](docs/week-29-38-premium-redesign-completion.md)
- [Premium visual regression checklist](docs/premium-visual-regression-checklist.md)
- [Week 39-52 premium redesign completion](docs/week-39-52-premium-redesign-completion.md)
- [Premium demo rehearsal](docs/premium-demo-rehearsal.md)
- [Premium backup package](docs/premium-backup-package.md)
- [Premium user test log](docs/premium-user-test-log.md)
- [Premium final scorecard](docs/premium-final-scorecard.md)
- [Premium release candidate](docs/premium-release-candidate.md)
- [Year plan audit](docs/year-plan-audit.md)
- [Protocol invariants](docs/protocol-invariants.md)
- [Security model](docs/security-model.md)
- [Production readiness](docs/production-readiness.md)
- [Auditor start here](docs/auditor-start-here.md)
- [Composability](docs/composability.md)
- [Case study](docs/CASE_STUDY.md)
- [Current state audit](docs/current-state.md)
- [Protocol spec v0](docs/protocol.md)
- [Reproducibility baseline](docs/reproducibility.md)
- [PDA layouts](docs/pda-layouts.md)
- [Security policy](SECURITY.md)

## Repository layout

```text
app/                  Next.js launch app and dashboard
clients/              POS and web client adapters
cranks/               Referral cleanup runner
launch/               Pilot input validation and stress tooling
programs/viral_sync/  Anchor program
relayer/              Transaction sponsorship service
server/actions/       Solana Actions API
tests/                Protocol tests
```

## Frontier demo path

```text
Invite -> Offer Claim -> Redeem Code -> Merchant Scan -> Receipt Explorer -> Causal Graph -> Fraud Demo
```

The visible demo should stay focused on this path. Routes outside that loop are supporting surfaces, not the main submission story.

## Final submission story

Viral Sync is built around one simple claim: merchants should pay for verified visits, not impressions or unverifiable referral clicks. The final demo should show the causal loop live: a customer creates an invite, a friend claims it, staff confirms the in-store visit, and the receipt proof becomes externally checkable.

Use these supporting routes when preparing the final video or judging walkthrough:

- `/developer` for SDK surface, verification API, example app, docs, and webhook signing.
- `/performance` for load targets, API latency, dashboard cache, relayer stress, and mobile readiness.
- `/legal` for promotion terms, privacy, merchant agreement, user terms, deletion, and local-market review.
- `/polish` for UX, mobile, copy, dashboard, receipt explorer, and accessibility review.
- `/hardening` for fresh clone, CI, protocol limits, security scan, demo data freeze, and smoke checks.
- `/submission` for the timed demo script, traction story, investor memo, and README plan.

Keep the limitations visible: this is a capped beta/devnet pilot rehearsal, not an audited uncapped mainnet launch.

## Next winning build

The next milestone is to make the Causal Receipt path fully live on localnet and devnet:

```text
Merchant Register -> Create Growth Bounty -> Fund Escrow -> Record Causal Receipt -> Settle Reward -> Verify Receipt
```

Week 1-3 groundwork is now represented by the winner scope, golden demo path, and a localnet merchant-registration script:

```bash
npm run build:program
npm run localnet:register-merchant -- --duplicate-check
```

The command expects a running local validator with the Viral Sync program deployed at the pilot program ID. It prints the Causal Merchant PDA, transaction signature, and confirms duplicate registration rejection for a fresh org id.

Week 4-10 extends that into the full localnet proof loop:

```bash
npm run build:program
npm run localnet:causal-commerce -- --replay-check
npm run localnet:verify-receipt -- --manifest tmp/localnet-causal-commerce.json
```

The localnet runner creates or reuses a merchant, creates a Growth Bounty, funds escrow state, records a Causal Receipt, proves replay rejection, settles the reward, and writes a manifest for independent verification. Current escrow funding is protocol state accounting; SPL vault custody is still a future hardening step before real funds.

Week 10-20 adds the full smoke and evidence packet:

```bash
npm run localnet:smoke
npm run localnet:proof-graph
npm run localnet:evidence-report
```

The smoke command was run against `solana-test-validator` through WSL with the Viral Sync program loaded locally. It found and fixed a real `record_causal_receipt` nullifier seed annotation bug, then passed with verifier `ok: true`.

Week 20-30 upgrades the localnet proof from escrow accounting to SPL Token custody. `fund_growth_bounty` now moves tokens from the merchant reward account into a reward vault owned by the Reward Escrow PDA, and `settle_receipt_reward` pays the referrer and visitor token accounts from that vault. The latest localnet smoke verified:

```text
merchant reward account: 10000 -> 0
reward vault: 0 -> 9000
referrer reward account: 0 -> 800
visitor reward account: 0 -> 200
```

Week 30-40 completes the vault lifecycle and hosted relayer/wallet wiring:

```bash
npm run localnet:smoke
```

The smoke path now runs replay rejection, SPL settlement, `close_growth_bounty`, merchant reclaim, and vault account close. The latest localnet proof verified:

```text
merchant reward account: 10000 -> 0 -> 9000
reward vault: 0 -> 9000 -> closed
referrer reward account: 0 -> 800 -> 800
visitor reward account: 0 -> 200 -> 200
```

Week 40-52 finalizes the judge package:

```bash
npm run frontier:submission
```

This validates the final artifact set and writes `docs/frontier-submission-packet.md` plus `docs/frontier-final-go-no-go.md`.

## What is working

- Mobile launch app with invite, claim, redeem code, passbook, and merchant dashboard flows.
- Public receipt explorer at `/receipts/<receipt-id>`.
- Causal graph view at `/causal-graph`.
- Fraud/replay demo at `/fraud-demo`.
- Launch ledger backed by Postgres in deployed pilots, with local JSON only as a developer fallback.
- Merchant code confirmation with a temporary staff PIN/API key gate while full staff-device auth is pending.
- Anchor program groundwork plus new Causal Commerce account layouts for merchant registration and Growth Campaigns.
- Protocol tests covering PDA derivation, launch claim behavior, commission accounting, and redeem-code normalization.

## What is experimental

- Causal Receipt recording and escrow settlement are being implemented incrementally.
- Hosted-app receipt references are deterministic demo references until relayer/wallet devnet submission is wired.
- QR visuals are currently labeled as demo visuals until scanner-grade QR generation/scanning is wired.
- Solana Actions exist as a service path, but the supported Frontier demo is the mobile web flow.

## Demo steps

1. Open `/invite` and create a Causal Invite.
2. Open the generated offer link as a second user/session and claim it.
3. Open `/redeem` and generate a counter code.
4. Open `/merchant/scan`, enter the code and `DEMO-PIN`, then confirm.
5. Open the generated receipt in `/receipts/<receipt-id>`.
6. Open `/causal-graph` to show the verified referral-to-visit edge.
7. Open `/fraud-demo` to show replay/nullifier guardrails.

## Verify

```bash
npm ci
npm run verify
npm run localnet:smoke
npm run frontier:submission
npm run premium:gate
npm run premium:final
```

`npm run verify` builds the app and every workspace package, runs `cargo check`, builds the Anchor program and IDL, and runs the protocol test suite.

## Local development

```bash
cp app/.env.example app/.env.local
cp relayer/.env.example relayer/.env
cp cranks/.env.example cranks/.env
cp server/actions/.env.example server/actions/.env

npm install
npm run dev --workspace app
npm run dev --workspace viral-sync-relayer
npm run dev --workspace viral-sync-actions
```

Build the program:

```bash
anchor build
```

## Production variables

```text
app:
  NEXT_PUBLIC_SOLANA_RPC_URL
  NEXT_PUBLIC_PROGRAM_ID
  NEXT_PUBLIC_MERCHANT_PUBKEY
  NEXT_PUBLIC_RELAYER_URL
  LAUNCH_DATABASE_URL

relayer:
  RPC_URL
  RELAYER_SECRET
  RELAYER_API_KEY
  CORS_ORIGINS

cranks:
  PROGRAM_ID
  RPC_URL
  CRANK_SECRET
  CRANK_DRY_RUN=false

actions:
  PUBLIC_BASE_URL
  ACTION_ICON_URL
  ACTIONS_ENABLED=false
```

The Actions API is intentionally disabled in the Frontier build until the transaction builder is wired. The mobile web claim flow is the supported demo path.

Use `LAUNCH_DATABASE_URL` for deployed pilots. Local JSON storage is only for development.

## Build on Viral Sync

The SDK exposes `verifyReceipt`, `fetchCausalGraph`, PDA derivation helpers, and `buildClaimAction`. A tiny integration example lives in `examples/receipt-verifier`.

## Pilot hosting

A zero-dollar pilot can run with:

```text
Next.js app:       Vercel Hobby
Launch database:  Neon Free Postgres
Relayer:          Render Free web service
Actions service:  Render Free web service
Crank dry-run:    GitHub Actions schedule
Program:          Solana devnet or testnet
```

Render free services sleep after idle periods, so this setup is for pilots, not production service-level commitments.

## License

MIT
