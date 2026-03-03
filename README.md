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
| Fraud prevention | Click fraud is rampant | Geo-verified, rate-limited, reputation-scored |
| Setup time | Hours of campaign config | 5 minutes |

Merchants create reward tokens, set a commission rate (typically 8-12%), and let the system handle everything else. No monthly fees, no minimum spend. You only pay when results happen.

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
- Email-based authentication (simple sign-up, no crypto wallet setup required)
- Mock data preloaded for demo purposes so the app looks alive on first visit
- Role-aware navigation so each user type only sees what is relevant to them

---

## Product Functionality / Technical Implementation

### Architecture

```
Frontend (Next.js 16)  -->  Solana Devnet (Anchor Program)
     |                            |
     +-- Auth (Email/Privy)       +-- Token-2022 with Transfer Hook
     +-- Hooks (RPC reads)        +-- 19 instructions across 6 phases
     +-- Mock data fallback       +-- PDA-based state (no database)
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
| Auth | Email-based (Privy for embedded wallets) |
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
├── relayer/                 # Express.js fee sponsorship server
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
anchor build
```

Or use [Solana Playground](https://beta.solpg.io) to build and deploy from the browser.

---

## Demo

The live demo at [viral-sync.vercel.app](https://viral-sync.vercel.app) uses preloaded mock data to show the full merchant and consumer experience. Sign in with any email to explore both roles.

### About the Mock Data

The frontend currently uses mock data to populate dashboards, activity feeds, and analytics. This is intentional for the demo stage. Two personas are built in:

- **BREW Coffee (Merchant)** - a coffee shop running a referral program with 2.45M tokens in circulation
- **Sarah (Consumer)** - a customer who has earned 820 tokens by sharing referral links

All React hooks (`useMerchantConfig`, `useViralOracle`, `useCommissionLedger`, etc.) first try to fetch real on-chain data from Solana devnet. If the accounts don't exist yet or the RPC call fails, they fall back to mock data. Once the on-chain program is initialized with real merchant accounts, the dashboard switches to live data automatically with no code changes needed.

---

## Team

- **Prabin Ghimire** - Full-stack developer

## License

MIT
