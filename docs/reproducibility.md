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

## Localnet Causal Receipt Path

With `solana-test-validator` running and the Viral Sync program deployed at the configured localnet program id:

```bash
npm run build:program
npm run localnet:causal-commerce -- --replay-check --close-check
npm run localnet:verify-receipt -- --manifest tmp/localnet-causal-commerce.json
```

This produces a local manifest with the merchant, campaign, reward escrow, receipt, nullifier, settlement record, and transaction signatures. It is the judge-facing proof path for the current localnet build.
The current path also creates SPL token accounts, moves bounty tokens into the reward vault, verifies referrer/visitor payout balances after settlement, reclaims unused vault funds, and verifies the reward vault token account is closed.

For the complete week 10-20 smoke and evidence packet:

```bash
npm run localnet:smoke
npm run localnet:proof-graph
npm run localnet:evidence-report
npm run frontier:submission
```

On Windows, run `solana-test-validator` through WSL if the native Agave installer requires administrator privileges. The validator must load `target/deploy/viral_sync.so` at the program id in `Anchor.toml`.

## CI Baseline

`.github/workflows/anchor-test.yml` installs Node 20, Rust stable, Solana 1.18.23, AVM, Anchor 0.30.1, then runs `npm run verify`.

## Known Caveats

- Anchor and Solana CLI installation can be slow on fresh CI runners.
- The launch app should use `LAUNCH_DATABASE_URL` in deployed pilots. Local JSON storage is only a developer fallback.
- Mainnet fund handling is out of scope until security audit and escrow settlement checks are complete.
- `frontier:submission` expects the smoke manifest and verifier JSON to exist. Run `npm run localnet:smoke` first.
