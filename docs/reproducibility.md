# Reproducibility Baseline

This repo should be verifiable from a clean checkout with pinned tool expectations.

## Tool Versions

| Tool | Version |
|---|---|
| Node.js | 20.x |
| npm | Comes with Node 20 |
| Rust | stable |
| Solana CLI | 1.18.23 |
| Anchor / AVM | Anchor 0.30.1 |

## Clean Setup

```bash
npm ci
```

Optional local environment files:

```bash
cp app/.env.example app/.env.local
cp relayer/.env.example relayer/.env
cp cranks/.env.example cranks/.env
cp server/actions/.env.example server/actions/.env
```

## Verification

```bash
npm run verify
```

This runs:

- app lint;
- app production build;
- TypeScript builds for workspace services;
- Rust `cargo check`;
- `anchor build`;
- protocol tests.

## CI Baseline

`.github/workflows/anchor-test.yml` installs Node 20, Rust stable, Solana 1.18.23, AVM, Anchor 0.30.1, then runs `npm run verify`.

## Known Caveats

- Anchor and Solana CLI installation can be slow on fresh CI runners.
- The launch app should use `LAUNCH_DATABASE_URL` in deployed pilots. Local JSON storage is only a developer fallback.
- Mainnet fund handling is out of scope until security audit and escrow settlement checks are complete.
