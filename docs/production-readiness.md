# Production Readiness

Viral Sync can be rehearsed on localnet/devnet today. It must stay capped until the items below are complete and signed off.

## Runtime Gates

- `LAUNCH_DATABASE_URL` or `DATABASE_URL` is required in production. Local JSON is development-only.
- `LAUNCH_MERCHANT_ACCESS_TOKEN`, `LAUNCH_STAFF_PIN`, `LAUNCH_RELAYER_API_KEY`, `LAUNCH_INDEXER_API_KEY`, `LAUNCH_INTENT_SECRET`, and `LAUNCH_WEBHOOK_SECRET` must be non-demo values.
- `LAUNCH_ALLOWED_ORIGINS` must list exact production and staging origins.
- `LAUNCH_PAUSED=true` blocks launch API mutations globally.
- `npm run production:readiness:strict` must pass before a real pilot deploy.
- Apply `docs/migrations/001_launch_core.sql` and `docs/migrations/002_production_rbac_and_ops.sql` before using normalized production reporting tables.

## Auth And RBAC

- Merchant sessions are HTTP-only cookies or server headers.
- Production merchant login requires a non-demo merchant access token.
- Local demo staff PIN fallback is disabled in production unless explicitly overridden for a controlled rehearsal.
- Roles are `owner`, `manager`, `staff`, `support`, and `auditor`; `admin` is treated as a legacy manager alias.
- Staff confirmation requires an enrolled staff device in production.
- Device enrollment and revocation require manager-or-owner authority.
- Sensitive actions write audit events with request ids and actor ids.

## API Hardening

- Mutations require JSON content type where applicable.
- Mutations perform same-origin checks.
- JSON body size is capped.
- CSV import is capped at 250 KB for the pilot.
- Common error responses include stable error codes and request ids.
- Rate-limited responses return `Retry-After`.
- Global security headers are applied by middleware and route helpers.

## Relayer And Wallet Controls

- Sponsored transaction simulation requires a service API key, signed intent, replay nonce, allowlisted instruction, account validation, and daily caps.
- Default caps are intentionally strict: 100 sponsored transactions per day, 25 per merchant per day, 15 per campaign per day, and 3 per wallet per day.
- Caps can be lowered with environment variables but cannot be raised above the built-in beta ceiling without code review.

## Protocol Controls

- Merchant config can be paused on-chain.
- Growth campaigns can be paused/resumed on-chain before closure.
- Funding and receipt recording require active campaign state.
- Campaign closure reclaims only unreserved reward vault balance.
- Settlement remains exact-once through receipt status and settlement PDA uniqueness.

## Human Signoffs Still Required

- External Solana program audit.
- Backend and relayer security review.
- Legal review for merchant agreement, consumer terms, privacy, and promotion rules.
- Incident-response rehearsal with named owners.
- Real merchant pilot acceptance with explicit capped-funds consent.
