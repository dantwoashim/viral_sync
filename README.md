# Viral Sync

Viral Sync is a referral and loyalty system for local merchants built on Solana. It tracks the path from share to claim to in-store redemption, attributes each conversion to the right referrer, and exposes that state through a merchant console and a consumer-facing application.

This repository contains the full stack:

- an Anchor program for referral state, reward accounting, and settlement rules
- a Next.js application with separate merchant and consumer experiences
- a relayer for sponsored transactions
- an actions server for runtime workflows
- background workers and shared packages used by the application stack

## Current Scope

Viral Sync is under active development. The repository is suitable for local development, devnet testing, and product work. It is not presented here as a turnkey production deployment.

The current codebase includes:

- a public-facing web application with merchant and consumer modes
- a launch loop for link creation, claims, merchant confirmation, and passbook views
- a Solana program and supporting services under active development
- workspace packages for shared runtime types and server coordination

## Core Flow

For merchants:

- define referral and reward behavior
- issue trackable rewards
- confirm in-store redemptions
- inspect referral activity and campaign performance

For consumers:

- receive and share referral links
- claim offers
- maintain a passbook of rewards and progress
- redeem rewards through the merchant flow

The product is organized around a simple loop:

1. A merchant creates or configures an offer.
2. A consumer receives or opens a referral link.
3. The consumer claims the offer.
4. The merchant confirms the redemption.
5. The passbook and merchant views update to reflect the result.

## Architecture

At a high level, the system is split into five layers:

```text
Consumer and merchant app (Next.js)
        |
        +-- launch APIs and runtime flows
        |
Relayer and action services
        |
Shared workspace package
        |
Anchor program on Solana
        |
Background workers and maintenance tasks
```

The public architecture note is in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Repository Layout

```text
app/                 Next.js application
programs/viral_sync/ Anchor program
relayer/             Sponsored transaction service
server/actions/      Runtime action service
cranks/              Background workers and maintenance scripts
packages/shared/     Shared runtime types and constants
clients/             Client-side helpers
tests/               Integration and workflow tests
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- Rust and Cargo
- Anchor for Solana program development

### Install Dependencies

From the repository root:

```bash
npm install
```

### Run the Web App

```bash
cd app
npm run dev
```

The application runs at `http://localhost:3000`.

### Build the Web App

```bash
cd app
npm run build
```

### Build the Solana Program

```bash
cargo build
anchor build
```

### Build the Workspace

```bash
npm run build
```

## Environment

The application and services use standard environment variables for RPC endpoints, program IDs, relayer URLs, and runtime service URLs. Typical local development values include:

- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_PROGRAM_ID`
- `NEXT_PUBLIC_RELAYER_URL`
- `NEXT_PUBLIC_ACTIONS_URL`
- `NEXT_PUBLIC_PRIVY_APP_ID`

Review the application code in `app/src/lib` and the service packages for the exact variables each component expects.

## Development Notes

- The app is a workspace package and resolves shared runtime types from `packages/shared`.
- The frontend includes merchant and consumer routes in the same codebase.
- Internal planning notes and working documents are intentionally not included in the public tree.

## Verification

For the application package:

```bash
cd app
npm run lint
npm run build
```

## License

No license file is included in this repository at the moment.
