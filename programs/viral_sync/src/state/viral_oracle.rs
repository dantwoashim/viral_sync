use anchor_lang::prelude::*;

#[account]
pub struct ViralOracle {
    pub bump: u8,
    pub merchant: Pubkey,
    pub mint: Pubkey,

    // Primary coefficient
    pub k_factor: u64,

    // Distribution metrics (fixed-point × 10000)
    pub median_referrals_per_user: u32,
    pub p90_referrals_per_user: u32,
    pub p10_referrals_per_user: u32,
    pub referral_concentration_index: u32,

    // Funnel
    pub share_rate: u32,
    pub claim_rate: u32,
    pub first_redeem_rate: u32,

    // Time-to-conversion
    pub avg_time_share_to_claim_secs: u32,
    pub avg_time_claim_to_redeem_secs: u32,
    pub p50_time_share_to_claim_secs: u32,

    // Efficiency
    pub commission_per_new_customer_tokens: u64,
    pub vs_google_ads_efficiency_bps: u32,

    pub computed_at: i64,
    pub data_points: u32,
}
