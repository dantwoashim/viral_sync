# Deployment Guide

This is the supported deployment shape for the current repository.

## Supported topology

- `app/` deployed as the public web application
- `server/actions/` deployed as a long-running Node service
- `relayer/` deployed as a long-running Node service
- Postgres used as the shared system of record for launch-state persistence
- Solana program deployed separately when the chain-facing paths are in use

## Required production environment

### App

- `VIRAL_SYNC_DATABASE_URL`
- `VIRAL_SYNC_CONSUMER_SESSION_SECRET`
- `VIRAL_SYNC_MERCHANT_SESSION_SECRET`
- `VIRAL_SYNC_MERCHANT_ACCESS_CODE`

### Database TLS

Use one of these modes:

- `VIRAL_SYNC_DATABASE_SSL_MODE=disable`
  Local development only.
- `VIRAL_SYNC_DATABASE_SSL_MODE=require`
  Uses normal certificate verification with the platform trust store.
- `VIRAL_SYNC_DATABASE_SSL_MODE=verify-ca`
  Requires `VIRAL_SYNC_DATABASE_SSL_CA`.

Optional mTLS fields:

- `VIRAL_SYNC_DATABASE_SSL_CERT`
- `VIRAL_SYNC_DATABASE_SSL_KEY`

Notes:

- The app no longer sets `rejectUnauthorized: false`.
- If SSL is enabled, the runtime now expects real certificate validation.

## Unsupported production shortcuts

- local file-ledger mode
- smoke-test mode
- missing session secrets
- missing merchant access code
- partial TLS configuration

## Verification before release

From the repository root:

```bash
npm run verify:launch
```

That command covers:

- app lint
- app build
- actions build
- relayer build
- browser smoke
- anchor TypeScript tests
- Rust program `cargo check`

## Current deployment caveat

The launch runtime is still pilot-centered in its domain model. Deploying it for real merchants is appropriate for a controlled pilot, not yet for a generalized multi-tenant rollout.
