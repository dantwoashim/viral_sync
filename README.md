# Viral Sync

Smart referral tracking for local businesses. Customers share, friends visit, everyone earns.

Built on Solana. Deployed on devnet.

**Live Demo:** [viral-sync.vercel.app](https://viral-sync.vercel.app)

---

## Problem Statement

Small businesses spend a significant chunk of their revenue on digital ads with poor conversion rates. Google Ads charges $2-5 per click, and most of those clicks never turn into real customers.

Meanwhile, the single most effective marketing channel, word-of-mouth, is completely invisible. When your best customer tells three friends about your restaurant and two of them show up, that customer gets nothing. There is no tracking, no attribution, and no way to reward the behavior you want most.

Existing referral tools (ReferralCandy, Yotpo, etc.) are expensive SaaS products designed for e-commerce, not local businesses. They require manual tracking, are easy to game, and the referral chains are shallow (one level deep at most).

---

## Potential Impact

- **For businesses:** Replace ad spend with pay-for-performance referral programs. Only pay when someone actually walks in.
- **For customers:** Get rewarded for recommendations they are already making. Earn commissions when friends and friends-of-friends redeem.
- **For the market:** Word-of-mouth drives an estimated 13% of consumer sales ($6T globally). Viral Sync makes this measurable and attributable for the first time at the small business level.

The K-Factor metric (borrowed from epidemiology) tells merchants whether their program is actually viral. If K > 1.0, every referrer brings in more than one new customer, and growth is exponential, not linear.

---

## Business Case

| Metric | Google Ads | Viral Sync |
|--------|-----------|------------|
| Cost per click | $2-5 | $0 |
| Cost per acquisition | $8-15 | Commission-only (merchant sets rate) |
| Attribution depth | 1 click | Multi-generational (friend of friend of friend) |
| Fraud prevention | Click fraud is rampant | Time-bound geofence attestations, replay limits, and merchant reputation controls |
| Setup time | Hours of campaign config | Minutes for a devnet pilot once token setup is complete |

Merchants create reward tokens, set a commission rate (typically 8-12%), and let the system handle the tracked referral flow. This repository is a devnet product build, not a hosted commercial service with billing included.

---

## UX

The app has two modes: **Merchant** and **Consumer**. You pick your role at login.

### Merchant View
- **Dashboard** - token supply, funnel chart (share > claim > redeem), recent activity feed
- **Viral Oracle** - K-Factor score, conversion rates, cost-per-customer vs traditional ads
- **Network** - visual graph of the referral tree, showing depth and spread
- **POS Terminal** - tablet-friendly screen for processing in-store redemptions via NFC or QR
- **Disputes** - fraud detection flags, bond status, resolution history
- **Settings** - commission rate, token expiry, account management

### Consumer View
- **Home** - reward balance, recent scans, quick stats
- **Earn** - personal referral link with copy/share buttons, earnings breakdown
- **Scan** - enter redemption codes or tap NFC at the POS
- **Profile** - account overview, total earned, total claimed

### Design Decisions
- Light mode, desktop-first layout with sidebar navigation
- Wallet-signed authentication for live mode, with a separately labeled demo sandbox
- Mock data is available only in explicit demo mode, never as a silent live fallback
- Role-aware navigation so each user type only sees what is relevant to them

---

## Product Functionality / Technical Implementation

### Architecture

```
Frontend (Next.js 16)  -->  Solana Devnet (Anchor Program)
     |                            |
     +-- Wallet-signed auth       +-- Token-2022 with Transfer Hook
     +-- Hooks (RPC reads)        +-- 19 instructions across 6 phases
     +-- Explicit live/demo mode  +-- PDA-based state plus relayer/action service state
```

### The Core Idea

Every merchant gets a custom Token-2022 token. When customers hold and share these tokens, a Transfer Hook fires on every transfer and automatically:

1. **Classifies the token** - Gen-1 (direct from merchant) vs Gen-2 (passed through a referrer)
2. **Records referral attribution** - who sent it to whom, timestamped
3. **Computes commissions** - when someone redeems at the store, their referrer earns automatically
4. **Updates analytics** - the Viral Oracle recalculates K-Factor and conversion metrics

### Tech Stack

| Layer | Tech |
|-------|------|
| Smart contract | Rust, Anchor 0.30.1, Token-2022 Extensions |
| Frontend | Next.js 16, React, Recharts, Lucide Icons |
| Auth | Wallet-signed sessions for live mode, explicit demo mode for sandboxing |
| Styling | Custom CSS design system |
| Deployment | Vercel (frontend), Solana Devnet (program) |

### On-Chain Program

**Program ID:** `D9ds2V6y4GFGKbo8wF8qQiF81dzhkiznmZsHepcSN6Ta`

19 instructions organized into 6 phases:

1. **Initialization** - token creation, merchant config, treasury setup
2. **Transfer Hook** - fires on every transfer, classifies generations, buffers referrals
3. **Redemption** - FIFO token consumption, commission calculation, ledger updates
4. **Escrows** - time-locked shares, link-based claiming, expiry harvesting
5. **Oracle + Reputation** - K-Factor computation, fraud scoring, merchant reputation
6. **Disputes** - watchdog staking, timeout arbitration, bond slashing

### Project Structure

```
viral-sync/
├── programs/viral_sync/     # Anchor smart contract (Rust)
│   ├── src/instructions/    # 19 instruction handlers
│   ├── src/state/           # Account structs (PDAs)
│   └── src/lib.rs           # Program entrypoint
├── app/                     # Next.js frontend
│   └── src/
│       ├── app/             # Pages (dashboard, oracle, network, pos, consumer)
│       ├── components/      # Sidebar, layout shells
│       └── lib/             # Auth, hooks, Solana utilities, mock data
├── relayer/                 # Express.js fee sponsorship server with allowlists, replay controls, and audit logging
├── clients/                 # POS + consumer client utilities
├── cranks/                  # Automated maintenance scripts
└── tests/                   # Integration tests
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.75+ (for smart contract development)
- [Anchor](https://www.anchor-lang.com/docs/installation) 0.30+ (for smart contract development)

### Run the Frontend

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build the Smart Contract

```bash
cargo build
anchor build
```

This repository now includes a local compatibility patch for Anchor 0.30.1 IDL generation on current toolchains, so `anchor build` is the verified local path in this repository.

---

## Demo

The live demo at [viral-sync.vercel.app](https://viral-sync.vercel.app) should explicitly identify whether it is running in `live` or `demo` mode. Demo mode can use preloaded mock data; live mode should only display real Solana state.

### About the Mock Data

When demo mode is enabled, the frontend can populate dashboards, activity feeds, and analytics using sample data. Two personas are built in:

- **BREW Coffee (Merchant)** - a coffee shop running a referral program with 2.45M tokens in circulation
- **Sarah (Consumer)** - a customer who has earned 820 tokens by sharing referral links

All React hooks (`useMerchantConfig`, `useViralOracle`, `useCommissionLedger`, etc.) fetch real on-chain data first. Mock data is only used when the app is explicitly configured for demo mode.

---

## Team

- **Prabin Ghimire** - Full-stack developer

## License

MIT
