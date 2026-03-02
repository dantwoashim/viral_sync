use anchor_lang::prelude::*;

#[account]
pub struct ReferralRecord {
    pub bump: u8,
    pub merchant: Pubkey,
    pub mint: Pubkey,
    
    pub referrer: Pubkey,
    pub referred: Pubkey,
    pub created_at: i64,
    pub expires_at: i64,
    
    pub committed_commission_bps: u16,
    pub max_commission_cap: u64,
    
    pub commission_earned: u64,
    pub commission_settled: u64,
    pub is_active: bool,
}

impl ReferralRecord {
    pub fn is_expired(&self, now: i64) -> bool {
        self.expires_at > 0 && now > self.expires_at
    }
}
