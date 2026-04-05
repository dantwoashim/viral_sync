# VIRAL-SYNC V4: The Definitive Architecture Guide
## *The Last Iteration. Every Edge Case Closed. Actually Buildable.*

---

## 1. Executive Summary

VIRAL-SYNC V4 is a decentralized, verifiable loyalty and referral protocol built natively on the Solana blockchain. By leveraging Token-2022's **Transfer Hook** extension, VIRAL-SYNC intercepts token transfers to automatically track the genealogy of tokens across users (Gen-1, Gen-2, Dead) and attribute on-chain referral commissions seamlessly.

V4 addresses all critical operational, economic, and security vulnerabilities identified in previous iterations, standardizing interactions into a three-phase initialization process, two-phase client execution protocol, and robust concurrency safeguards.

---

## 2. Core Architectural Principles

1. **State Exists Before Hooks Execute**: The client protocol bears the responsibility of ensuring all necessary Program Derived Addresses (PDAs) like `TokenGeneration` are fully initialized *before* the transfer hook fires.
2. **Immutable Identity**: Seed derivations prioritize token account data (specifically bytes 32-63 representing the true token owner) over transaction signatures authority, which may be delegated.
3. **Graceful Degradation for Extraneous Metadata**: Metadata tracking (referral links) must never block the underlying token transfer. Full inbound buffers result in referral forfeiture but allow the transaction to proceed (DeadPass).

---

## 3. Account Structures and Program Derived Addresses (PDAs)

V4 optimizes state storage to balance comprehensive referral tracking against rent-exemption costs (~$1.80 per wallet).

### 3.1. TokenGeneration PDA
The master ledger for a specific user's relationship with a specific merchant protocol.
```rust
pub struct TokenGeneration {
    pub discriminator: u64,
    pub bump: u8,
    pub version: u8,
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub gen1_balance: u64, // Direct from merchant
    pub gen2_balance: u64, // Received via referral
    pub dead_balance: u64, // Exiting the tracking ecosystem (e.g. DEX or buffer full)
    pub total_lifetime: u64, 
    pub is_intermediary: bool, // E.g., Escrow Blink accounts
    pub original_sender: Pubkey,
    
    // Inbound Buffer (16 slots) prevents DoS micro-transfer attacks
    pub inbound_buffer: [InboundEntry; 16],
    pub buffer_head: u8,
    pub buffer_pending: u8,
    
    pub referrer_slots: [ReferrerSlot; 4],
    pub active_referrer_slots: u8,
    
    // Limits & Antisybil
    pub share_limit_day: u64,
    pub shares_today: u16,
    pub processing_nonce: u64,
    
    // Concurrency flags
    pub redemption_pending: bool,
    pub redemption_slot: u64,
    pub redemption_gen2_consumed: u64,
    pub redemption_slot_consumed: [u64; 4],
    pub redemption_slots_settled: u8,
    
    pub is_treasury: bool,
    pub is_dex_pool: bool,
}
```

### 3.2. MerchantConfig & VaultRegistry
Merchants provision a highly configurable `MerchantConfig` PDA that defines tokenomics constraints: `min_hold_before_share_secs`, `commission_rate_bps`, and tracking scopes. `VaultRegistry` maps authorized redemption endpoints (physical retail counters).

### 3.3. ReferralRecord & CommissionLedger
`ReferralRecord` records the active link between sender and receiver, carrying an expiration. The `CommissionLedger` holds exact and fractional (dust) rewards accumulated by a referrer to prevent precision loss.

---

## 4. Transfer Hook Flow & Operations

The Token-2022 Transfer Hook evaluates the context of *every* transfer. 

### 4.1. Account Resolution (`ExtraAccountMetaList`)
To pass additional accounts to the hook smoothly, the protocol resolves the `VaultEntry` (destination validity), and both source and destination `TokenGeneration` PDAs. If `VaultEntry` doesn't exist, the hook leverages Anchor's `UncheckedAccount` and manually verifies the discriminator, failing gracefully.

### 4.2. Action Classification
1. **Issuance (Merchant → User)**: Intercepted and booked entirely as `Gen-1` tokens in the recipient's PDA. Validates timestamps.
2. **Peer Transfer (User → User)**: FIFO (First In, First Out) deduction from the source. Prioritizes consuming `Gen-1` to maximize the sender's referral attribution.
3. **DEX/AMM Transfer**: Bypasses referral generation. Exiting tokens become `Dead` balance.
4. **Redemption (User → Vault)**: Locks the user's record (`redemption_pending = true`) simultaneously checking active `referrer_slots`. Pro-rata calculation occurs based on `gen2_consumed`.

### 4.3. The DoS Mitigation: 16-Slot Inbound Buffer
If `buffer_pending >= 16`, incoming tokens are pushed to `dead_balance` rather than failing the transaction. The hook emits an `InboundBufferOverflow` event, penalizing the *referrer's attribution*, not the recipient's token arrival.

---

## 5. Security & Exploitation Resistance

### 5.1. Concurrency Management
Using `redemption_pending` combined with Solana's native slot execution order inherently serializes double-spend attempts across simultaneous redemptions.

### 5.2. Geofencing via Attestation Enclaves
Merchants register multi-server attestation pubkeys. Redemption requires a signed payload confirming the user's geographic proximity to the retail location. Fallbacks exist (`allow_non_geo_redemption`) that deduct a `non_geo_commission_penalty_bps`.

### 5.3. Abuse-Resistant Merchant Reputation (`ViralOracle`)
To prevent merchants from wash-trading referrals to boost their stats, the `MerchantReputation` engine ingests Helius indexing data. It tracks off-chain computed analytics such as wallet age distributions, IP clusters for attestation, and cross-merchant Proof-of-Influence (PoI) scores to generate a computational `suspicion_score`.

### 5.4. Dispute Auto-Resolution
Watchdog participants can stake SOL to flag suspicious merchant configurations. If a merchant neglects a dispute over 14 days, V4 automatically rules in the claimant's favor, freezing the contested commission ledger and heavily damaging the merchant's reputation score.

---

## 6. Detailed Compute Unit (CU) Breakdown
V4 must operate within Token-2022's rigid hook compute limits:
- **Account Deserializations**: ~11,000 CU (`merchant_config`, `source_generation`, `dest_generation`).
- **Logic & FIFO Checks**: ~3,000 CU.
- **Inbound Record Write**: ~2,000 CU.
- **Vault Verification**: ~3,000 CU.
- **Buffer Overhead**: ~5,000 CU.
- **Events (emit!)**: ~3,000 CU.
**Total Estimation**: ~28,000 CU
*Client target overhead req: 60,000 CU.*

---

## 7. Operational Lifecycles
### 7.1. Merchant Initialization (3-Phase)
1. `create_mint_and_config`: Instantiates mint, configuration, and structural PDAs.
2. `fund_merchant_program`: Deposits SOL bonds and operational treasury balances.
3. `issue_first_tokens_and_lock`: Locks immutable tokenomics parameters safely ensuring the initial state is verifiable before proceeding.

### 7.2. Merchant Sunset & Bonds
V4 includes a `initiate_close_merchant` instruction initiating a 30-day sunset window. Users redeem outstanding fractions of the merchant's SOL bond relative to the circulating token supply via `redeem_bond_share`.

---

## 8. Frontend & Protocol Tooling Integration
- **Privy Embedded Wallets**: Facilitates Web2 Auth conversions to Solana Keypairs invisibly.
- **Blink Action Servers**: Auto-bundles PDA initialization and token claims to handle "Action 1: Init, Action 2: Transfer" via a single user click.
- **Relay Gas Sponsors**: Masks all transaction execution costs to both referring and referred users.

---
V4 solves the architectural impossibilities of V3 natively within the boundaries of the Solana Virtual Machine. It is highly optimized, fault-tolerant, and economically aligned.
