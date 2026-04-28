# Viral Sync - Frontier Weekend Sprint

## Project

Viral Sync is a Solana-native referral and loyalty protocol for local merchants. It lets a customer share a verified invite, lets a friend claim a reward, and lets the merchant confirm the real-world visit at the counter. The goal is to make word-of-mouth measurable for dense local districts such as Thamel without forcing merchants or customers into a complex crypto workflow.

## Before This Sprint

- The protocol architecture existed, but the launch experience still felt like a prototype.
- The consumer flow had incomplete polish and visible demo-style assumptions.
- Merchant-facing surfaces were not focused enough for a live hackathon walkthrough.
- Tests covered only a narrow part of the protocol and launch ledger behavior.
- The app did not clearly show the full loop from invite to merchant confirmation.

## After This Sprint

- Rebuilt the core launch UI into a premium mobile-first passbook experience.
- Added working consumer flows for home, invite, redeem, passbook, profile, and flow guide.
- Added merchant surfaces for today's dashboard, scan terminal, campaigns, customers, and ledger.
- Removed seeded demo activity from the launch ledger so the app starts from honest zero-state data.
- Hardened guest session handling so each browser session gets its own launch identity.
- Added launch API guardrails for referral creation, claim handling, redeem code generation, and merchant confirmation.
- Expanded protocol and launch tests to cover PDA derivation, redemption settlement, commission accounting, self-referral blocking, duplicate claim reuse, and redeem-code normalization.
- Verified the monorepo end to end with app lint/build, TypeScript workspace builds, cargo check, Anchor build, and protocol tests.

## Demo Flow

1. Open the consumer passbook at `/`.
2. Go to `/invite` and create a live invite link.
3. Show the referral ticket, share actions, and progress state.
4. Open `/redeem` to show the customer redemption surface.
5. Open `/merchant/today` to show the merchant's live dashboard.
6. Open `/merchant/scan` to show the counter-confirmation terminal.
7. Explain that the production protocol path uses Solana/Anchor and Token-2022 transfer-hook architecture for referral attribution and commission accounting.

## Verification

Latest verified command:

```bash
npm run verify
```

Result: passed.

This includes:

- Next.js lint and production build
- TypeScript builds for app support workspaces
- Relayer, crank, launch, and actions builds
- Rust `cargo check`
- Anchor build
- Protocol test suite

## Why It Matters

Small merchants do not need another ad dashboard. They need to know which real customers brought other real customers through the door. Viral Sync turns referral growth into a verifiable, merchant-confirmed loop that can start as a simple PWA and grow toward a Solana-native loyalty protocol.
