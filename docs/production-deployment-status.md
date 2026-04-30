# Production Deployment Status

Last updated: 2026-04-30

## Live URLs

- Production app: https://viralsync1.vercel.app
- Current Vercel deployment: https://viralsync1-5vg8y4c1q-prabin-ghimires-projects.vercel.app
- Vercel project: `prabin-ghimires-projects/viralsync1`

## Database

- Provider: Neon free tier
- Project: `viral-sync-prod-demo`
- Project ID: `lucky-shadow-72608922`
- Branch: `production`
- Database: `neondb`
- Runtime env var: `LAUNCH_DATABASE_URL`
- Verified table: `launch_ledger`

The production app uses Neon through Vercel environment variables. Local secret copies are stored in `.env.production.local` and `app/.env.production.local`; those files are gitignored.

## Secrets

Production Vercel has these environment variables configured:

- `LAUNCH_DATABASE_URL`
- `LAUNCH_DATABASE_SSL`
- `LAUNCH_DATABASE_SSL_REJECT_UNAUTHORIZED`
- `LAUNCH_DATABASE_POOL_SIZE`
- `LAUNCH_ALLOWED_ORIGINS`
- `LAUNCH_STAFF_PIN`
- `LAUNCH_CAUSAL_SECRET`
- `LAUNCH_INTENT_SECRET`
- `LAUNCH_RELAYER_API_KEY`
- `RELAYER_SECRET`
- `LAUNCH_PAUSED`
- `NEXT_PUBLIC_APP_URL`
- `PUBLIC_BASE_URL`
- `NEXT_PUBLIC_RELAYER_URL`
- `NEXT_PUBLIC_PROGRAM_ID`
- `NEXT_PUBLIC_SOLANA_RPC_URL`

`NEXT_PUBLIC_MERCHANT_PUBKEY` is intentionally not set yet because there is no final merchant wallet public key.

## Backups

Run a manual backup with:

```bash
npm run backup:neon
```

Backups are written to `backups/neon/` and ignored by git. The backup script reads `LAUNCH_DATABASE_URL` from the environment first, then from `.env.production.local`.

## Monitoring

Run a production smoke check with:

```bash
npm run monitor:production
```

GitHub Actions also runs `.github/workflows/production-smoke.yml` every 6 hours and can be triggered manually. It checks:

- `/`
- `/api/launch/ops/summary`
- `/api/launch/merchant/summary`
- `/api/launch/relayer/monitoring`

## Solana Snapshot

- Program ID: `8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9`
- IDL snapshot: `docs/snapshots/solana/viral_sync-idl-devnet-2026-04-30.json`
- Deployment snapshot metadata: `docs/snapshots/solana/viral_sync-devnet-deployment-snapshot-2026-04-30.json`
- Solana CLI: `solana-cli 3.1.14` installed in WSL Ubuntu 24.04
- Devnet payer: `FDbsM2KxA2rEYf377CmqzrJTSsaPSkmu36CFHn9jLuM4`

The Anchor build succeeds locally and the Solana CLI is installed in WSL. Final devnet deployment is blocked only by devnet faucet funding: the payer has `0 SOL`, faucet requests are rate-limited, and deploying `target/deploy/viral_sync.so` requires about `4.8550176 SOL` rent plus transaction fees.

Once the payer has at least `5 SOL` on devnet, run:

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'export PATH=/root/.local/share/solana/install/active_release/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; cd /mnt/d/viral-sync-main; solana program deploy target/deploy/viral_sync.so --program-id target/deploy/viral_sync-keypair.json --url devnet --keypair /root/.config/solana/id.json'
```

Then verify with:

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'export PATH=/root/.local/share/solana/install/active_release/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; solana program show 8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9 --url devnet'
```
