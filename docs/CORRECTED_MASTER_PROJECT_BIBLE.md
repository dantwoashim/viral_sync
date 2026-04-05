# Corrected Master Project Bible

Last updated: 2026-03-27  
Workspace: `D:\viral-sync-main`  
Status: canonical working document

## Purpose

This document replaces the conflicting conclusions spread across:

- `docs/Analysis1.md`
- `docs/Analysis2.md`
- `C:\Users\prabi\Downloads\Bootstrapping a Viral Nepali Project.docx`
- `C:\Users\prabi\Downloads\ghst writing\Viral_Sync_Project_Bible_and_Nepal_Feasibility_Report.docx`

It keeps the strongest repo-grounded analysis, removes weak or unsafe assumptions, and updates the project status to match what was directly verified in this workspace on March 27, 2026.

## Canonical Answers

### What is Viral Sync?

Viral Sync is a merchant referral and loyalty system built around an ambitious technical idea: use Solana Token-2022 transfer hooks to make customer-to-customer sharing attributable, measurable, and commissionable.

### Is the current repo real?

Yes. This is not vaporware. The on-chain design is serious, the frontend is substantial, and the repo contains real product thinking and real architecture work.

### Is the current repo production-ready?

No.

The current codebase is a serious prototype, not a launch-ready system. The end-to-end referral loop is incomplete, several trust and authority checks are weak or mocked, and the tests do not prove real protocol safety.

### Can the current crypto-token design launch in Nepal?

No.

The current public-token, wallet-driven architecture is a poor legal fit for Nepal's present regulatory perimeter. A Nepal launch would require a redesign that removes the transferable public token from the customer-facing and settlement layers.

### Can the underlying business work in Nepal after redesign?

Yes, potentially.

The strongest Nepal version is not a public-token protocol. It is a QR-first, PSP-integrated, non-crypto referral and loyalty product for merchants.

### Can this become a business?

Yes, but not by pretending the current repository is already that business.

The monetizable version is a merchant growth product that sells measurable outcomes: more repeat visits, more attributable referrals, lower acquisition cost, and easier merchant operations.

## Evidence Base

This corrected document is based on four inputs:

1. Direct repo review.
2. Build and execution checks run in this workspace on 2026-03-27.
3. Deep review of the four prior analyses.
4. Current-source validation for Nepal regulation, payments, and digital readiness.

### Repo checks performed in this workspace

- `cargo check` succeeded in `programs/viral_sync`
- `npm run build` succeeded in `app`
- `npm run build` failed in `relayer` because `tsconfig.json` is missing
- `npm run build` failed in `cranks` because `tsconfig.json` is missing

Those checks matter because one of the earlier long-form reports described an environment that could not compile the repo at all. That limitation was true for that analyst environment, but it is not a repo-level fact in this workspace.

Only claims explicitly reproduced in this workspace are carried forward as canonical here. Earlier documents may contain useful reasoning, but specific build counts, lint counts, runtime claims, or operational assertions are not treated as verified unless they were directly checked again.

## Hard Repo Corrections Incorporated

These corrections are now treated as canonical:

### 1. Public instruction count

The program does not expose 19 public instructions. `programs/viral_sync/src/lib.rs` exposes 26 public `pub fn` instruction entrypoints.

### 2. README contradiction

The README says: `No app, no database, no middleman.`

That does not match the shipped repository. The repo includes:

- a Next.js app in `app`
- a relayer in `relayer`
- an action server in `server/actions`
- cranks in `cranks`
- onboarding scripts in `launch`
- multiple off-chain assumptions around oracles, disputes, and reputation

### 3. Off-chain dependency reality

Even though the product is narrated as protocol-first, the shipped repo already depends on a meaningful off-chain stack. That does not invalidate the project, but it does mean the project cannot be described as purely protocol-native in the way the README currently implies.

## What the Project Is Actually Building

At its core, Viral Sync is trying to solve one merchant problem:

- word of mouth creates real value
- that value is usually invisible
- merchants want a system that can measure, reward, and optimize it

The repo expresses that idea through six layers:

- an Anchor program in `programs/viral_sync`
- a merchant and consumer app in `app`
- a gas-sponsoring relayer in `relayer`
- a Solana Action or Blink-style server in `server/actions`
- helper and client modules in `clients`
- crank and launch scripts in `cranks` and `launch`

The intended flow is:

1. Merchant creates or configures a token and protocol rules.
2. Each participant gets a `TokenGeneration` account.
3. Token transfers trigger a transfer hook.
4. Transfer metadata is buffered.
5. A finalization step should convert buffered provenance into durable referral state.
6. Redemption should allocate commission.
7. Commission should become claimable.
8. Merchant dashboards should expose growth and fraud analytics.

That architecture is coherent. The problem is not the conceptual model. The problem is incomplete implementation and poor Nepal fit for the public-token layer.

## What Is Strong in the Repo

### 1. The transfer-hook concept is real

The most valuable code in the repo is the transfer-hook path in `programs/viral_sync/src/instructions/transfer_hook.rs`.

This is not fake complexity. Token-2022 transfer hooks are a real Solana primitive, and Viral Sync is using the right primitive for its on-chain thesis.

### 2. The product thesis is commercially intelligent

Merchants do want:

- attributable customer sharing
- repeat-visit growth
- measurable referral loops
- something better than generic discounting
- alternatives to expensive aggregator dependence

That is a real problem, not an invented one.

### 3. The frontend is more than a mockup

The app is not just a landing page. It has real surface area:

- consumer views
- merchant views
- settings
- POS and scan surfaces
- disputes
- oracle and network views

The app also builds successfully in this workspace, which matters.

## What Is Not Finished

The current repository does not complete its own promised loop.

### Critical implementation blockers

#### Referral settlement is incomplete

`programs/viral_sync/src/instructions/finalize_inbound.rs` explicitly clears buffered entries instead of turning them into durable `ReferralRecord` state.

That means the system's core promise is not fully implemented:

- transfers can be observed
- provenance can be buffered
- but durable referral attribution is not actually completed

#### Frontend and on-chain PDA derivation are inconsistent

On-chain merchant config seeds:

- `programs/viral_sync/src/instructions/merchant_init.rs`
- seeds: `["merchant_v4", mint]`

Frontend merchant config seeds:

- `app/src/lib/solana.ts`
- seeds: `["merchant_config", merchant]`

This mismatch is a real functional bug, not a stylistic difference.

#### Merchant config initialization is incomplete

`MerchantConfig` includes operational fields such as:

- `min_tokens_per_referral`
- `max_tokens_per_referral`
- `max_referrals_per_wallet_per_day`
- `allow_second_gen_transfer`
- `slots_per_day`
- `token_expiry_days`

But `create_mint_and_config()` does not initialize all of them. Downstream logic depends on values that are effectively defaulted.

#### Critical account lifecycle wiring is missing or incomplete

The state layer defines important accounts including:

- `ReferralRecord`
- `CommissionLedger`
- `MerchantBond`
- `MerchantReputation`
- `ViralOracle`
- `VaultEntry`
- `GeoFence`

Some of these types appear as required accounts in downstream instructions, but the repo-wide lifecycle wiring for creating, populating, and maintaining them is incomplete or not visible as a full operational path. The safest wording is not "none of these are initialized anywhere," but rather that many required initialization and lifecycle flows are missing, partial, or not connected into a complete working system.

#### Vault detection remains overly permissive

`is_registered_vault()` in `programs/viral_sync/src/instructions/transfer_hook.rs` returns true for essentially any non-empty account after a minimal check.

That is too weak for production-grade classification of redemption paths.

#### Auth is still demo-grade

`app/src/lib/auth.tsx` says it uses demo auth always and creates deterministic wallet addresses from local input.

There is also mock Privy logic in `clients/web/src/privy_auth.ts`.

That is acceptable for prototype UX. It is not acceptable for a real product.

#### Consumer-facing app paths are still demo-grade

`useCommissionLedger()` requires both `referrer` and `merchant`, but consumer pages call it with `merchant = null`.

That means the consumer earnings surfaces cannot correctly derive the commission ledger account in the current implementation.

The same surface area shows other prototype shortcuts:

- recent transactions are labeled as `unknown`
- the network graph uses random positions rather than real graph structure
- several consumer-facing displays are better understood as UI shells than as validated product flows

#### The action server is skeletal

`server/actions/src/index.ts` builds a transaction shell, but it does not add the real Anchor instruction. In the inspected repo snapshot, `server/actions` also lacks its own package manifest, which reinforces that this surface is still incomplete as a standalone service.

#### The relayer is not safe for public deployment

The relayer is a useful prototype service, but not a public-production relay as currently written. The current implementation:

- has no request authentication
- has no sponsorship policy engine
- has no allowlist
- falls back to a random keypair if `RELAYER_SECRET` is missing
- relies on simple in-memory IP throttling

#### Off-chain build paths are incomplete

`relayer` and `cranks` both fail build in their current shipped state because they call `tsc` without a project config.

#### CI and packaging are inconsistent

The repo root has no `package.json` or `yarn.lock`, yet the CI workflow runs `yarn install` at repo root.

This does not mean the project is unsalvageable. It does mean the packaging and automation story is currently inconsistent with the repository layout.

#### Tests are not meaningful

The Anchor tests are mostly placeholder assertions. The repo does not currently prove:

- end-to-end transfer-hook execution
- real referral settlement
- secure commission claiming
- dispute resolution correctness
- edge-case behavior under load

## Correct Reading of the Current Technical State

The correct summary of the repo on March 27, 2026 is:

- the Anchor program compiles
- the Next app builds
- the repo contains real architecture and differentiated technical ideas
- the end-to-end business logic is still incomplete
- the off-chain operational components are not production-ready
- the product shell is ahead of the protocol's completion level

So the project should be treated as:

- more advanced than a concept
- less mature than a pilot-ready system

The right phrase is: advanced prototype.

## Nepal Reality: What Is True and What Is Not

### What is true

Nepal is digitally ready for a merchant referral and loyalty product if the product is built on the right rails.

The core enabling conditions exist:

- widespread smartphone usage
- strong QR familiarity
- broad digital wallet behavior
- meaningful urban merchant concentration
- real merchant pain around repeat customer growth and aggregator dependence

### What is not true

Nepal is not the right environment for the current public-token version of Viral Sync.

The earlier documents were directionally right on this point even when they overstated other things. The issue is not whether Nepal is "digital enough." It is whether the specific crypto-token design is a good regulatory fit. It is not.

### Canonical Nepal conclusion

For Nepal, the product must be redesigned as:

- non-crypto
- closed-loop rewards or points
- merchant-account-centered
- QR-native
- integrated with licensed local payment rails or merchant systems

Not:

- public-token consumer transfers
- wallet-first onboarding
- Telegram Stars to TON liquidation
- screenshot-based settlement verification
- registration-later bootstrapping

## Why the Bootstrapping Thesis Is Rejected

The Telegram Mini App / Stars / TON / OCR / SMS-scraping bootstrapping thesis is not adopted in this master document for four reasons:

1. It is too far from the actual Viral Sync repo.
2. It relies too heavily on weak or non-primary sources.
3. It treats high-risk payment and compliance workarounds as if they were safe operating practice.
4. It shifts the product into a broader P2P marketplace rather than a merchant referral infrastructure product.

That is a different company, not a corrected Viral Sync strategy.

## The Correct Nepal Product Pivot

If the goal is Nepal, the recommended product is:

### A merchant referral and loyalty operating system on licensed rails

Core design:

- merchant dashboard
- consumer-friendly referral links and QR entry points
- closed-loop non-transferable rewards
- redemption and attribution recorded in a central database
- PSP or POS events used for payment-linked confirmation
- fraud scoring and merchant analytics layered on top

### Recommended initial wedge

Start with:

- cafes
- restaurants
- salons
- gyms
- small hospitality venues

Why:

- frequent repeat visits
- local density
- strong word-of-mouth behavior
- easy staff training
- good fit for reward-both referral mechanics

### Recommended user journey

1. Customer visits partner merchant.
2. Customer gets a referral link or QR-linked reward.
3. Customer shares it to friends.
4. Friend visits and redeems via QR or voucher flow.
5. Merchant receives attribution.
6. Original customer receives non-cash or controlled-value reward.
7. Merchant sees performance in a dashboard.

### Recommended settlement model

Do not settle value through a public-chain token in Nepal.

Use one of:

- closed-loop merchant points
- merchant-funded coupons or vouchers
- merchant-funded cashback-like ledger credits inside licensed payment or merchant flows
- platform-side analytics plus merchant-side incentive issuance

## Business Model: What Actually Makes Money

The current repo does not yet prove a mature monetization model. The earlier better analyses were right about this:

- merchants do not buy protocol elegance
- merchants buy measurable growth and operational simplicity

### Best monetization path for Nepal

The highest-probability business is B2B SaaS, optionally with light enterprise services.

Practical revenue model:

- monthly merchant subscription
- setup or onboarding fee for integration-heavy merchants
- enterprise custom pricing for chains
- optional campaign or analytics upsells

### Directional pricing logic

These are directional strategy numbers, not quotes:

- Starter: small merchants, simple dashboard, single-location support
- Growth: multi-location, campaign logic, stronger analytics
- Enterprise: white-labeling, deeper integration, custom reporting

Do not anchor the business on:

- token appreciation
- on-chain fee extraction
- complex crypto commission mechanics

Those are not the cleanest route to revenue in Nepal.

## Two Legitimate Strategic Paths

The project needs a hard decision.

### Path A: Global crypto-native pilot

Choose this only if the team genuinely wants the tokenized attribution system itself to be the product.

What this path requires:

- complete referral settlement
- harden authority checks
- replace demo auth
- real integration tests
- safe relayer controls
- real oracle trust model
- a pilot market that actually tolerates crypto-native user flow

This path preserves the most novel part of the repo, but it is not the Nepal path.

### Path B: Nepal-compliant merchant SaaS

Choose this if the goal is to build a real business in Nepal.

What this path requires:

- remove the public token from the customer-facing flow
- keep the attribution logic conceptually, but reimplement the operational core on centralized infrastructure
- integrate with licensed payment rails or merchant systems
- focus the product around merchant ROI
- simplify onboarding to phone numbers, QR flows, and lightweight merchant operations

This is the recommended path if Nepal is the target market.

## Canonical Recommendation

If the objective is to build a company in Nepal, the correct strategy is:

### Pivot hard to merchant SaaS and preserve only the transferable ideas, not the transferable token

What to keep:

- attribution logic
- merchant analytics mindset
- reward-both referral design
- anti-fraud posture
- merchant dashboard thinking
- QR and in-store redemption emphasis

What to remove from the Nepal version:

- public-token transfer flow
- consumer crypto wallet dependence
- gasless relayer as a core product promise
- Solana-first positioning
- any dependence on Telegram Stars, TON, offshore liquidation, or payment-proof hacks

## 90-Day Execution Roadmap for the Nepal Path

### Phase 1: Decide and de-scope

Duration: 1 to 2 weeks

- make a formal product decision: Nepal SaaS, not public-token Nepal launch
- freeze the crypto-native Nepal narrative in docs
- write the Web2 or hybrid product spec
- define one merchant vertical and one city cluster for the initial pilot

### Phase 2: Rebuild the operational core

Duration: 3 to 6 weeks

- design the centralized referral ledger
- redesign merchant config around non-crypto rewards
- replace consumer wallet identity with phone or account identity
- build referral, redemption, and claim flows that do not require public-chain transfer
- keep analytics, fraud, and campaign tracking as core differentiators

### Phase 3: Merchant pilot stack

Duration: 3 to 6 weeks

- merchant onboarding
- reward issuance rules
- QR-linked voucher or redemption flows
- dashboard with attribution, repeat visits, and campaign reporting
- basic staff training and audit logs

### Phase 4: First controlled pilot

Duration: 2 to 4 weeks

- 5 to 15 merchants
- one dense urban zone
- narrow incentive design
- direct observation of redemption behavior
- CAC, repeat rate, redemption rate, and referral conversion tracked manually and digitally

## If the Team Refuses to Pivot

If the team insists on preserving the crypto-native design, the correct position is:

- do not describe it as Nepal-ready
- do not describe it as legally de-risked for Nepal
- do not treat current UI polish as proof of business readiness

Instead:

- finish the protocol
- harden it
- run pilots in markets and segments that actually accept crypto-native flows

## Final Bottom Line

Viral Sync has a real differentiator: transfer-hook-based attribution thinking.

But the correct master conclusion is not:

- "ship the current repo in Nepal"

The correct master conclusion is:

- the current repository is an advanced prototype
- the crypto-native design is technically interesting but incomplete
- the current public-token version is not the right Nepal launch product
- the strongest business path is a Nepal-compliant merchant referral and loyalty SaaS built on licensed rails and non-crypto rewards

## Source Notes

The conclusions in this corrected master document were grounded in:

- direct repo review and build checks in this workspace on 2026-03-27
- official or primary source validation where current facts mattered

Key references:

- NRB Payment System Oversight Report 2023/24: <https://www.nrb.org.np/contents/uploads/2025/01/Payment-Oversight-Report-2023-24.pdf>
- FIU-Nepal virtual assets page: <https://www.nrb.org.np/fiu/virtual-assets-strategic-analysis-report-of-fiu-nepal-2025/>
- Electronic Commerce Act, 2081 (2025): <https://giwmscdnone.gov.np/media/files/E-Commerce%20Act%2C%202081_yr7k9o5.pdf>
- Nepal IRD digital service tax procedure: <https://www.ird.gov.np/public/pdf/1935769683.pdf>
- Department of Industry foreign investment page: <https://doind.gov.np/foreign-investment>
- DataReportal Nepal 2026: <https://datareportal.com/reports/digital-2026-nepal>
- Fonepay official about page: <https://fonepay.com/public/about>
- eSewa official about page: <https://blog.esewa.com.np/about>

## Relationship to Prior Documents

Use this file as the canonical summary.

Relationship to older analyses:

- `docs/Analysis2.md`: mostly consistent, but shorter and less complete
- `C:\Users\prabi\Downloads\ghst writing\Viral_Sync_Project_Bible_and_Nepal_Feasibility_Report.docx`: strongest prior long-form source, but update its environment assumptions
- `docs/Analysis1.md`: useful as strategy brainstorming, not as canonical feasibility language
- `C:\Users\prabi\Downloads\Bootstrapping a Viral Nepali Project.docx`: rejected as the operating strategy for Viral Sync
