use anchor_lang::prelude::*;

pub const INBOUND_BUFFER_SIZE: usize = 16;

#[account]
pub struct TokenGeneration {
    pub bump: u8,
    pub version: u8,
    pub mint: Pubkey,
    pub owner: Pubkey,
    
    // Balances
    pub gen1_balance: u64,
    pub gen2_balance: u64, // Received via referral
    pub dead_balance: u64, // E.g., exiting ecosystem to DEX or from buffer overflow
    pub total_lifetime: u64,
    
    // Escrows/Intermediaries
    pub is_intermediary: bool,
    pub original_sender: Pubkey,
    
    // Inbound Buffer (DoS prevention)
    pub inbound_buffer: [InboundEntry; INBOUND_BUFFER_SIZE],
    pub buffer_head: u8,
    pub buffer_pending: u8,
    
    // Referral attributions active on the wallet
    pub referrer_slots: [ReferrerSlot; 4],
    pub active_referrer_slots: u8,
    
    // Timestamps
    pub first_received_at: i64,
    pub last_received_at: i64,
    
    // Sybil protection
    pub share_limit_day: u64,
    pub shares_today: u16,
    
    // Concurrency / state
    pub processing_nonce: u64,
    pub redemption_pending: bool,
    pub redemption_slot: u64,
    pub redemption_gen2_consumed: u64,
    pub redemption_slot_consumed: [u64; 4],
    pub redemption_slots_settled: u8,
    
    // Flags
    pub is_treasury: bool,
    pub is_dex_pool: bool,
    
    // Proof of Influence
    pub poi_score: u32,
    pub poi_updated_at: i64,
    
    // Identity extensions
    pub identity_commitment: Option<[u8; 32]>,
    pub identity_provider: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Default, Copy)]
pub enum GenSource {
    #[default]
    DeadPass,
    ViralShare,
    Issuance,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct InboundEntry {
    pub referrer: Pubkey,
    pub amount: u64,
    pub generation_source: GenSource,
    pub slot: u64,
    pub processed: bool,
    pub _padding: [u8; 7],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct ReferrerSlot {
    pub referrer: Pubkey,
    pub referral_record: Pubkey,
    pub tokens_attributed: u64,      // Total gen2 tokens from this referrer
    pub tokens_redeemed_so_far: u64, // Running total redeemed from this slot
    pub is_active: bool,
}
