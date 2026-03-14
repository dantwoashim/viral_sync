use anchor_lang::prelude::*;

#[account]
pub struct MerchantReputation {
    pub bump: u8,
    pub merchant: Pubkey,
    
    // Scoring & History
    pub reputation_score: u32,       // Canonical 0..100 score
    pub timeout_disputes: u32,       // Bad behavior tracking
    
    // Hard-to-game signals (via Helius indexer pipeline)
    pub pct_redeemers_aged_over_30_days: u16,  
    pub unique_attestation_servers_used: u8,   
    pub commission_concentration_bps: u16, 
    pub pct_redemptions_in_business_hours: u16,
    pub avg_poi_score_top_referrers: u32,
    
    pub suspicion_score: u32,         // Flag mark for auto-disputes/warnings
    pub suspicion_computed_at: i64,   // Last Oracle pipeline update
}

impl MerchantReputation {
    pub const LEN: usize = 1 + 32 + 4 + 4 + 2 + 1 + 2 + 2 + 4 + 4 + 8;
}
