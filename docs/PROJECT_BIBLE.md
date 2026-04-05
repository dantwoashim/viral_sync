# Viral Sync Project Bible

Analysis date: 2026-03-27
Workspace analyzed: `D:\viral-sync-main`
Document scope: technical architecture, product model, implementation reality, Nepal feasibility, monetization, risks, and recommended next steps.

## 1. Executive Summary

Viral Sync is a Solana-first referral and loyalty product that tries to turn customer sharing into a measurable, commission-paying growth loop. The core idea is ambitious and coherent:

- every merchant has a tokenized rewards program,
- every customer transfer is intercepted by a Token-2022 transfer hook,
- referral lineage is recorded,
- redemption triggers commissions,
- off-chain or on-chain analytics compute a "viral oracle" for merchants.

The idea is strong. The current repo is not production-ready.

Current state in one sentence:

- the project is a serious prototype with a compileable Anchor program, a polished static/demo frontend, and multiple placeholder systems that are not yet operational end-to-end.

Bottom line:

- As a global crypto-native experiment, the concept is technically plausible after substantial hardening.
- As a product launched in Nepal in its current blockchain/token form, it is not commercially or legally viable today.
- As a Nepal product after a major pivot away from transferable public-chain tokens and toward licensed payment-rail integrations, it could become viable.

My overall judgment:

- Technical readiness today: low to medium
- Product clarity: medium to high
- Nepal legal feasibility for current design: very low
- Nepal market need for the underlying problem: real
- Probability of current repo becoming a money-making Nepal business without a major pivot: low
- Probability of a PSP/QR-integrated, non-crypto version making money in Nepal: moderate

## 2. What The Project Is

At product level, Viral Sync wants to be:

- a referral operating system for local merchants,
- a loyalty network with measurable attribution,
- a gasless consumer rewards experience,
- a merchant analytics dashboard,
- an in-store redemption workflow using NFC or QR,
- a fraud-resistant commission engine.

The repo presents six major layers:

1. `programs/viral_sync`
   The on-chain Anchor program.
2. `app`
   The Next.js merchant dashboard and consumer UI.
3. `relayer`
   A gas sponsor service for user transactions.
4. `server/actions`
   A Solana Actions / Blink-style action server.
5. `clients`
   Supporting web and POS-side components.
6. `cranks` and `launch`
   Operational scripts for cleanup, indexing-style workflows, and onboarding.

The core thesis is:

- "word of mouth is valuable but hard to measure,"
- "tokens can carry lineage,"
- "redemption can settle commissions automatically,"
- "merchant growth can be measured as a viral system."

That thesis is internally consistent. The issue is execution maturity and Nepal-specific regulatory fit.

## 3. Repo Reality Check

### 3.1 What is actually implemented

The repo contains real code in all major surfaces:

- an Anchor program with 19 exposed instructions in `programs/viral_sync/src/lib.rs`,
- account models for token generation, merchant config, commission ledgers, disputes, reputation, oracle state, and session keys,
- a transfer hook implementation in `programs/viral_sync/src/instructions/transfer_hook.rs`,
- a functional Next.js app that does compile successfully,
- a relayer server that accepts base64 serialized transactions and rebroadcasts them,
- multiple docs that explain the intended architecture in detail.

### 3.2 What is still placeholder or incomplete

A large share of the product-critical logic is still simulated, omitted, or only described:

- `merchant_init.rs` explicitly says funding is simulated and issuance logic is simulated.
- `finalize_inbound.rs` clears the buffer but does not create real `ReferralRecord` accounts.
- `escrows.rs` omits signer seeds and marks escrow harvesting as simulated.
- `oracles.rs` allows a generic signer to write analytics and reputation data, while production verification is commented out.
- `geo_fencing.rs` does not verify distance or signatures.
- `claim_commission.rs` omits treasury PDA verification and signer seeds.
- `server/actions/src/index.ts` returns a mostly empty transaction and does not add the real instruction.
- `cranks/mainnet_cranks.ts` is mock logic.
- `launch/onboarding/initialize_pilots.ts` is mock logic.
- `tests/viral_sync.ts` is mostly placeholder and uses `expect(true).to.be.true`.

### 3.3 Build and test reality

What I verified locally:

- `cargo check` succeeds for the Anchor program.
- `app` builds successfully with `npm run build`.
- `app` fails lint with 6 errors and 23 warnings.
- `relayer` and `cranks` do not build as shipped because both packages call `tsc` without a `tsconfig.json`.

Important operational gaps:

- there is no top-level `package.json`, but the CI workflow runs `yarn install` at repo root,
- `relayer/tsconfig.json` is missing,
- `cranks/tsconfig.json` is missing,
- the Anchor tests are not meaningful integration tests,
- `Anchor.toml` uses the same placeholder program ID for localnet, devnet, and mainnet.

## 4. Architecture Map

### 4.1 On-chain model

The on-chain design centers around `TokenGeneration`, which stores:

- Gen-1 balance,
- Gen-2 balance,
- dead balance,
- inbound referral buffer,
- active referrer slots,
- redemption state,
- flags for treasury, DEX, intermediary, and POI-style metadata.

This is conceptually the heart of the system.

The main transaction paths are:

1. Merchant creates a mint and merchant config.
2. Merchant issues tokens to users.
3. Transfer hook classifies transfers.
4. Inbound transfer metadata is buffered.
5. A crank finalizes buffered transfers into referral attribution.
6. Redemption consumes balances and allocates commissions.
7. Users claim commissions from treasury inventory.

### 4.2 Off-chain model

The off-chain system is supposed to provide:

- wallet abstraction,
- gas sponsorship,
- indexing and oracle computation,
- merchant and consumer UI,
- POS redemption,
- notifications,
- action-link distribution.

In the repo, those surfaces exist, but several are still shells rather than full systems.

### 4.3 Product flows represented in code

Merchant flow:

- configure merchant,
- issue tokens,
- monitor dashboard,
- inspect disputes,
- operate POS.

Consumer flow:

- sign in,
- receive claim or share link,
- hold rewards,
- share rewards,
- redeem at POS,
- view rewards and activity.

Operational flow:

- relayer sponsors transactions,
- cranks clean up expired records,
- action server generates claim flows,
- oracle jobs write analytics.

## 5. Technical Assessment By Component

### 5.1 Smart contract

Strengths:

- the program is structurally serious, not toy code,
- the transfer-hook architecture is thoughtful,
- FIFO accounting, referrer slot limits, inbound buffering, dispute state, and commission ledgers are all reasonable design choices,
- the code compiles,
- the design is optimized around Solana Token-2022 extensions, which is the correct primitive for this idea.

Weaknesses:

- critical lifecycle accounts are never fully initialized anywhere,
- multiple instructions depend on values that are never set,
- several security checks are intentionally omitted,
- referral finalization is not actually implemented,
- oracles are writable by arbitrary crank signers,
- tests do not validate end-to-end behavior.

One especially important bug class:

- `MerchantConfig` contains fields like `min_tokens_per_referral`, `max_tokens_per_referral`, `max_referrals_per_wallet_per_day`, `allow_second_gen_transfer`, `slots_per_day`, and `token_expiry_days`, but `create_mint_and_config()` only writes a subset of config fields. The transfer hook relies on the omitted values. In practice, zero defaults would likely make peer sharing fail or behave incorrectly.

Another important issue:

- `is_registered_vault()` currently returns `true` for essentially any non-empty account, which makes redemption path classification unsafe.

### 5.2 Frontend app

Strengths:

- the app is visually coherent,
- the information architecture is good,
- merchant pages, consumer pages, settings, POS, oracle, and network views are all laid out,
- the Next.js app compiles cleanly for production.

Weaknesses:

- much of the app is demo-driven,
- auth is local-storage-backed demo auth, not true production auth,
- the consumer ledger hooks pass `merchant = null`, so commission data cannot resolve,
- the network graph is not a real graph; it generates nodes with random radial placement and no edges,
- transaction history labels items as `unknown`,
- several views display future-state claims rather than real product behavior,
- lint errors indicate React effect/state anti-patterns and code quality debt.

Critical architecture mismatch:

- the frontend derives merchant config and other PDAs from seeds like `merchant_config`, `merchant_bond`, `viral_oracle`, and `merchant_reputation`, while the on-chain program actually seeds merchant config with `merchant_v4` plus `mint`. That means the UI cannot reliably read the accounts the program creates.

### 5.3 Relayer

Strengths:

- simple and understandable,
- includes health endpoint,
- includes basic in-memory IP rate limiting,
- simulates transactions before broadcast.

Weaknesses:

- no request authentication,
- no policy engine to restrict what transactions can be sponsored,
- no merchant allowlist,
- fallback to a random ephemeral keypair if `RELAYER_SECRET` is absent,
- no persistent abuse controls,
- no per-user or per-session accounting,
- no monitoring, queueing, or treasury management.

Conclusion:

- it is suitable for local experimentation, not for public launch.

### 5.4 Action server / Blink layer

Status:

- architectural placeholder.

What exists:

- GET metadata endpoint,
- POST endpoint that constructs a skeleton transaction.

What is missing:

- actual Anchor instruction creation,
- real account derivation and validation,
- replay and abuse protection,
- sponsorship coordination,
- deployment wiring.

### 5.5 Cranks and launch scripts

Status:

- mostly documentation-by-code.

They express the intended operating model, but they are not production operations.

## 6. Product Readiness Assessment

### 6.1 Current maturity

I would classify the repo as:

- advanced prototype for architecture,
- early MVP for UI,
- pre-production for smart contract safety,
- pre-alpha for operations,
- not launch-ready for merchant money flows.

### 6.2 What works conceptually

These parts are genuinely promising:

- using Token-2022 transfer hooks for attribution,
- separating Gen-1 / Gen-2 / dead balances,
- ring-buffer style graceful degradation,
- tying merchant reputation and disputes into economics,
- designing for gasless consumer UX,
- merchant-first analytics rather than just consumer token gamification.

### 6.3 What must exist before real launch

Minimum required before any live merchant pilot:

- real PDA initialization for all lifecycle accounts,
- real referral finalization,
- complete redemption settlement,
- signer seed correctness for treasury and escrow flows,
- proper vault validation,
- actual oracle auth and proof model,
- meaningful integration tests on local validator and devnet,
- abuse and sponsorship rules for relayer,
- production auth and wallet model,
- observability and failure handling,
- legal review for every target market.

## 7. Nepal Feasibility: Deep Assessment

## 7.1 Short answer

Will this work in Nepal in its current repo-defined form?

- Not as a public crypto/token product.

Will the underlying business problem exist in Nepal?

- Yes.

Can a heavily pivoted version work in Nepal?

- Yes, but it should not look like the current blockchain-token design.

### 7.2 Why the market problem is real in Nepal

Nepal is increasingly digital in exactly the channels Viral Sync cares about:

- NRB's Payment System Oversight Report 2023/24 says smartphone penetration is 72.94 percent and 4G/LTE covers 741 of 753 local levels.
- The same report says QR codes, wallet payments, contactless cards, and smart POS adoption accelerated after COVID-19.
- DataReportal's Digital 2026 Nepal report says there were 16.6 million internet users and 14.8 million active social media user identities in late 2025.
- The same DataReportal report says Facebook's ad reach in Nepal was 14.8 million in late 2025 and Messenger's was 11.0 million.
- Fonepay says it processed more than 1,002,702 merchant QR payments worth NPR 26.28 billion in a single day on 2025-03-30.
- Fonepay says it has over 1.7 million merchants and 20 million users.
- eSewa says it has millions of customers and hundreds of thousands of merchants, with a very large QR merchant footprint.

What that means:

- urban Nepal is digitally reachable,
- QR payment behavior is already normalized,
- merchants already understand scan-and-pay,
- social channels are strong enough for referral distribution,
- hospitality, food, retail, and tourism are realistic demand pockets.

### 7.3 Where Nepal is attractive

Strongest adoption wedge:

- Kathmandu Valley,
- Pokhara,
- Chitwan,
- major tourist corridors,
- urban cafes,
- restaurants,
- gyms,
- salons,
- hotels,
- tourism-linked merchants.

Why:

- dense social networks,
- frequent repeat visits,
- visible peer-to-peer recommendation behavior,
- easy QR-based checkout,
- higher smartphone and wallet penetration,
- merchant sensitivity to customer acquisition cost.

The World Bank's Nepal Country Economic Memorandum is also useful here:

- digital payment adoption is uneven,
- hotel sector shows the highest digital payment adoption,
- retail has improved,
- manufacturing lags badly,
- firms still underuse digital tools overall.

That suggests the correct Nepal beachhead is not "all SMEs." It is likely:

- hospitality first,
- then wellness,
- then modern urban retail.

### 7.4 Why the current crypto design is a bad Nepal fit

This is the main blocker.

Nepal Rastra Bank's public website, as of March 2026, still prominently carries a notice that virtual currency / cryptocurrency related activity is illegal.

The official FIU-Nepal Strategic Analysis Report 2025 on Virtual Assets says:

- a blanket ban on VA-related activities and VASPs is in place in Nepal,
- regulators should ensure enforcement of the current prohibition,
- public awareness campaigns should inform the public about the legal prohibition,
- any future move to a regulated model would require a separate policy shift.

This matters because Viral Sync is not merely "using blockchain in the back office." The current design directly depends on:

- public-chain tokens,
- token transfers,
- consumer wallets,
- token redemption,
- referral-linked digital assets,
- transfer-hook-enforced on-chain state.

That is exactly the class of design that falls into current Nepal virtual-asset risk.

My inference from the sources:

- if you launched the current product in Nepal and exposed merchants or users to Solana-based transferable token flows, you would be taking serious regulatory risk.

This is an inference, not legal advice, but the risk is high enough that it should be treated as a launch blocker.

### 7.5 Regulatory environment beyond crypto

Nepal is simultaneously pro-digital-payments and anti-private-crypto.

Evidence:

- NRB actively promotes digital payments and licenses PSOs / PSPs.
- NRB's payment reports emphasize QR expansion, smart POS, and broader digital acceptance.
- NRB is exploring a CBDC path.
- FIU-Nepal still recommends enforcing the current prohibition on virtual assets.

So Nepal is not "anti-digital." It is "pro-regulated payment rails, anti-unlicensed crypto rails."

That means the right Nepal product is:

- QR-native,
- PSP-integrated,
- NPR-denominated,
- merchant-dashboard-first,
- referral-analytics-led,
- legally housed inside or alongside licensed payment infrastructure.

### 7.6 Social platform risk

Viral Sync depends on sharing.

Nepal did impose a broad social media shutdown in early September 2025 and lifted it on 2025-09-09 after deadly protests. That episode matters because it shows platform access can become a policy variable, not just a marketing channel.

Implication:

- you should not build Nepal distribution around a single foreign platform,
- WhatsApp, Messenger, SMS, Viber, and QR posters should all be first-class channels,
- "Blink on X" is too narrow for Nepal.

### 7.7 Consumer behavior risk

The repo assumes users will tolerate hidden wallet creation and token balances as long as UX is smooth.

That may work in some markets. In Nepal:

- it is legally risky,
- it creates merchant trust issues,
- it complicates support,
- it makes reconciliation and accounting harder.

A Nepal consumer will more easily understand:

- referral credit,
- cashback,
- points,
- QR reward,
- wallet bonus,
- merchant coupon.

They do not need:

- a public blockchain token,
- on-chain balance classes,
- token burns,
- treasury PDAs.

## 8. Will This Make Money?

## 8.1 Current design

In Nepal, current design:

- probably not.

Reasons:

- legal exposure,
- merchant education burden,
- integration burden,
- no proof yet that tokenized attribution beats simpler QR loyalty,
- strong incumbents already own the payment rails and merchant relationships,
- current repo is not launch-ready.

## 8.2 Underlying business model

The business problem is monetizable. The current implementation path is not.

Merchants in Nepal already pay for:

- payment acceptance,
- QR onboarding,
- promotion,
- campaign offers,
- discounting,
- platform commissions,
- software and POS devices.

What they will pay for:

- more footfall,
- measurable repeat visits,
- referral-driven new customers,
- better in-store conversion,
- cheaper acquisition than paid ads,
- easier merchant operations.

What they will not pay for at scale:

- complex crypto compliance risk,
- extra operational steps at checkout,
- abstract blockchain benefits,
- long implementation cycles for small ticket merchants.

## 8.3 Competition and substitute products

Viral Sync is not entering an empty market.

Relevant incumbents and substitutes:

- Fonepay merchant QR,
- eSewa Business QR,
- wallet cashback campaigns,
- PSP loyalty points,
- merchant-side manual referral and coupon campaigns,
- social media offers,
- delivery app promotions,
- basic CRM and POS loyalty programs.

Notable signals:

- Fonepay's own disclosures reference reward points for merchant QR transactions.
- eSewa has run merchant referral programs and QR merchant acquisition campaigns.
- eSewa and Fonepay already offer merchant acceptance, large user bases, and cross-border visitor payment flows.

Implication:

- a standalone startup trying to convince Nepal merchants to add a second payment/reward layer will have a hard sales motion.
- a partner-integrated or white-label motion is much stronger.

## 8.4 The monetization models that are plausible

Most plausible in Nepal:

1. B2B SaaS plus campaign fee
   Charge merchants monthly for referral campaigns, analytics, and redemption tools.

2. White-label for PSPs / payment operators
   Sell the referral engine to existing licensed operators.

3. Managed growth product for hospitality
   Package software plus campaign ops for cafes, gyms, salons, and boutique hotels.

4. Enterprise tourism and visitor promotions
   Connect with cross-border QR flows for tourists and tie incentives to verified merchant visits.

Least plausible in Nepal:

- token-spread economics,
- protocol fee on public-chain token movement,
- consumer crypto monetization,
- speculative token treasury model.

## 8.5 What price points might work

Without merchant interviews, this is inference, not fact.

My best view:

- small standalone merchants will likely tolerate low monthly pricing only if setup is easy and ROI is obvious,
- a pure commission model may be easier initially than a large fixed SaaS fee,
- white-label / PSP sales likely have higher revenue potential than direct SMB self-serve,
- premium hospitality clusters may support higher pricing if the product includes campaign design, analytics, and repeat-visit automation.

## 9. The Best Nepal Version Of This Product

If the goal is "make this work in Nepal," the best version is not the current repo.

Recommended Nepal product definition:

- off-chain referral attribution system,
- QR-native redemption,
- merchant dashboard,
- PSP / wallet integration,
- no user-facing crypto,
- no transferable public tokens,
- no on-chain merchant treasury,
- optional private ledger for auditability,
- referral links distributed via Messenger, WhatsApp, Viber, SMS, and QR posters,
- campaign analytics framed as marketing ROI, not tokenomics.

What to preserve from the current concept:

- lineage thinking,
- referral depth logic,
- attribution engine,
- commission accounting,
- anti-abuse controls,
- merchant analytics,
- POS-connected redemption,
- gasless / frictionless UX philosophy.

What to remove for Nepal:

- public-chain token balances,
- user wallet dependence,
- crypto-labeled redemption,
- consumer-visible on-chain objects.

## 10. The Best Global Version Of This Product

If the goal is "keep the crypto version," then Nepal should not be the launch market.

Better path:

- target a jurisdiction where crypto loyalty and wallet-linked consumer products are clearly legal,
- harden the protocol there,
- prove merchant ROI,
- later reuse selected referral and analytics ideas in Nepal through a regulated off-chain deployment.

## 11. What I Would Do Next

### Option A: Build the Nepal business

Do this if your priority is revenue in Nepal.

- Freeze the public-token launch idea for Nepal.
- Redesign the product around licensed payment rails.
- Interview 20-30 merchants in Kathmandu and Pokhara.
- Target one vertical first: cafe chains, gyms, salons, or hotels.
- Ship referral analytics and QR redemption before any blockchain layer.
- Pursue PSP / wallet partnerships early.

### Option B: Build the crypto protocol

Do this if your priority is the technical protocol itself.

- Finish real referral settlement and account initialization.
- Add real tests.
- fix PDA derivation consistency,
- lock down relayer auth,
- implement oracle authorization,
- complete escrow and treasury signer flows,
- deploy on devnet with a working end-to-end demo,
- test in a legally safer market.

### Option C: Split the company

This is probably the strongest strategic answer.

- Keep "Viral Sync Protocol" as the crypto R&D branch.
- Build "Viral Sync Nepal" as a regulated off-chain QR referral product.
- Share merchant analytics logic, attribution theory, and UX patterns between both.

## 12. Final Verdict

This project should not be judged as "good" or "bad." It should be judged as two different things:

1. As a codebase and protocol concept
   It is ambitious, thoughtful, and partially real, but clearly unfinished.

2. As a Nepal startup in its current form
   It is badly mismatched to Nepal's current regulatory and market structure.

My direct answer to your questions:

- "Will this even work in Nepal?"
  Not in the current blockchain-token form.

- "Will this even make money?"
  Not likely in Nepal without a major pivot. Yes, possibly, if rebuilt as a PSP-integrated referral and QR growth product.

- "Is the project worth continuing?"
  Yes, if you choose one path clearly. No, if you try to force the current repo into a Nepal public launch unchanged.

## 13. Evidence And Sources

### Local repo evidence

- `README.md`
- `ARCHITECTURE_V4.md`
- `ROADMAP_2_MONTHS.md`
- `programs/viral_sync/src/instructions/*.rs`
- `programs/viral_sync/src/state/*.rs`
- `app/src/app/*`
- `app/src/lib/*`
- `relayer/src/index.ts`
- `server/actions/src/index.ts`
- `cranks/mainnet_cranks.ts`
- `tests/viral_sync.ts`
- `.github/workflows/anchor-test.yml`
- `Anchor.toml`

### External research

1. Nepal Rastra Bank homepage, accessed 2026-03-27:
   [https://www.nrb.org.np/](https://www.nrb.org.np/)

2. FIU-Nepal Strategic Analysis Report 2025 on Virtual Assets, official NRB indexing page and related official references:
   [https://www.nrb.org.np/ofg/virtual-assets-va-%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AC%E0%A4%A8%E0%A5%8D%E0%A4%A7%E0%A5%80-%E0%A4%B0%E0%A4%A3%E0%A4%A8%E0%A5%80%E0%A4%A4%E0%A4%BF%E0%A4%95-%E0%A4%B5%E0%A4%BF%E0%A4%B6%E0%A5%8D/](https://www.nrb.org.np/ofg/virtual-assets-va-%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AC%E0%A4%A8%E0%A5%8D%E0%A4%A7%E0%A5%80-%E0%A4%B0%E0%A4%A3%E0%A4%A8%E0%A5%80%E0%A4%A4%E0%A4%BF%E0%A4%95-%E0%A4%B5%E0%A4%BF%E0%A4%B6%E0%A5%8D/)

3. Nepal Rastra Bank, Payment System Oversight Report 2023/24:
   [https://www.nrb.org.np/contents/uploads/2025/01/Payment-Oversight-Report-2023-24.pdf](https://www.nrb.org.np/contents/uploads/2025/01/Payment-Oversight-Report-2023-24.pdf)

4. DataReportal, Digital 2026: Nepal:
   [https://datareportal.com/reports/digital-2026-nepal](https://datareportal.com/reports/digital-2026-nepal)

5. DataReportal, Digital 2025: Nepal:
   [https://datareportal.com/reports/digital-2025-nepal](https://datareportal.com/reports/digital-2025-nepal)

6. World Bank, Nepal Country Economic Memorandum:
   [https://documents1.worldbank.org/curated/en/099032125103030263/pdf/P179761-430153ad-672c-4418-89c5-ef3740c65113.pdf](https://documents1.worldbank.org/curated/en/099032125103030263/pdf/P179761-430153ad-672c-4418-89c5-ef3740c65113.pdf)

7. Fonepay blog, 1 million+ QR transactions in a single day:
   [https://fonepay.com/public/index.php/blogs/Fonepay-QR-1-Million-transactions](https://fonepay.com/public/index.php/blogs/Fonepay-QR-1-Million-transactions)

8. Fonepay audited financial statement referencing reward points / loyalty program:
   [https://fonepay.com/public/files/reports/1765433207_Audited%20Financial%20Statement%20-%20FY%202081-82-updated_compressed.pdf](https://fonepay.com/public/files/reports/1765433207_Audited%20Financial%20Statement%20-%20FY%202081-82-updated_compressed.pdf)

9. eSewa about page:
   [https://blog.esewa.com.np/about](https://blog.esewa.com.np/about)

10. eSewa about page with network size details:
   [https://blog.esewa.com.np/about-esewa/](https://blog.esewa.com.np/about-esewa/)

11. eSewa cross-border Business QR launch:
   [https://blog.esewa.com.np/index.php/esewa-transforms-cross-border-payments-nepal-alipay](https://blog.esewa.com.np/index.php/esewa-transforms-cross-border-payments-nepal-alipay)

12. eSewa merchant referral campaign:
   [https://blog.esewa.com.np/refer-a-business-and-earn-bonus](https://blog.esewa.com.np/refer-a-business-and-earn-bonus)

13. Al Jazeera / Reuters report on Nepal lifting the September 2025 social media shutdown:
   [https://www.aljazeera.com/news/2025/9/9/nepal-lifts-social-media-ban-after-19-killed-in-protests-report](https://www.aljazeera.com/news/2025/9/9/nepal-lifts-social-media-ban-after-19-killed-in-protests-report)

14. Solana token extensions reference showing TransferHook as a mint extension:
   [https://solana.com/fr/docs/tokens/extensions](https://solana.com/fr/docs/tokens/extensions)

