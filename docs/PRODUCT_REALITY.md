# Product Reality

This document is the plain-language truth about the repository as it exists today.

## What is real today

- The repository contains a real Next.js application with consumer and merchant surfaces.
- The launch loop is real: share link, claim, redeem code creation, and merchant confirmation.
- The launch runtime can use Postgres as its shared system of record.
- The relayer and actions services are real services with buildable code and test coverage.
- The app now has signed consumer sessions and signed merchant operator sessions.
- The launch runtime now resolves multiple merchants, offers, and named operators from shared persistence.
- The app is installable as a PWA and keeps cached summary data available during weak connectivity.

## What is still pilot-grade

- Merchant operator auth is now merchant-scoped and attributable, but it is still access-code based rather than full username/password or MFA-backed accounts.
- The launch domain model supports multiple merchants, but it is still not a full self-serve merchant platform with provisioning, audit tools, and richer RBAC.
- Several route surfaces still describe a broader product than the generalized runtime currently supports.

## What is demo-only or development-only

- Local file ledger persistence is for development and smoke testing only.
- Smoke-test overrides such as `VIRAL_SYNC_SMOKE_TEST_MODE` are not production deployment settings.
- Mock/demo data still exists in the on-chain-facing frontend hook layer and should not be treated as live operational truth.

## What production currently requires

- `VIRAL_SYNC_DATABASE_URL`
- `VIRAL_SYNC_CONSUMER_SESSION_SECRET`
- `VIRAL_SYNC_MERCHANT_SESSION_SECRET`
- A deliberate Postgres TLS configuration when connecting over SSL

## What is not done yet

- Self-serve merchant and operator provisioning flows
- Stronger operator account lifecycle and role-based access control
- Full live/demo separation across the entire app surface
- Formal deployment topology and runbooks for every service
- License-aware commercial packaging decisions beyond the repository license itself

## Current safest way to describe the product

Viral Sync is a serious launch-ready pilot stack for multi-merchant referral and redemption flows, with real runtime services and a real web app, but it is not yet a finished self-serve merchant platform.
