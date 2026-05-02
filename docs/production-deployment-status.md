# Production Deployment Status

Last updated: 2026-05-02

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
- Verified tables: `merchants`, `campaigns`, `causal_invites`, `claims`, `redemptions`, `visit_challenges`, `causal_receipts`, `merchant_sessions`, `staff_devices`, `staff_device_nonces`, `audit_events`, `reward_ledger_entries`, `outbox_jobs`, `app_events`, and `idempotency_records`

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
- Localnet deployment snapshot: `docs/snapshots/solana/viral_sync-localnet-deployment-snapshot-2026-04-30.json`
- Deployment snapshot metadata: `docs/snapshots/solana/viral_sync-devnet-deployment-snapshot-2026-04-30.json`
- Solana CLI: `solana-cli 3.1.14` installed in WSL Ubuntu 24.04
- Devnet payer: `FDbsM2KxA2rEYf377CmqzrJTSsaPSkmu36CFHn9jLuM4`
- Devnet ProgramData address: `41u78G6XYtMddPoaHXvk5uJ1wA7Lof83GUPQb7j63nZY`
- Devnet last deployed slot: `459162617`

The Anchor build succeeds locally and the compiled program artifact deploys successfully on a WSL local validator with the same program ID. Localnet deployment signature: `3zXb3mNvaY4dZSoUM4vCxQTPMHxo8ksK7NJiuutnJvH7myu95UhpZ95ttUj6E9AUcfLMS2C1hLVdbXWiL1zvrjA5`.

Final devnet deployment is complete and verified. The deployed program is owned by `BPFLoaderUpgradeab1e11111111111111111111111`, has data length `697432` bytes, and holds `4.8553308 SOL`.

Verify anytime with:

```bash
wsl -d Ubuntu-24.04 -- bash -lc 'export PATH=/root/.local/share/solana/install/active_release/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin; solana program show 8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9 --url devnet'
```
