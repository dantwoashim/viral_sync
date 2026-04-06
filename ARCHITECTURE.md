# Viral Sync Architecture

This document describes the repository as it is structured for development today. It is written for engineers evaluating the codebase, integrating with it, or deciding where to make changes.

## System Overview

Viral Sync combines an on-chain settlement layer with a web application and a set of supporting services.

```text
Next.js app
  |- merchant workflows
  |- consumer workflows
  |- launch APIs
  |
  +--> relayer
  +--> actions server
  +--> Solana RPC

Anchor program
  |- merchant configuration
  |- token and referral state
  |- commission accounting
  |- dispute and reputation state

Workers and shared packages
  |- maintenance tasks
  |- typed runtime contracts
```

## Major Components

### 1. Web Application

Location: `app/`

The web application is a Next.js project that serves both sides of the product:

- merchant routes for operations, campaigns, confirmation, and ledger views
- consumer routes for claiming, sharing, passbook tracking, and redemption
- internal API routes that support the launch loop and runtime workflows

Key areas:

- `app/src/app/` contains the route tree
- `app/src/components/` contains layout and UI building blocks
- `app/src/lib/launch/` contains the typed launch engine used by the app routes and APIs
- `app/src/lib/auth.tsx` manages the guest-first application identity layer

The current launch path supports two persistence modes:

- local file-backed state for development
- Postgres-backed shared state when `VIRAL_SYNC_DATABASE_URL` is configured

In production launch environments, the intended path is the Postgres-backed mode. The file-backed ledger is retained as a development fallback, not as an internet-facing deployment target.

Consumer identity is backed by a signed application session, and merchant confirmation is backed by a separate operator session.

### 2. Anchor Program

Location: `programs/viral_sync/`

The on-chain program is responsible for the protocol state model. It defines merchant configuration, token generation state, commission ledgers, disputes, reputation signals, and related instruction handlers.

Representative state types include:

- `MerchantConfig`
- `TokenGeneration`
- `CommissionLedger`
- `ViralOracle`
- `MerchantReputation`
- `MerchantBond`
- `DisputeRecord`

The application currently includes both live-program code paths and local launch flows. Outside contributors should not assume every conceptual protocol path is fully wired into the web application.

### 3. Relayer

Location: `relayer/`

The relayer is the transaction sponsorship layer. Its job is to receive approved transaction requests, apply relayer-side policy, and submit transactions so end users do not need to hold SOL just to complete application flows.

### 4. Action Server

Location: `server/actions/`

The action server handles runtime APIs that do not belong inside the static web application. It is the place for server-side orchestration, challenge/response flows, and transaction preparation endpoints.

### 5. Background Workers

Location: `cranks/`

These tasks handle maintenance work that should not depend on an interactive user session. That includes cleanup, expiration processing, and other periodic tasks tied to protocol or runtime state.

### 6. Shared Package

Location: `packages/shared/`

This workspace package holds shared runtime types, constants, and contracts used across the app and service boundary. The app depends on it directly during build.

## Data Flow

The most important user-facing loop is:

1. A merchant configures an offer or campaign.
2. A consumer opens or receives a referral link.
3. The consumer claims the offer and can share a real invite QR artifact.
4. The consumer receives a short redeem code that can also be encoded as QR.
5. The merchant confirms the redemption.
6. The consumer passbook and merchant views update to reflect the new state.

The repository supports this loop in two forms:

- a local launch engine used by the current application routes
- a database-backed launch engine for shared application state
- protocol and runtime layers intended for broader Solana-backed flows

## Build and Deployment Shape

The repository is a JavaScript workspace with additional Rust/Anchor components.

- root `package.json` defines the workspace
- `app/` builds as a Next.js application
- `relayer/` and `server/actions/` are separate services
- `programs/viral_sync/` builds with Cargo and Anchor

Typical deployment shape:

- app on a web host such as Vercel
- relayer on a long-running Node host
- action server on a long-running Node host
- Solana program deployed separately

## Practical Engineering Boundaries

If you are changing the product surface:

- start in `app/src/app/` and `app/src/lib/launch/`

If you are changing runtime orchestration:

- inspect `server/actions/` and `relayer/`

If you are changing protocol state or settlement rules:

- inspect `programs/viral_sync/`

If you are changing data contracts shared across packages:

- inspect `packages/shared/`

## Maturity Notes

This repository is not a minimal demo, but it is also not a drop-in production platform. It contains real application code, real service boundaries, and a substantial on-chain model, but anyone adopting it should review the current branch carefully and treat it as an actively evolving system.
