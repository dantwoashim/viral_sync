# VIRAL-SYNC V4: 8-Week Path to Mainnet Production
## *Extremely Detailed 2-Month Engineering and Launch Roadmap*

This comprehensive 2-month roadmap translates the V4 architecture and MVP checklist into a fully realized, heavily audited, production-ready Solana protocol. This is the blueprint for taking VIRAL-SYNC from a robust architecture to a scalable, live mainnet application handling millions in merchant transaction volume.

---

## 🎯 MONTH 1: Core Protocol Hardening & Infrastructure

The first month focuses solely on on-chain rust development, testnet deployment, building the secondary auxiliary systems (Crank Networks, Indexers), and ensuring bulletproof security.

### Week 1: Core Protocol Development & Data Structures
*Goal: Finalize all Anchor instructions, program derived addresses (PDAs), and the Transfer Hook foundation.*

**Phase 1: Basic Structural Integration (Days 1-3)**
- [ ] Initialize all `TokenGeneration` structs with the V4 16-slot inbound buffer.
- [ ] Implement robust `init_token_generation` client-side instruction.
- [ ] Implement `init_treasury_token_generation` taking `is_treasury = true` flag.
- [ ] Create Merchant V4 configuration PDAs (`MerchantConfig`, `VaultEntry`, `GeoFence`).
- [ ] Map all `ExtraAccountMetaList` accounts ensuring `Seed::AccountData` correctly identifies token account owners.
- [ ] Develop multi-transaction merchant initialization flow (Phase 1, 2, 3 configuration, bonding, and lock).

**Phase 2: The Engine Room - Transfer Hook Execution (Days 4-7)**
- [ ] Create `execute_transfer_hook` and bind it to Token-2022's `transfer_checked`.
- [ ] Write graceful buffer degradation (`write_inbound` handling `DeadPass` fallback).
- [ ] Build exact FIFO (`fifo_deduct`) consumption strategies for token sharing and generic actions.
- [ ] Build exact FIFO extraction (`fifo_deduct_redemption`) for redemption generation attribution.
- [ ] Develop `finalize_inbound` hook utilizing generated `ReferralRecord` data.
- [ ] Write unit tests for local validator covering R1, R2, and R3 architecture compliance.

### Week 2: Advanced Mechanics & Economic Subsystems
*Goal: Build the commission payout flows, escrow mechanics, and token life-cycle processes.*

**Phase 3: Commission & Redemption Mechanics (Days 8-10)**
- [ ] Build `process_redemption_slot` loop handling exactly 4 simultaneous referrer credits.
- [ ] Implement `CommissionLedger`, specifically integrating fractional `dust_tenths` carry-over.
- [ ] Map `claim_commission` instruction adjusting for 2% transfer fee deductions via exact gross-payout execution.
- [ ] Build wrapped `burn_tokens` instruction with enforced reverse-FIFO.
- [ ] Test E1, E2, E5 economic vulnerabilities on Devnet.

**Phase 4: Escrows and Blink Linking (Days 11-14)**
- [ ] Create `create_escrow_share` generating `is_intermediary=true` PDAs.
- [ ] Build `claim_escrow` logic allowing 1-click unpacking.
- [ ] Map `close_expired_referral` for automated rent generation cleanup. 
- [ ] Write `harvest_expired_escrows` crank tasks.
- [ ] End of Week 2 milestone: Full End-to-End simulation on Solana Devnet.

### Week 3: Security, Edge Cases, and Abuse Prevention
*Goal: Fortify the protocol against malicious actors, Sybil attacks, and Merchant manipulation.*

**Phase 5: Concurrency and Oracle Systems (Days 15-18)**
- [ ] Integrate `processing_nonce` logic for `redemption_pending` concurrent locking.
- [ ] Build robust indexer-backed `compute_viral_oracle` accepting signed Helius updates.
- [ ] Develop `compute_merchant_reputation` processing external off-chain ZK/Web2 score generation.
- [ ] Implement `redeem_with_geo` evaluating server multi-sig proximity checks (Haversine distance logic).
- [ ] Implement `withdraw_bond` with enforced 48h timelocks.

**Phase 6: Dispute Engineering & Cleanup Systems (Days 19-21)**
- [ ] Create `raise_dispute` handling SOL stakes.
- [ ] Implement `resolve_dispute` and automatic `resolve_expired_dispute` penalizing negligent merchants (14-day auto-uphold).
- [ ] Build automated merchant death-spiral (`initiate_close_merchant`, `finalize_close_merchant`, and fractional `redeem_bond_share`).
- [ ] Local simulation simulating DEX/AMM interactions resulting strictly in `Dead` balances.

### Week 4: Intensive Internal Audit & Indexer Pipeline
*Goal: Freeze smart contracts, build backend indexing architecture, and execute security fuzzing.*

- [ ] **Contract Code Freeze**: Halt all feature development on Solana programs.
- [ ] **Helius Webhook Implementation**: Set up dedicated indexer infrastructure catching `TransferExecuted`, `CommissionPaid`, and `RedemptionDetected` events.
- [ ] **Database & ML Integration**: Wire up Supabase to ingest Helius webhooks, driving Proof-of-Influence (PoI) and suspicion calculations.
- [ ] **Internal Hackathon**: Dedicated red-team attempting to break the V4 constraints (DoS attacks, dust exhaustion, sybil generation hoarding).
- [ ] Send Codebase to a professional Smart Contract Audit firm (e.g., OtterSec, Neodyme).

---

## 🚀 MONTH 2: Off-Chain Architecture, UI/UX, & Mainnet Launch

Month 2 shifts focus to usability, performance bridging, application UI layers, and marketing pipelines ensuring retail readiness. 

### Week 5: Seamless Client Architecture & Relayer 
*Goal: Eliminate gas fees, seed phrases, and complicated Solana onboarding.*

- [ ] **Privy Integration**: Stand up the embedded wallet connection processing Google/Apple Auth native conversion.
- [ ] **Session Keys Generation**: Build `create_session_key` setting hard spend limit caps (`max_tokens_per_session`). Map `revoke_session_key` functionality.
- [ ] **Relayer Node**: Deploy an Express.js Relay specifically handling signature extraction and bundle building. Pay gas for `init_token_generation` automatically.
- [ ] **Dialect Notifications**: Establish web-push protocols firing on `CommissionEarned` and protocol warning markers.
- [ ] **NFC Signing Tool**: Generate daily rotating payload algorithms injected into point-of-sale physical hardware.

### Week 6: Interfaces — Merchant Dashboard & Consumer PWA
*Goal: Beautiful, responsive dashboards mapping the protocol’s power to end-users.*

- [ ] **Consumer PWA Development**: Build auto-finalizing in-app queues, shareable Blink generators, and PoI level progression badges.
- [ ] **Merchant Dashboard - V1**: Map the Viral Oracle K-Factor metrics, conversion funnels, and distribution statistics.
- [ ] **Merchant Alerts Engine**: Set up real-time warnings bridging `suspicion_score` and `dispute_queue` to the dashboard UI.
- [ ] **Redemption UI**: Develop the POS (Point of Sale) mobile app counterpart handling geo-checks, Vault NFC verification, and session key ingestion.
- [ ] **Blink Action Server Finalization**: Host `/actions` endpoints to unfold social-sharing URLs securely in X (Twitter).

### Week 7: Audit Remediation, Compression, & Mainnet Deployment
*Goal: Clear audit flags, push zero-knowledge and compression pathways, and deploy.*

- [ ] **Audit Review**: Tackle and resolve all vulnerabilities brought up by the external security audit.
- [ ] **ZK Pathway Planning**: Map out Phase 2 ZK compression strategies for `InboundBuffer` Merkle trees (reducing rent to $0.42 per user). Ensure data structures natively allow future Bubblegum-NFT migrations.
- [ ] **Mainnet Beta Deployment**: Deploy Token Extensions and primary Program ID to Solana Mainnet.
- [ ] **Crank Network Registration**: Boot up active listeners utilizing `harvest_expired_escrows` and `close_expired_referral` automatically recovering Solana rent on mainnet.
- [ ] Execute dummy transactions, verifying hook CUs do not exceed ~43k constraints in real mainnet circumstances.

### Week 8: Production Onboarding & Launch
*Goal: System-wide integration testing with pilot merchants.*

- [ ] **Pilot Launch**: Onboard 3-5 real-world pre-selected merchant partners (Coffee shops, local retail).
- [ ] **Bond Generation**: Transfer and lock physical SOL into `merchant_bond` protocols for the active merchants.
- [ ] **Dry-Run Stress Testing**: Distribute Token-2022 generated loyalty tokens specifically via Blink escrows directly to 100+ beta testers.
- [ ] Monitor mainnet indexer response times; ensure Helius webhooks capture >99.99% of hook events seamlessly to Supabase.
- [ ] **PUBLIC RELEASE**: Launch VIRAL-SYNC V4, initialize public PR campaigns, and open-source the Client SDK repositories.

---

### Beyond Week 8 (Phase 3 Roadmap Scope)
- *Referral NFTs*: Transition standard attribution to compressed dynamic NFTs scaling visual utility.
- *Cross-Chain Verification*: Explore Wormhole VAA ingestion granting remote chain verification without exposing the foundational PDAs.
- *Client-Side ZK Location*: Remove completely centralized `Attestation Servers` utilizing mobile TEE (Trusted Execution Environments).
