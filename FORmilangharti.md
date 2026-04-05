# Viral Sync — What I Built and What I Learned

## What Is This Project?

Viral Sync is a **decentralized referral protocol on Solana**. Think of it like this: every business knows word-of-mouth is the best marketing channel, but nobody can measure it. Google gives you click-through rates; billboards give you "impressions." But when your best customer tells their friend about your restaurant, and that friend tells three more friends — that chain of influence is invisible.

Viral Sync makes it visible. And enforced. And automatic.

Every referral interaction is a **token transfer on Solana**. The token itself carries its lineage (who created it, who shared it, what generation it is). When a customer redeems tokens at a point-of-sale terminal, the on-chain program automatically computes who deserves commission, how deep the referral chain goes, and whether the merchant's reputation should go up or down.

The key insight: **the token IS the attribution mechanism**. There's no database of "who referred whom." The token transfer history on Solana IS that database. And the transfer hook — a piece of code that fires on every transfer — IS the attribution engine.

---

## The Technical Architecture

### The Smart Contract (Anchor / Rust)

The core of everything lives in `programs/viral_sync/`. It's an Anchor smart contract with **19 instructions** — that's a lot for a Solana program. Here's how they're organized:

**Token Lifecycle:**
- `init_token_generation` — creates the loyalty token using Token-2022 with three extensions: transfer hook (fires on every transfer), transfer fee (protocol revenue), and token metadata (on-chain branding)
- `init_treasury_token_generation` — sets up the merchant's treasury to mint and distribute tokens

**Referral Engine:**
- `transfer_hook` — the heart of the protocol. Fires on EVERY token transfer. It classifies tokens by generation (Gen-1, Gen-2, etc.) and buffers referral attribution automatically
- `finalize_inbound` — after a transfer hook fires, this finalizes the referral record
- `process_redemption` — when a consumer redeems tokens at a merchant, this instruction handles the FIFO consumption (Gen-1 tokens spent first), computes commission, and updates the oracle

**Economic Layer:**
- `claim_commission` — referrers claim their earned commission
- `merchant_init` — sets up a merchant account with configurable commission rates, token expiry, and transfer fees
- `bond_management` — merchants stake SOL as a bond; bad behavior slashes it
- `escrows` — time-locked escrows for commission payouts

**Security & Governance:**
- `disputes` — on-chain dispute resolution between merchants and consumers
- `oracles` — the Viral Oracle computes K-Factor, conversion funnels, and efficiency metrics
- `geo_fencing` — restricts redemption by geographic zone
- `session_management` — session key delegation so POS terminals can sign transactions without holding the merchant's private key
- `referral_cleanup` — garbage collection for expired referral records
- `burn_tokens` — deflationary mechanism

### Why Token-2022?

This is one of the most important architectural decisions. Solana has two token programs: the original SPL Token and the newer Token-2022 (Token Extensions). We use Token-2022 because it has three features we need:

1. **Transfer Hook** — A program that Solana's runtime calls automatically on every transfer. You can't skip it, you can't fake it. If someone transfers a viral-sync token, our attribution code runs. Period. This is enforcement at the protocol level, not the application level.

2. **Transfer Fee** — Built-in fee mechanism. Every transfer skims a configurable percentage for the protocol treasury. No middleware needed.

3. **Token Metadata** — On-chain metadata so the token has a name, symbol, and icon without needing Metaplex.

### The Frontend (Next.js + Capacitor)

The frontend is in `app/`. It's a Next.js 16 app that works both as a web app (deployed on Vercel) and as an Android APK (via Capacitor).

**Key architecture decisions:**
- **Privy for authentication** — Users sign in with Google or Apple. Privy creates an embedded Solana wallet behind the scenes. No seed phrases, no MetaMask. This is crucial for consumer adoption.
- **Gasless transactions** — The relayer (`relayer/src/index.ts`) pays gas fees on behalf of users. Users never touch SOL.
- **Session keys** — POS terminals get delegated signing authority via session keys, so the merchant's main wallet stays cold.
- **Demo mode** — When Privy isn't configured, the app falls back to a demo auth provider with hardcoded data.

**Page Architecture:**
- `page.tsx` — Merchant dashboard (revenue, stats, funnel, activity)
- `oracle/page.tsx` — Viral Oracle (K-Factor, conversion funnel, efficiency metrics vs Google Ads)
- `pos/page.tsx` — POS terminal (NFC scan, redemption flow)
- `consumer/page.tsx` — Consumer wallet (earnings, share, redeem)
- `network/page.tsx` — Referral network visualization (depth bars, leaderboard)
- `disputes/page.tsx` — Dispute resolution
- `settings/page.tsx` — Token configuration

---

## The Bugs That Almost Killed Us

### The Infinite Re-render Loop

This was the nastiest bug. The entire app would freeze and the browser would crash. Here's what happened:

The `useAccountData` hook in `lib/hooks.ts` fetches on-chain data via RPC. It accepts two parameters: `pdaFn` (a function that computes the PDA address) and `decoder` (a function that decodes the raw bytes). Both are passed as inline arrow functions from each page:

```ts
const data = useAccountData(
  () => getMerchantConfigPDA(publicKey), // new function every render!
  decodeMerchantConfig                   // stable reference, fine
);
```

The problem: `pdaFn` is a **new function on every render**. Since it was in the dependency array of `useCallback`, the memoized `fetch` function was re-created on every render. Since `fetch` was in the dependency array of `useEffect`, the effect re-ran on every render. Since the effect sets state, the component re-renders. And since the component re-renders, `pdaFn` is a new function...

**Infinite loop.**

The fix was elegant: use `useRef` to store `pdaFn` and `decoder`, and derive a stable key from the PDA result for the `useEffect` dependency:

```ts
const pdaFnRef = useRef(pdaFn);
pdaFnRef.current = pdaFn; // always latest reference
const pdaKey = pdaFn()?.[0]?.toBase58() ?? 'none'; // stable string

useEffect(() => {
  // use pdaFnRef.current inside
}, [pdaKey, pollInterval]); // stable deps
```

**Lesson:** When you pass inline arrow functions to custom hooks, those hooks need to be designed for it. Either use `useRef` for callbacks, or require callers to memoize. The React docs warn about this, but it's easy to miss.

### The Sidebar That Disappeared

At mobile widths (<768px), the CSS hid the sidebar with `display: none`. Fine on desktop where there's a sidebar. Catastrophic on mobile where it was the ONLY navigation. Users were trapped on whatever page they loaded.

**Lesson:** Always test your responsive breakpoints in isolation. We found this during the mobile audit by actually resizing to 412×915 pixels. It was invisible in desktop development.

### The Capacitor JDK Saga

Building the Android APK required:
1. Android CLI tools (homebrew)
2. JDK 17 (Capacitor's Gradle version needs it)
3. Actually, JDK 21 (Capacitor's latest Android library needs source level 21)
4. Android SDK platform 34, build-tools 34

The JDK 21 installer got stuck on a sudo password prompt for 48 minutes before we killed it. The second attempt worked because brew's package cache was warm.

**Lesson:** Always check the full dependency chain before starting a build. `Java 8 → 17 → 21` was three cascading failures. If we'd checked Capacitor's requirements upfront, it would've been one install.

---

## How Good Engineers Think

### 1. The Token-as-Database Insight

Most referral systems store attribution in a database: "User A referred User B on date X." This creates a central point of failure and requires trust. By making the token ITSELF carry attribution (via generation metadata and transfer hook tracking), we eliminate the database entirely. The blockchain IS the database. This is thinking from first principles, not from conventional architecture.

### 2. FIFO Token Consumption

When a user redeems tokens, we consume Gen-1 tokens first (the ones from direct referrals), then Gen-2, then Gen-3. Why? Because Gen-1 tokens represent the most valuable referral chains — the ones closest to the original sharer. This maximizes the commission payout to the most impactful referrers.

### 3. The Relayer Pattern

Asking consumers to hold SOL is a non-starter. The relayer pattern solves this: an off-chain server (Express.js) receives unsigned transactions, wraps them with a fee-payer signature, and submits them to Solana. The consumer never knows they're on a blockchain. This is the same pattern used by Phantom's gasless transactions.

### 4. Session Keys for Security

POS terminals need to sign transactions, but giving them the merchant's private key is insane. Instead, we create on-chain session keys with limited scope and duration. The terminal can process redemptions but can't drain the treasury. This is defense in depth.

---

## Technologies Used and Why

| Technology | Why |
|---|---|
| **Solana** | Sub-second finality, <$0.01 transactions. Referrals need to be instant. |
| **Anchor** | IDL generation, account constraint macros, built-in error handling. Makes Solana bearable. |
| **Token-2022** | Transfer hooks + transfer fees + metadata in the token program itself. |
| **Next.js 16** | Static export + Turbopack. Fast builds, React Server Components when needed. |
| **Capacitor** | Wraps the static web export into a native Android APK. No React Native rewrite needed. |
| **Privy** | Social login → embedded wallet. The best DX for consumer-facing crypto apps. |
| **Framer Motion** | Silk-smooth animations. The staggered fade-in pattern makes the app feel alive. |
| **Recharts** | Declarative React charting. Works inside Capacitor without issues. |

---

## Project Structure

```
viral-sync/
├── programs/viral_sync/     # Anchor smart contract (Rust)
│   ├── src/instructions/    # 19 instruction handlers
│   └── src/state/           # 9 on-chain account types
├── app/                     # Next.js frontend
│   ├── src/app/             # Pages (dashboard, oracle, pos, consumer, etc.)
│   ├── src/components/      # Shared components (BottomNav, MerchantShell)
│   ├── src/lib/             # Hooks, auth, Solana utils, types
│   └── android/             # Capacitor Android project
├── relayer/                 # Express.js gas relayer
├── clients/                 # POS + consumer client utilities
├── cranks/                  # Mainnet crank scripts
└── tests/                   # Anchor test suite
```

---

## What I'd Do Differently Next Time

1. **Start mobile-first from day one.** We designed for desktop and retrofitted mobile. That's backwards for a consumer app. Always design for the smallest screen first.

2. **Test hooks with inline callbacks early.** The infinite re-render bug was caused by a fundamental misunderstanding of React hook dependencies. Writing a quick test with inline arrow functions would have caught this in 5 minutes.

3. **Install all build dependencies before coding.** The JDK version cascade was entirely avoidable with a 2-minute requirements check.

4. **hardcode demo data from the start.** For bounty submissions, judges need to see data. An empty dashboard with "0" everywhere looks broken, even if the code is perfect.
