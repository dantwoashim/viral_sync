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

The launch runtime now resolves merchants, offers, and operators from shared state rather than pilot constants. It is appropriate for controlled production pilots, but it is still not a full self-serve merchant platform with operator provisioning, admin UX, and deep RBAC.
