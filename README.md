# Viral Sync

Viral Sync is a Solana referral and loyalty protocol for merchant-funded rewards. The repository contains the Anchor program, the Next.js launch app, a gas relayer, a Solana Actions service, POS/client adapters, launch tooling, and protocol tests.

## Status

This codebase is ready for devnet pilot rehearsal. It is not audited for mainnet funds.

The Frontier build is scoped to one complete merchant loop: Thamel Brew House launches a merchant-funded coffee reward, customers share a mobile pass, friends claim and redeem it in-store, and the merchant dashboard shows confirmed attribution.

Pilot program ID:

```text
8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9
```

Before mainnet, finish the external security audit, wire production wallet infrastructure, expand local-validator instruction tests, and connect monitoring for the hosted services.

## Portfolio docs

- [Case study](docs/CASE_STUDY.md)
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
Merchant Today -> Invite -> Offer Claim -> Redeem Code -> Merchant Scan -> Ledger/Attribution
```

The visible demo should stay focused on this path. Routes outside that loop are supporting surfaces, not the main submission story.

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
