use anchor_lang::prelude::*;

#[account]
pub struct MerchantConfig {
    pub bump: u8,
    pub merchant: Pubkey,
    pub mint: Pubkey,
    pub is_active: bool,
    
    pub min_hold_before_share_secs: i64,
    pub min_tokens_per_referral: u64,
    pub max_tokens_per_referral: u64,
    
    pub max_referrals_per_wallet_per_day: u16,
    pub allow_second_gen_transfer: bool,
    pub slots_per_day: u64,
    
    pub token_expiry_days: u16,
    pub commission_rate_bps: u16,  // Base commission applied
    pub transfer_fee_bps: u16,     // Token 2022 Transfer fee configuration
    
    pub first_issuance_done: bool,
    pub current_supply: u64,
    pub tokens_issued: u64,
    
    pub close_initiated_at: i64,
    pub close_window_ends_at: i64,
}

#[account]
pub struct VaultEntry {
    pub bump: u8,
    pub vault: Pubkey,
    pub merchant: Pubkey,
    pub is_active: bool,
    pub is_dex: bool, // Support for registering DEX pools as DEX endpoints
}

#[account]
pub struct GeoFence {
    pub bump: u8,
    pub vault: Pubkey,
    pub merchant: Pubkey,
    pub lat_micro: i32,
    pub lng_micro: i32,
    pub radius_meters: u32,
    pub is_active: bool,

    // Multi-server: ANY registered server can attest
    pub attestation_server_count: u8,
    pub attestation_servers: [Pubkey; 4],

    pub allow_non_geo_redemption: bool,
    pub non_geo_commission_penalty_bps: u16,
}
