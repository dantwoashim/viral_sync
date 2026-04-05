# Viral Sync — The Full Story (For Prabin)

## What Is This Thing?

Viral Sync is a **decentralized referral protocol** built on Solana. Think of it like this: imagine every time you recommended a restaurant to a friend, and they actually went, you got paid automatically — not by the restaurant's marketing team, but by a smart contract on the blockchain that _proves_ your recommendation led to a real customer. No middlemen, no trust required, no "we'll get back to you with your affiliate payment in 90 days."

The magic is that the entire referral chain is on-chain. When Alice refers Bob, and Bob refers Carol, and Carol actually redeems tokens at a merchant's POS terminal — the Solana program automatically computes commissions for the entire chain, fights fraud with a "Proof of Individuality" score, and even calculates a **K-Factor** (a viral coefficient from epidemiology) to tell the merchant whether their referral program is actually viral.

---

## Technical Architecture

### The Stack

```
┌─────────────────────────────────────────────┐
│  Mobile App (Next.js + Capacitor)           │
│  Xianxia Dark Theme · Role-Aware Nav        │
├─────────────────────────────────────────────┤
│  Privy Auth (Google / Apple social login)    │
│  → Creates embedded Solana wallet silently   │
├─────────────────────────────────────────────┤
│  Hooks Layer (useMerchantConfig, useViralOracle, etc.)  │
│  → Reads on-chain data via @solana/web3.js  │
├─────────────────────────────────────────────┤
│  Anchor / Solana Program (Rust)             │
│  → 12+ instructions, 8+ account types      │
├─────────────────────────────────────────────┤
│  Solana Devnet / Mainnet                    │
│  SPL Tokens (Token-2022 with transfer fee)  │
└─────────────────────────────────────────────┘
```

### On-Chain Program (Rust / Anchor)

The heart of Viral Sync is a Solana program in `programs/viral_sync/`. Key state accounts:

- **MerchantConfig** — The merchant's settings: commission rate (in basis points), token expiry days, max referrals per wallet per day, etc. Think of it as the "control panel" for the referral program.
- **ViralOracle** — Stores computed analytics: K-Factor, share/claim/redeem rates, median referrals per user, and even a "vs Google Ads efficiency" metric. This is recomputed periodically.
- **MerchantReputation** — Anti-fraud scoring: suspicion score, POI (Proof of Individuality) averages, commission concentration detection.
- **MerchantBond** — SOL locked as collateral. If a merchant is caught gaming the system, their bond gets slashed.
- **TokenGeneration** — Each wallet's token balance, split into gen1 (directly received) and gen2 (received via second-generation referral). Includes a referrer slot system for tracking the referral chain.
- **CommissionLedger** — Per-referrer earnings: total earned, total claimed, claimable balance, frozen amounts.
- **DisputeRecord** — When a watchdog flags suspicious activity, the dispute lifecycle is tracked here.

Instructions include: `initialize_merchant`, `issue_tokens`, `share_referral`, `claim_commission`, `redeem_at_pos`, `compute_oracle`, `raise_dispute`, `resolve_dispute`, `manage_bond`, etc.

### Frontend (Next.js 16 + Capacitor)

The app lives in `app/`. It's a Next.js 16 app that compiles to a static export, which Capacitor wraps as an Android APK. Key design decisions:

- **`output: 'export'`** — For APK builds, Next.js generates static HTML/CSS/JS. No server-side rendering. You toggle this in `next.config.ts` — comment it out for dev, uncomment for APK builds.
- **Privy Auth** — Social login (Google/Apple) creates an embedded MPC Solana wallet. The user never sees a seed phrase. When Privy isn't configured (no `NEXT_PUBLIC_PRIVY_APP_ID`), it falls back to a demo auth modal.
- **Hooks architecture** — All on-chain data flows through hooks in `lib/hooks.ts`. These read Solana accounts via RPC and deserialize with the program IDL. Pages never touch `@solana/web3.js` directly.
- **Role-aware UI** — After login, you pick "Merchant" or "Consumer." The bottom nav shows different tabs for each role. This uses `useAuth().role` from the auth context.

### Codebase Structure

```
app/
├── src/
│   ├── app/               ← Next.js App Router pages
│   │   ├── page.tsx        ← Merchant dashboard
│   │   ├── oracle/         ← K-Factor & conversion funnel
│   │   ├── pos/            ← NFC/QR redemption terminal
│   │   ├── consumer/       ← Consumer home, earn, scan, profile
│   │   ├── network/        ← Referral graph visualization
│   │   ├── disputes/       ← Bond status & dispute history
│   │   ├── settings/       ← Toggles, sign-out, role switch
│   │   ├── login/          ← Role selection (Merchant vs Consumer)
│   │   └── globals.css     ← Xianxia design system
│   ├── components/
│   │   ├── BottomNav.tsx   ← Role-aware bottom tabs
│   │   └── MerchantShell.tsx ← Layout wrapper (hides nav on login)
│   └── lib/
│       ├── auth.tsx        ← Privy + demo auth providers
│       ├── hooks.ts        ← All on-chain data hooks
│       ├── types.ts        ← TypeScript interfaces matching on-chain
│       ├── solana.ts       ← Utility functions
│       └── useWallet.ts    ← Single source of truth for wallet address
├── android/                ← Capacitor Android project
└── next.config.ts          ← Toggle 'output: export' for APK builds
```

---

## Lessons Learned (The Hard Way)

### 1. "Hardcoded demo data is tech debt wearing a costume"

The first version of the UI had beautiful charts, impressive numbers, and convincing activity feeds. All fake. The problem? When we tried to connect real on-chain hooks, half the fields didn't exist on the actual TypeScript types. `pendingAmount` wasn't a real field — the actual field was `claimable`. `commissionBps` was actually `commissionRateBps`. `expiryDays` was `tokenExpiryDays`.

**Lesson**: Always build against real types from day one. If the data isn't available yet, show empty states — never invent data. It took us multiple failed builds to fix every field mismatch.

### 2. "The return type of your hook is the contract everyone else codes against"

`useWallet()` returns `PublicKey | null` directly, not `{ publicKey }`. Nine pages destructured it wrong: `const { publicKey } = useWallet()`. The TypeScript compiler caught this, but only during the production build (strict mode). In dev mode, it happily rendered `undefined` everywhere.

**Lesson**: Great engineers write hooks with simple, obvious return types and document them. If a hook returns a single value, don't wrap it in an object unless there's a good reason.

### 3. "Dead buttons are worse than no buttons"

Having a Settings page full of beautiful list items that don't do anything when you tap them is more frustrating than not having a Settings page at all. Users tap, nothing happens, they lose trust in the entire app.

**Lesson**: Every touchable element must either (a) navigate somewhere, (b) toggle something, or (c) show feedback. If a feature isn't ready, don't show the button — or at minimum show a "Coming soon" toast.

### 4. "Role-aware navigation is a UX superpower"

Showing merchants "Home / Oracle / POS / Network" vs showing consumers "Home / Earn / Scan / Profile" reduces cognitive load dramatically. Two people can use the same app and each sees exactly what they need.

### 5. "Capacitor gotchas"

- `config 2.xml` — macOS sometimes creates "config 2.xml" files (duplicates with spaces in the name) in the Android `res/xml/` directory. Android's resource compiler doesn't allow spaces. Always check for these before building.
- `output: 'export'` — Must be toggled on/off. Keep it commented out during dev, uncomment only for APK builds.
- Capacitor sync copies `out/` → `android/app/src/main/assets/public/`. If your `out/` is stale, the APK will have the wrong UI.

### 6. "TypeScript strict mode is your friend"

The production build (`npm run build`) runs TypeScript in strict mode by default. Dev mode (`npm run dev`) with Turbopack is more lenient — it only type-checks the page you're viewing. Always run a full build before releasing.

### 7. "Design systems pay for themselves"

The Xianxia CSS in `globals.css` defines every card (`scroll-card`), stat (`stat-card`), list (`list-card`), pill (`pill-jade`, `pill-gold`), and layout utility once. Pages just compose these classes. When we changed the gold color from `#D4A843` to something subtler, it changed everywhere instantly.

---

## Technologies Used

| Tech | Why |
|------|-----|
| **Solana** | Sub-second finality, low fees, perfect for microtransactions like referral commissions |
| **Anchor** | Rust framework for Solana programs — handles IDL generation, account deserialization |
| **Next.js 16** | App Router, Turbopack for fast dev, static export for APK |
| **Capacitor** | Wraps web apps as native Android/iOS — one codebase, real APK |
| **Privy** | Social login → embedded Solana wallet. Users never see a seed phrase |
| **Recharts** | React charting library for conversion funnels |
| **Lucide Icons** | Clean, consistent icon set |
| **Noto Serif SC** | Chinese serif font for the Xianxia aesthetic |

---

## How Good Engineers Think

1. **Types are documentation**. If `MerchantConfig` has `commissionRateBps`, your page should use `commissionRateBps` — not what you _think_ it's called.

2. **Empty states are features**. A blank screen with "No activity yet" tells the user the app is working. A loading shimmer tells them data is coming. Silence tells them nothing.

3. **Ship the simplest thing that works**. The POS page doesn't simulate NFC scans anymore — it just shows "Ready to Scan" with an empty state for recent scans. When real NFC is wired up, the UI is already there.

4. **Test at the target device size**. We test at 412×915 (Pixel 7). If it looks good there, it looks good on most Android phones.

5. **Commit messages are future-you's first debugging tool**. `feat: Xianxia aesthetic redesign + full UX overhaul` with a detailed body is worth 100x more than `fix stuff`.
