# Viral Sync

Viral Sync is the Causal Commerce Protocol for Solana: it proves when word-of-mouth causes real-world visits and settles rewards from merchant-funded escrow.

**Pay per verified visit, not per click.**

The project introduces Causal Receipts: privacy-preserving proofs that connect a referral path, a merchant-confirmed physical visit, and reward settlement. The repository contains the Anchor program, the Next.js launch app, a gas relayer, a Solana Actions service, POS/client adapters, launch tooling, and protocol tests.

## Status

This codebase is ready for devnet pilot rehearsal. It is not audited for mainnet funds.

The Frontier build is scoped to one complete merchant loop: Thamel Brew House launches a Growth Bounty, customers share a Causal Invite, friends claim and redeem it in-store, and the merchant dashboard shows confirmed attribution.

Pilot program ID:

```text
8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9
```

Before mainnet, finish the external security audit, wire production wallet infrastructure, complete Causal Receipt settlement, expand local-validator instruction tests, and connect monitoring for the hosted services.

## Portfolio docs

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
